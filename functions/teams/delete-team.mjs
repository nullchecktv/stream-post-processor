import { DynamoDBClient, GetItemCommand, TransactWriteItemsCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;
    const { teamId } = event.pathParameters;

    if (!userId) {
      console.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const teamResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `team#${teamId}`,
        sk: 'metadata'
      })
    }));

    if (!teamResponse.Item) {
      return formatEmptyResponse();
    }

    const team = unmarshall(teamResponse.Item);

    if (team.ownerId !== userId) {
      return formatResponse(403, { message: 'Only team owners can delete teams' });
    }

    const confirmParam = event.queryStringParameters?.confirm;
    if (confirmParam !== 'true') {
      return formatResponse(400, {
        message: 'Team deletion requires confirmation. Add ?confirm=true to the request.'
      });
    }

    await ddb.send(new TransactWriteItemsCommand({
      TransactItems: [
        {
          Delete: {
            TableName: process.env.TABLE_NAME,
            Key: marshall({
              pk: `team#${teamId}`,
              sk: 'metadata'
            }),
            ConditionExpression: 'attribute_exists(pk)'
          }
        },
        {
          Delete: {
            TableName: process.env.TABLE_NAME,
            Key: marshall({
              pk: `team#${teamId}`,
              sk: `user#${userId}`
            }),
            ConditionExpression: 'attribute_exists(pk)'
          }
        }
      ]
    }));

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'Team Deleted',
          Detail: JSON.stringify({
            teamId,
            ownerId: userId,
            teamName: team.name,
            deletedAt: new Date().toISOString()
          })
        }
      ]
    }));

    return formatEmptyResponse();
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return formatResponse(404, { message: 'Team not found' });
    }
    console.error('Error deleting team:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
