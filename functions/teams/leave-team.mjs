import { DynamoDBClient, GetItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists } from '../utils/validate.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { teamId } = event.pathParameters;

    const validation = validateRequest(event, {});
    if (validation.error) return validation.error;

    const { userId } = validation;

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId);
    if (memberCheck.error) return memberCheck.error;
    const { membership } = memberCheck;

    if (membership.role === 'owner') {
      return formatResponse(403, { message: 'Team owners cannot leave their own team' });
    }

    await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${teamId}`,
          sk: `user#${userId}`
        }),
        UpdateExpression: 'SET #status = :status, updatedAt = :updatedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': 'inactive',
          ':updatedAt': new Date().toISOString()
        }),
        ConditionExpression: 'attribute_exists(pk)'
      }));

    const userProfileResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${userId}`,
        sk: 'profile'
      })
    }));

    if (userProfileResponse.Item) {
      const userProfile = unmarshall(userProfileResponse.Item);

      if (userProfile.activeTeamId === teamId) {
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `user#${userId}`,
            sk: 'profile'
          }),
          UpdateExpression: 'REMOVE activeTeamId SET updatedAt = :updatedAt',
          ExpressionAttributeValues: marshall({
            ':updatedAt': new Date().toISOString()
          })
        }));
      }
    }

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'Team Member Left',
          Detail: JSON.stringify({
            teamId,
            teamName: team.name,
            userId,
            memberRole: membership.role,
            leftAt: new Date().toISOString()
          })
        }
      ]
    }));

    return formatEmptyResponse();

  } catch (err) {
    console.error('Error leaving team:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
