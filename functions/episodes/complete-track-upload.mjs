import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { S3Client, CompleteMultipartUploadCommand } from '@aws-sdk/client-s3';
import { parseBody, formatResponse } from '../utils/api.mjs';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const ddb = new DynamoDBClient();
const s3 = new S3Client();
const eb = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { episodeId, trackName } = event.pathParameters;

    const body = parseBody(event);
    let uploadId, parts;
    try {
      uploadId = (body?.uploadId || '').toString().trim();
      parts = Array.isArray(body?.parts) ? body.parts : [];
    } catch {
      return formatResponse(400, { message: 'Invalid request' });
    }
    if (!uploadId || !parts.length) return formatResponse(400, { message: 'uploadId and parts are required' });

    const trackResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: `track-upload:${trackName}` })
    }));
    if (!trackResponse.Item) return formatResponse(404, { message: 'Upload not found' });

    const rec = unmarshall(trackResponse.Item);
    if (rec.uploadId !== uploadId) return formatResponse(400, { message: 'uploadId mismatch for this track' });

    // Extract speakers from upload record, default to empty array if not provided
    const speakers = rec.speakers || [];

    const key = rec.key;

    await s3.send(new CompleteMultipartUploadCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: parts }
    }));

    const now = new Date().toISOString();
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: 'metadata' }),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)',
      UpdateExpression: 'SET #updatedAt = :updatedAt, #status = :status ADD #numTracks :one',
      ExpressionAttributeNames: {
        '#updatedAt': 'updatedAt',
        '#status': 'status',
        '#numTracks': 'numTracks'
      },
      ExpressionAttributeValues: marshall({
        ':updatedAt': now,
        ':status': 'Track(s) Uploaded',
        ':one': 1
      })
    }));

    try {
      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
        Item: marshall({
          pk: episodeId,
          sk: `track#${trackName}`,
          status: 'Unprocessed',
          trackName,
          uploadKey: key,
          speakers: speakers,
          createdAt: now,
          updatedAt: now
        })
      }));
    } catch (e) {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({ pk: episodeId, sk: `track#${trackName}` }),
        UpdateExpression: 'SET uploadKey = :key, updatedAt = :updatedAt, trackName = :name, speakers = :speakers',
        ExpressionAttributeValues: marshall({
          ':key': key,
          ':updatedAt': now,
          ':name': trackName,
          ':speakers': speakers
        })
      }));
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk: episodeId, sk: `track-upload:${trackName}` })
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
      console.error('Failed to publish Video Upload Completed event:', e);
    }

    return formatResponse(200, { key, trackName });
  } catch (err) {
    console.error('Error completing track upload:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
