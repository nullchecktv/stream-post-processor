import { MediaConvertClient, CreateJobCommand } from '@aws-sdk/client-mediaconvert';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
const mediaConvert = new MediaConvertClient({ endpointDiscoveryEnabled: true });
const CHUNK_SECONDS = Number.parseInt(process.env.CHUNK_SECONDS, 10) || 120;

export const handler = async (event) => {
  try {
    const detail = event?.detail || {};
    const episodeId = (detail.episodeId || '').toString().trim();
    const trackName = (detail.trackName || '').toString().trim();
    const s3Key = (detail.key || '').toString().trim();

    if (!episodeId || !trackName || !s3Key) {
      console.warn('Missing required event detail. Expecting { episodeId, trackName, key }.', JSON.stringify(detail));
      return { statusCode: 200 };
    }
    const videoId = `${episodeId}-${trackName}`;

    console.log(`Processing video ${s3Key} as ${videoId}`);

    // Idempotency guard: acquire a preprocessing lock if no job exists yet
    const now = new Date().toISOString();
    const outputPrefix = `${episodeId}/videos/${trackName}/chunks/`;
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: episodeId, sk: `track#${trackName}` }),
        ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk) AND attribute_not_exists(#jobId) AND attribute_not_exists(#lock)',
        UpdateExpression: [
          'SET #status = :processing',
          '#chunkDuration = :chunkDuration',
          '#outputPrefix = :outputPrefix',
          '#uploadKey = :uploadKey',
          '#lock = :lock',
          '#updatedAt = :updatedAt'
        ].join(', '),
        ExpressionAttributeNames: {
          '#status': 'status',
          '#chunkDuration': 'chunkDuration',
          '#outputPrefix': 'outputPrefix',
          '#uploadKey': 'uploadKey',
          '#jobId': 'mediaConvertJobId',
          '#lock': 'preprocessingLock',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: marshall({
          ':processing': 'Processing',
          ':chunkDuration': CHUNK_SECONDS,
          ':outputPrefix': outputPrefix,
          ':uploadKey': s3Key,
          ':lock': `${videoId}:${Date.now()}`,
          ':updatedAt': now,
        })
      }));
    } catch (e) {
      console.log(`Preprocessing already in progress or completed for ${episodeId}/track#${trackName}. Skipping job creation.`);
      return { statusCode: 200 };
    }

    const jobParams = {
      Role: process.env.MEDIACONVERT_ROLE_ARN,
      Settings: {
        Inputs: [{
          FileInput: `s3://${process.env.BUCKET_NAME}/${s3Key}`,
          AudioSelectors: {
            'Audio Selector 1': {
              DefaultSelection: 'DEFAULT'
            }
          },
          VideoSelector: {},
          TimecodeSource: 'ZEROBASED'
        }],
        OutputGroups: [{
          Name: 'HLS',
          OutputGroupSettings: {
            Type: 'HLS_GROUP_SETTINGS',
            HlsGroupSettings: {
              Destination: `s3://${process.env.BUCKET_NAME}/${episodeId}/videos/${trackName}/chunks/`,
              SegmentLength: CHUNK_SECONDS,
              MinSegmentLength: 0,
              SegmentControl: 'SEGMENTED_FILES',
              ManifestDurationFormat: 'INTEGER',
              OutputSelection: 'MANIFESTS_AND_SEGMENTS'
            }
          },
          Outputs: [{
            ContainerSettings: {
              Container: 'M3U8',
              M3u8Settings: {}
            },
            VideoDescription: {
              CodecSettings: {
                Codec: 'H_264',
                H264Settings: {
                  RateControlMode: 'QVBR',
                  MaxBitrate: 5000000,
                  QualityTuningLevel: 'SINGLE_PASS_HQ'
                }
              }
            },
            AudioDescriptions: [{
              CodecSettings: {
                Codec: 'AAC',
                AacSettings: {
                  Bitrate: 128000,
                  CodingMode: 'CODING_MODE_2_0',
                  SampleRate: 48000
                }
              }
            }],
            NameModifier: '_chunk'
          }]
        }]
      },
      UserMetadata: {
        videoId,
        episodeId,
        trackName
      }
    };

    const { Job } = await mediaConvert.send(new CreateJobCommand(jobParams));

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: `track#${trackName}` }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #mediaConvertJobId = :jobId, #updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#mediaConvertJobId': 'mediaConvertJobId',
        '#updatedAt': 'updatedAt',
      },
      ExpressionAttributeValues: marshall({
        ':jobId': Job.Id,
        ':updatedAt': new Date().toISOString(),
      })
    }));

    return { statusCode: 200 };
  } catch (err) {
    console.error('Error creating MediaConvert job:', err);
    throw err;
  }
};
