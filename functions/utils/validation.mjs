import { validate } from '@aws-lambda-powertools/validation';
import { SchemaValidationError } from '@aws-lambda-powertools/validation/errors';
import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, parseBody } from './api.mjs';

const logger = new Logger({ serviceName: 'utils' });
const ddb = new DynamoDBClient();

export const validateRequest = (event, schema) => {
  const tenantId = event?.requestContext?.authorizer?.tenantId;
  const userId = event?.requestContext?.authorizer?.userId;

  if (!tenantId || !userId) {
    return {
      success: false,
      error: formatResponse(401, { message: 'Unauthorized' })
    };
  }

  try {
    const payload = event.body ? parseBody(event) : {};
    if (payload === null) {
      return {
        success: false,
        error: formatResponse(400, { message: 'Invalid JSON format' })
      };
    }

    validate({
      payload,
      schema
    });

    return {
      success: true,
      tenantId,
      userId,
      data: payload
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        success: false,
        error: formatResponse(400, { message: error.message })
      };
    }
    throw error;
  }
};

export const validatePathParameters = async (event, schema) => {
  if (!event.pathParameters) {
    return {
      success: false,
      error: formatResponse(400, { message: 'Missing path parameters' })
    };
  }

  try {
    await validate({
      payload: event.pathParameters,
      schema
    });

    return {
      success: true,
      data: event.pathParameters
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        success: false,
        error: formatResponse(400, { message: error.message })
      };
    }
    throw error;
  }
};

export const validateQueryParameters = async (event, schema) => {
  const queryParams = event.queryStringParameters || {};

  try {
    await validate({
      payload: queryParams,
      schema
    });

    return {
      success: true,
      data: queryParams
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        success: false,
        error: formatResponse(400, { message: error.message })
      };
    }
    throw error;
  }
};

export const validateBody = async (event, schema) => {
  if (!event.body) {
    return {
      success: false,
      error: formatResponse(400, { message: 'Missing request body' })
    };
  }

  try {
    const body = parseBody(event);
    if (body === null) {
      return {
        success: false,
        error: formatResponse(400, { message: 'Invalid JSON format' })
      };
    }

    await validate({
      payload: body,
      schema
    });

    return {
      success: true,
      data: body
    };
  } catch (error) {
    if (error instanceof SchemaValidationError) {
      return {
        success: false,
        error: formatResponse(400, { message: error.message })
      };
    }
    throw error;
  }
};

export const checkExists = async (pk, sk) => {
  try {
    const response = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({ pk, sk })
    }));
    return response.Item ? unmarshall(response.Item) : null;
  } catch (error) {
    logger.error('Error checking existence', {
      error: error.message,
      stack: error.stack,
      pk,
      sk
    });
    return null;
  }
};

export const requireTeamMember = async (teamId, userId, requiredRole = null) => {
  const membership = await checkExists(`team#${teamId}`, `user#${userId}`);

  if (!membership) {
    return { error: formatResponse(403, { message: 'Not a team member' }) };
  }

  if (membership.status !== 'active') {
    return { error: formatResponse(403, { message: 'Membership not active' }) };
  }

  if (requiredRole) {
    const roleHierarchy = { member: 1, administrator: 2, owner: 3 };
    const userLevel = roleHierarchy[membership.role] || 0;
    const requiredLevel = roleHierarchy[requiredRole] || 0;

    if (userLevel < requiredLevel) {
      return { error: formatResponse(403, { message: `Requires ${requiredRole} role or higher` }) };
    }
  }

  return { membership };
};

export const requireTeamExists = async (teamId) => {
  const team = await checkExists(`team#${teamId}`, 'metadata');
  if (!team) {
    return { error: formatResponse(404, { message: 'Team not found' }) };
  }
  return { team };
};
