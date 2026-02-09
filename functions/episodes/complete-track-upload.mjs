import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand, PutItemCommand, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { Logger } from '@aws-lambda-powertools/logger';
import { parseBody, formatResponse, sanitizeTrackName } from '../utils/api.mjs';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { initializeStatusHistory } from '../utils/status-history.mjs';
import { TRACK_STATUS } from '../../schemas/index.mjs';
import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';
import { calculateTrackCount } from '../utils/episodes.mjs';

const ddb = new DynamoDBClient();
const s3 = new S3Client();
const eb = new EventBridgeClient();
const logger = new Logger({ serviceName: 'episodes' });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const { episodeId, trackName: rawTrackName } = event.pathParameters;
    const trackName = sanitizeTrackName(rawTrackName);

    const body = parseBody(event);
    let uploadId, parts;
    try {
      uploadId = (body?.uploadId || '').toString().trim();
      parts = Array.isArray(body?.parts) ? body.parts : [];
    } catch {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid request'
      });
    }
    if (!uploadId || !parts.length) return formatResponse(400, {
      error: 'ValidationError',
      message: 'uploadId and parts are required'
    });

    const trackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `track-upload:${trackName}`
      })
    }));
    if (!trackResponse.Item) return formatResponse(404, {
      error: 'NotFound',
      message: `Upload session was not found for track '${trackName}' in episode '${episodeId}'`
    });

    const record = unmarshall(trackResponse.Item);
    if (record.uploadId !== uploadId) return formatResponse(400, {
      error: 'ValidationError',
      message: 'uploadId mismatch for this track'
    });
    const speakers = record.speakers || [];

    const key = record.key;

    const s3Parts = parts.map(part => ({
      ETag: part.etag || part.ETag,
      PartNumber: part.partNumber || part.PartNumber
    }));

    logger.info('Completing multipart upload', {
      episodeId,
      trackName,
      uploadId,
      partCount: s3Parts.length
    });

    await s3.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: s3Parts }
    }));

    const now = new Date().toISOString();
    const newStatus = 'tracks uploaded';

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #updatedAt = :updatedAt, #status = :status, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry) ADD #numTracks :one',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
        '#status': 'status',
        '#statusHistory': 'statusHistory',
        '#numTracks': 'numTracks'
      },
      ExpressionAttributeValues: marshall({
        ':updatedAt': now,
        ':status': newStatus,
        ':emptyList': [],
        ':newStatusEntry': [{
          status: newStatus,
          timestamp: now
        }],
        ':one': 1
      })
    }));

    const trackStatus = TRACK_STATUS.UPLOADED;
    const trackStatusHistory = initializeStatusHistory(trackStatus, now);

    try {
      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
        Item: marshall({
          pk: `${tenantId}#${episodeId}`,
          sk: `data#track#${trackName}`,
          status: trackStatus,
          statusHistory: trackStatusHistory,
          trackName,
          uploadKey: key,
          speakers: speakers,
          createdAt: now,
          updatedAt: now
        })
      }));
    } catch (e) {
      if (e && (e.name === 'ConditionalCheckFailedException' || e.code === 'ConditionalCheckFailedException')) {
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `${tenantId}#${episodeId}`,
            sk: `data#track#${trackName}`
          }),
          UpdateExpression: 'SET uploadKey = :key, updatedAt = :updatedAt, trackName = :name, speakers = :speakers, #status = :status, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
          ExpressionAttributeNames: {
            '#status': 'status',
            '#statusHistory': 'statusHistory'
          },
          ExpressionAttributeValues: marshall({
            ':key': key,
            ':updatedAt': now,
            ':name': trackName,
            ':speakers': speakers,
            ':status': trackStatus,
            ':emptyList': [],
            ':newStatusEntry': [{
              status: trackStatus,
              timestamp: now
            }]
          })
        }));
      } else {
        throw e;
      }
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: `track-upload:${trackName}` })
    }));

    const trackCount = await calculateTrackCount(episodeId, tenantId);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: 'metadata'
      }),
      UpdateExpression: 'SET trackCount = :trackCount',
      ExpressionAttributeValues: marshall({
        ':trackCount': trackCount
      })
    }));

    try {
      await eb.send(new PutEventsCommand({
        Entries: [
          {
            Source: 'nullcheck',
            DetailType: 'Video Upload Completed',
            Detail: JSON.stringify({ episodeId, trackName, key })
          }
        ]
      }));
    } catch (e) {
      logger.error('Failed to publish Video Upload Completed event', {
        error: e.message,
        stack: e.stack,
        name: e.name,
        episodeId,
        trackName
      });
    }

    const tracksResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#track#'
      })
    }));

    const tracks = (tracksResponse.Items || []).map(item => unmarshall(item));
    const allUploaded = tracks.length > 0 && tracks.every(track =>
      track.status === TRACK_STATUS.UPLOADED ||
      track.status === TRACK_STATUS.PROCESSING ||
      track.status === TRACK_STATUS.PROCESSED
    );

    if (allUploaded) {
      await updateWorkflowStepStatus(
        tenantId,
        episodeId,
        WORKFLOW_STEPS.UPLOAD_TRACKS,
        WORKFLOW_STEP_STATUS.COMPLETED
      );

      logger.info('All tracks uploaded, workflow step completed', {
        episodeId,
        tenantId,
        trackCount: tracks.length
      });
    }

    return formatResponse(200, { key, trackName });
  } catch (err) {
    logger.error('Error completing track upload', {
      error: err.message,
      stack: err.stack,
      name: err.name,
      episodeId: event.pathParameters?.episodeId,
      trackName: event.pathParameters?.trackName
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
