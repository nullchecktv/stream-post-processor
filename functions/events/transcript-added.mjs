import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { parseEpisodeIdFromKey } from '../utils/clips.mjs';
import { extractSpeakersFromTranscript, matchSpeakers } from '../utils/speakers.mjs';
import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';
import { loadTranscript, parseSrtFile, formatCleanedTranscript } from '../utils/transcripts.mjs';

const logger = new Logger({ serviceName: 'events' });

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const rawKey = event?.detail?.object?.key;
    if (!rawKey) {
      return { statusCode: 200 };
    }

    const key = decodeURIComponent(rawKey);
    let tenantId, episodeId;
    try {
      const parsed = parseEpisodeIdFromKey(key);
      tenantId = parsed.tenantId;
      episodeId = parsed.episodeId;
    } catch (e) {
      return { statusCode: 200 };
    }

    if (!tenantId) {
      logger.error('Missing tenantId in S3 key', { key });
      return { statusCode: 200 };
    }

    const episodeResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' })
    }));

    if (!episodeResponse.Item) {
      return { statusCode: 200 };
    }

    const episode = unmarshall(episodeResponse.Item);
    const episodeSpeakers = episode.speakers || [];

    let speakerAnalysis = null;

    try {
      const srtContent = await loadTranscript(key);
      const parsedEntries = parseSrtFile(srtContent);

      if (parsedEntries.length > 0) {
        const cleanedContent = formatCleanedTranscript(parsedEntries);

        const folderPath = key.substring(0, key.lastIndexOf('/'));
        const mdKey = `${folderPath}/transcript.md`;

        try {
          await s3.send(new PutObjectCommand({
            Bucket: process.env.BUCKET_NAME,
            Key: mdKey,
            Body: cleanedContent,
            ContentType: 'text/markdown'
          }));
        } catch (uploadError) {
          logger.error('Failed to upload cleaned transcript', {
            error: uploadError.message,
            stack: uploadError.stack,
            episodeId,
            mdKey
          });
        }
      }
    } catch (cleaningError) {
      logger.error('Failed to create cleaned transcript', {
        error: cleaningError.message,
        stack: cleaningError.stack,
        episodeId,
        key
      });
    }

    try {
      const transcriptSpeakers = await extractSpeakersFromTranscript(key);

      if (transcriptSpeakers.length > 0) {
        const matchResult = await matchSpeakers(transcriptSpeakers, episodeSpeakers);

        speakerAnalysis = {
          matched: matchResult.matches || [],
          unmatched: matchResult.unmatched || [],
          suggestion: matchResult.suggestion || null
        };
      }
    } catch (error) {
      logger.error('Failed to analyze speakers', {
        error: error.message,
        stack: error.stack,
        episodeId,
        key
      });
    }

    const now = new Date().toISOString();
    const newStatus = 'transcript uploaded';

    const updateExpression = speakerAnalysis
      ? 'SET #transcriptKey = :key, #status = :status, #updatedAt = :updatedAt, #speakerAnalysis = :speakerAnalysis, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)'
      : 'SET #transcriptKey = :key, #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatusEntry)';

    const expressionAttributeNames = {
      '#transcriptKey': 'transcriptKey',
      '#status': 'status',
      '#updatedAt': 'updatedAt',
      '#statusHistory': 'statusHistory'
    };

    const expressionAttributeValues = {
      ':key': key,
      ':status': newStatus,
      ':updatedAt': now,
      ':emptyList': [],
      ':newStatusEntry': [{
        status: newStatus,
        timestamp: now
      }]
    };

    if (speakerAnalysis) {
      expressionAttributeNames['#speakerAnalysis'] = 'speakerAnalysis';
      expressionAttributeValues[':speakerAnalysis'] = speakerAnalysis;
    }

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'metadata' }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: updateExpression,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: marshall(expressionAttributeValues),
    }));

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: `${tenantId}#${episodeId}`, sk: 'transcript-upload-url' })
      }));
    } catch (e) {
      logger.error('Failed to delete presigned url record', {
        error: e?.message || e,
        stack: e?.stack,
        episodeId
      });
    }

    await eventBridge.send(new PutEventsCommand({
      Entries: [{
        Source: 'nullcheck',
        DetailType: 'Notification',
        Detail: JSON.stringify({
          type: 'transcript_processed',
          tenantId,
          title: 'Transcript Processed',
          message: speakerAnalysis
            ? `Found ${speakerAnalysis.matched.length + speakerAnalysis.unmatched.length} speaker${speakerAnalysis.matched.length + speakerAnalysis.unmatched.length !== 1 ? 's' : ''}`
            : 'Transcript uploaded successfully',
          url: `/episodes/${episodeId}`,
          persist: false,
          metadata: {
            episodeId,
            speakerAnalysis
          }
        })
      }]
    }));

    await updateWorkflowStepStatus(
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
      WORKFLOW_STEP_STATUS.COMPLETED
    );

    return { statusCode: 200 };
  } catch (err) {
    logger.error('Error handling EventBridge S3 event', {
      error: err.message,
      stack: err.stack,
      eventDetail: event?.detail
    });
    throw err;
  }
};


