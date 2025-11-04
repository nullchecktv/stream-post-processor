import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { parseBody, formatResponse, formatEmptyResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;
    const { teamId } = event.pathParameters;

    if (!userId) {
      console.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const data = parseBody(event);
    if (data === null) {
      return formatResponse(400, { message: 'Invalid request' });
    }

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

    const errors = [];
    let name = currentTeam.name;
    let description = currentTeam.description;
    let settings = currentTeam.settings;

    if (data.name !== undefined) {
      name = String(data.name).trim();
      if (!name) errors.push('name is required');
      if (name.length > 100) errors.push('name must be 100 characters or less');
    }

    if (data.description !== undefined) {
      description = data.description ? String(data.description) : undefined;
      if (description && description.length > 500) errors.push('description must be 500 characters or less');
    }

    if (data.settings !== undefined) {
      if (typeof data.settings !== 'object' || data.settings === null) {
        errors.push('settings must be an object');
      } else {
        settings = {
          defaultPlatforms: Array.isArray(data.settings.defaultPlatforms)
            ? data.settings.defaultPlatforms
            : settings.defaultPlatforms,
          timezone: data.settings.timezone
            ? String(data.settings.timezone)
            : settings.timezone
        };
      }
    }

    if (errors.length) {
      return formatResponse(400, { message: errors.join(', ') });
    }

    const now = new Date().toISOString();

    const updatedTeam = {
      ...currentTeam,
      name,
      description,
      settings,
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
    console.error('Error updating team:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
