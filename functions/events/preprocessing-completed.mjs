import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { publishNotification } from '../utils/notifications.mjs';
import { TRACK_STATUS } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'events' });


const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const detail = event?.detail || {};
    const meta = detail?.userMetadata || {};

    const episodeId = (meta.episodeId || '').toString().trim();
    const trackName = (meta.trackName || '').toString().trim();
    const jobId = (detail?.jobId || '').toString().trim();

    if (!episodeId || !trackName) {
      logger.warn('Missing identifiers in MediaConvert completion event', { jobId, meta });
      return { statusCode: 200 };
    }

    let tenantId;
    try {
      tenantId = (meta.tenantId || '').toString().trim();

      if (!tenantId) {
        logger.error('Missing tenantId in MediaConvert completion event metadata');
        return { statusCode: 200 };
      }
    } catch (e) {
      logger.error('Failed to extract tenantId from MediaConvert event', { error: e.message });
      return { statusCode: 200 };
    }

    const now = new Date().toISOString();
    const outputPrefix = `${tenantId}/${episodeId}/videos/${trackName}/chunks/`;
    let manifestKey = '';
    try {
      const list = await s3.send(new ListObjectsV2Command({
        Bucket: process.env.BUCKET_NAME,
        Prefix: outputPrefix,
      }));
      const contents = list.Contents || [];
      const m3u8s = contents.map(o => o.Key).filter(Boolean).filter(k => k.endsWith('.m3u8'));
      manifestKey = m3u8s.find(k => /(^|\/)index\.m3u8$/.test(k)) || m3u8s[0] || '';
    } catch (e) {
      logger.warn('Could not list S3 output for manifest', { error: e?.message || e });
    }

    let segmentIndex = [];
    let segmentCount = 0;
    let totalDurationSeconds = 0;
    if (manifestKey) {
      try {
        const res = await s3.send(new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: manifestKey }));
        const text = await res.Body?.transformToString();
        if (text) {
          const { segments, total } = buildHlsIndex(text, manifestKey);
          segmentIndex = segments;
          segmentCount = segments.length;
          totalDurationSeconds = total;
        }
      } catch (e) {
        logger.warn('Failed to fetch/parse manifest for indexing', { error: e?.message || e });
      }
    }

    const newStatus = TRACK_STATUS.PROCESSED;

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: `data#track#${trackName}` }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #status = :processed, #manifestKey = :manifestKey, #segmentIndex = :segmentIndex, #segmentCount = :segmentCount, #totalDurationSeconds = :total, #updatedAt = :now, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#manifestKey': 'manifestKey',
        '#segmentIndex': 'segmentIndex',
        '#segmentCount': 'segmentCount',
        '#totalDurationSeconds': 'totalDurationSeconds',
        '#updatedAt': 'updatedAt',
        '#statusHistory': 'statusHistory'
      },
      ExpressionAttributeValues: marshall({
        ':processed': newStatus,
        ':manifestKey': manifestKey || null,
        ':segmentIndex': segmentIndex,
        ':segmentCount': segmentCount,
        ':total': totalDurationSeconds,
        ':now': now,
        ':emptyList': [],
        ':newStatusEntry': [{
          status: newStatus,
          timestamp: now
        }]
      })
    }));

    await publishNotification(tenantId, {
      type: 'preprocessing_completed',
      episodeId,
      title: 'Video Preprocessing Complete',
      message: `Track "${trackName}" has been processed`
    });

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Error handling MediaConvert completion', { error: err.message, stack: err.stack });
    throw err;
  }
};

function buildHlsIndex(manifestText, manifestKey) {
  const lines = manifestText.split(/\r?\n/);
  let seqBase = 0;
  let seq = 0;
  let curDur = 0;
  let curStart = 0;
  const dir = manifestKey.replace(/[^/]+$/, '');
  const segments = [];

  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#EXTM3U') || line.startsWith('#EXT-X-VERSION') || line.startsWith('#EXT-X-TARGETDURATION')) continue;
    if (line.startsWith('#EXT-X-MEDIA-SEQUENCE')) {
      const m = line.match(/:(\d+)/);
      if (m) {
        seqBase = parseInt(m[1], 10) || 0;
        seq = seqBase;
      }
      continue;
    }
    if (line.startsWith('#EXTINF')) {
      const m = line.match(/#EXTINF:([0-9.]+)/);
      curDur = m ? parseFloat(m[1]) : 0;
      continue;
    }
    if (line.startsWith('#')) continue;
    const uri = line;
    const key = uri.startsWith('http') || uri.startsWith('s3://') ? uri : `${dir}${uri}`;
    const start = curStart;
    const duration = Number.isFinite(curDur) ? curDur : 0;
    const end = start + duration;
    segments.push({ key, seq, duration, start, end });
    curStart = end;
    seq += 1;
    curDur = 0;
  }

  const total = segments.length ? segments[segments.length - 1].end : 0;
  return { segments, total };
}
