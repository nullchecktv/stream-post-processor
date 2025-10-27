import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import crypto from 'crypto';
import { parseBody, formatResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

const PLATFORMS = new Set(['linkedin live', 'X', 'twitch', 'youtube']);

export const handler = async (event) => {
  try {
    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { message: 'Invalid request' });
    }

    const errors = [];
    const title = (data?.title ?? '').toString().trim();
    const episodeNumberRaw = data?.episodeNumber;
    const episodeNumber = Number.isFinite(episodeNumberRaw)
      ? Math.trunc(episodeNumberRaw)
      : parseInt(episodeNumberRaw, 10);

    if (!title) errors.push('title is required');
    if (!Number.isFinite(episodeNumber)) errors.push('episodeNumber is required and must be a number');

    if (errors.length) {
      return formatResponse(400, { message: errors.join(', ') });
    }

    const summary = data?.summary ? String(data.summary) : undefined;
    const airDate = data?.airDate ? String(data.airDate) : undefined;
    let platforms = data?.platforms;
    if (platforms) {
      if (!Array.isArray(platforms)) platforms = [platforms];
      platforms = platforms
        .map((p) => (p ?? '').toString())
        .filter((p) => PLATFORMS.has(p));
    }
    const themes = Array.isArray(data?.themes) ? data.themes.map((t) => String(t)) : undefined;
    const seriesName = data?.seriesName ? String(data.seriesName) : undefined;

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const item = {
      pk: id,
      sk: 'metadata',
      GSI1PK: 'episode',
      GSI1SK: now,
      title,
      episodeNumber,
      status: 'Draft',
      ...(summary && { summary }),
      ...(airDate && { airDate }),
      ...(platforms?.length && { platforms }),
      ...(themes?.length && { themes }),
      ...(seriesName && { seriesName }),
      numTracks: 0,
      createdAt: now,
      updatedAt: now,
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)',
      Item: marshall(item),
    }));

    return formatResponse(201, { id });
  } catch (err) {
    console.error('Error creating episode:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};

