import { Logger } from '@aws-lambda-powertools/logger';
import { decrypt, encrypt } from './encoding.mjs';

const logger = new Logger({ serviceName: 'utils' });

const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ORIGIN || '*',
};

export const formatResponse = (statusCode, body, additionalHeaders = {}) => {
  return {
    statusCode,
    body: typeof body === 'string' ? JSON.stringify({ message: body }) : JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...additionalHeaders
    }
  };
};

export const formatEmptyResponse = () => {
  return {
    statusCode: 204,
    headers: corsHeaders
  };
};

export const parseBody = (event) => {
  try {
    if (!event?.body) return {};
    return typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
  } catch {
    return null;
  }
};

export const sanitizeTrackName = (name) => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 128);
};

export const getPagingParams = (event) => {
  const query = event?.queryStringParameters || {};
  let limit = query?.limit;
  let nextToken = query?.nextToken;

  if (limit !== null && limit !== undefined && limit !== '') {
    const n = parseInt(limit, 10);
    limit = Math.max(1, Math.min(25, Number.isFinite(n) ? n : 10));
  } else {
    limit = 10;
  }

  if (nextToken) {
    try {
      const tokenStr = decrypt(nextToken);
      nextToken = JSON.parse(tokenStr);
    } catch (e) {
      logger.warn('Invalid nextToken supplied', {
        error: e.message,
        nextToken: nextToken
      });
      nextToken = undefined;
    }
  }

  return { limit, nextToken };
};

export const buildPagingParams = (items, lastEvaluatedKey, hasMore = null) => {
  const response = { items };

  // If hasMore is explicitly provided, use it; otherwise infer from lastEvaluatedKey
  const shouldIncludeNextToken = hasMore !== null ? hasMore : !!lastEvaluatedKey;

  if (shouldIncludeNextToken && lastEvaluatedKey) {
    response.nextToken = encrypt(JSON.stringify(lastEvaluatedKey));
  }

  return response;
};
