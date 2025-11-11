import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { TeamSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, TeamSchemas.pathParameters);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const bodyValidation = await validateRequest(event, TeamSchemas.update);
    if (!bodyValidation.success) {
      return bodyValidation.error;
    }

    const { tenantId, userId, data } = bodyValidation;
    const { teamId } = pathValidation.data;

    const teamResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `team#${teamId}`,
        sk: 'metadata'
      })
    }));

    if (!teamResponse.Item) {
      return formatResponse(404, { message: 'Team not found' });
    }

    const currentTeam = unmarshall(teamResponse.Item);
    if (currentTeam.ownerId !== userId) {
      return formatResponse(403, { message: 'Only team owners can update team settings' });
    }

    const name = data.name !== undefined ? data.name : currentTeam.name;
    const description = data.description !== undefined ? data.description : currentTeam.description;
    const settings = data.settings !== undefined ? data.settings : currentTeam.settings;
    const brandVoice = data.brandVoice !== undefined ? data.brandVoice : currentTeam.brandVoice;
    const branding = data.branding !== undefined ? data.branding : currentTeam.branding;

    const now = new Date().toISOString();

    const updatedTeam = {
      ...currentTeam,
      name,
      description,
      settings,
      brandVoice,
      branding,
      updatedAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(updatedTeam),
      ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
    }));

    return formatEmptyResponse();
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(409, { message: 'Team was modified by another request. Please retry.' });
    }
    logger.error('Error updating team', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
