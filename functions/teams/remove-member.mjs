import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists, checkExists } from '../utils/validate.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { teamId } = event.pathParameters;
    const targetUserId = event.pathParameters.userId;
    const confirmDelete = event.queryStringParameters?.confirmDelete === 'true';

    const validation = validateRequest(event, {});
    if (validation.error) return validation.error;

    const { userId } = validation;

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'administrator');
    if (memberCheck.error) return memberCheck.error;

    const targetMembership = await checkExists(`team#${teamId}`, `user#${targetUserId}`);
    if (!targetMembership) {
      return formatResponse(404, { message: 'User is not a member of this team' });
    }

    if (targetMembership.role === 'owner' && targetMembership.userId === targetUserId) {
      return formatResponse(403, { message: 'Team owners cannot remove themselves from the team' });
    }

    if (confirmDelete) {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${teamId}`,
          sk: `user#${targetUserId}`
        }),
        ConditionExpression: 'attribute_exists(pk)'
      }));
    } else {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `team#${teamId}`,
          sk: `user#${targetUserId}`
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
    }

    const userProfileResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `user#${targetUserId}`,
        sk: 'profile'
      })
    }));

    if (userProfileResponse.Item) {
      const userProfile = unmarshall(userProfileResponse.Item);

      if (userProfile.activeTeamId === teamId) {
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `user#${targetUserId}`,
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
          DetailType: confirmDelete ? 'Team Member Removed' : 'Team Member Deactivated',
          Detail: JSON.stringify({
            teamId,
            teamName: team.name,
            targetUserId: targetUserId,
            actionBy: userId,
            memberRole: targetMembership.role,
            action: confirmDelete ? 'deleted' : 'deactivated',
            actionAt: new Date().toISOString()
          })
        }
      ]
    }));

    return formatEmptyResponse();

  } catch (err) {
    console.error('Error removing team member:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
