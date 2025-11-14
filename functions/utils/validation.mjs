import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, parseBody } from './api.mjs';
import { ZodError } from 'zod';

const logger = new Logger({ serviceName: 'utils' });
const ddb = new DynamoDBClient();

const formatValidationErrors = (error) => {
  const errors = [];

  if (error instanceof ZodError && Array.isArray(error.issues)) {
    for (const issue of error.issues) {
      const fieldPath = issue.path?.join('.') || 'unknown';
      let message = issue.message;

      if (issue.code === 'invalid_type') {
        const expected = issue.expected;
        const receivedMatch = issue.message.match(/received (\w+)/);
        const received = receivedMatch ? receivedMatch[1] : 'unknown';
        message = `Expected ${expected}, but received ${received}`;
      } else if (issue.code === 'too_small') {
        if (issue.origin === 'string') {
          message = `Must be at least ${issue.minimum} characters`;
        } else if (issue.origin === 'array') {
          message = `Must contain at least ${issue.minimum} items`;
        } else {
          message = `Value is too small (minimum: ${issue.minimum})`;
        }
      } else if (issue.code === 'too_big') {
        if (issue.origin === 'string') {
          message = `Must be at most ${issue.maximum} characters`;
        } else if (issue.origin === 'array') {
          message = `Must contain at most ${issue.maximum} items`;
        } else {
          message = `Value is too large (maximum: ${issue.maximum})`;
        }
      } else if (issue.code === 'invalid_format') {
        if (issue.format === 'email') {
          message = 'Must be a valid email address';
        } else if (issue.format === 'url') {
          message = 'Must be a valid URL';
        } else if (issue.format === 'regex') {
          message = 'Invalid format';
        } else {
          message = `Invalid ${issue.format}`;
        }
      }

      errors.push({
        field: fieldPath,
        message,
        code: issue.code
      });
    }
  } else if (error && error.message) {
    errors.push({
      field: 'body',
      message: error.message,
      code: 'validation_error'
    });
  } else {
    errors.push({
      field: 'unknown',
      message: 'Validation error',
      code: 'validation_error'
    });
  }

  return errors;
};

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

    const validatedData = schema.parse ? schema.parse(payload) : payload;

    return {
      success: true,
      tenantId,
      userId,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatValidationErrors(error);
      return {
        success: false,
        error: formatResponse(400, {
          message: 'Validation failed',
          errors: validationErrors
        })
      };
    }
    logger.error('Unexpected validation error', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
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
    const validatedData = schema.parse ? schema.parse(event.pathParameters) : event.pathParameters;

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatValidationErrors(error);
      return {
        success: false,
        error: formatResponse(400, {
          message: 'Validation failed',
          errors: validationErrors
        })
      };
    }
    throw error;
  }
};

export const validateQueryParameters = async (event, schema) => {
  const queryParams = event.queryStringParameters || {};

  try {
    const validatedData = schema.parse ? schema.parse(queryParams) : queryParams;

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatValidationErrors(error);
      return {
        success: false,
        error: formatResponse(400, {
          message: 'Validation failed',
          errors: validationErrors
        })
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

    const validatedData = schema.parse ? schema.parse(body) : body;

    return {
      success: true,
      data: validatedData
    };
  } catch (error) {
    if (error instanceof ZodError) {
      const validationErrors = formatValidationErrors(error);
      return {
        success: false,
        error: formatResponse(400, {
          message: 'Validation failed',
          errors: validationErrors
        })
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

  if (membership.status !== 'Active') {
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
