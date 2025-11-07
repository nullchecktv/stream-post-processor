import { validate } from '@aws-lambda-powertools/validation';
import { SchemaValidationError } from '@aws-lambda-powertools/validation/errors';
import { formatResponse, parseBody } from './api.mjs';

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
