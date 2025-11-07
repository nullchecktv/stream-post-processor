import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists, checkExists } from '../utils/validate.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { teamId } = event.pathParameters;
    const targetUserId = event.pathParameters.userId;

    const validation = validateRequest(event, {
      role: { required: true, type: 'string', enum: ['administrator', 'member'] }
    });

    if (validation.error) return validation.error;

    const { userId, data } = validation;
    const { role } = data;

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'owner');
    if (memberCheck.error) return memberCheck.error;
    const { membership } = memberCheck;

    if (membership.role === 'owner' && membership.userId === targetUserId) {
      return formatResponse(403, { message: 'Team owners cannot change their own role' });
    }

    const targetMembership = await checkExists(`team#${teamId}`, `user#${targetUserId}`);
    if (!targetMembership) {
      return formatResponse(404, { message: 'User is not a member of this team' });
    }

    const previousRole = targetMembership.role;

    if (previousRole === role) {
      return formatResponse(200, { message: 'Member role is already set to the requested value' });
    }
    const now = new Date().toISOString();

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `team#${teamId}`,
        sk: `user#${targetUserId}`
      }),
      UpdateExpression: 'SET #role = :role, updatedAt = :updatedAt',
      ExpressionAttributeNames: {
        '#role': 'role'
      },
      ExpressionAttributeValues: marshall({
        ':role': role,
        ':updatedAt': now
      }),
      ConditionExpression: 'attribute_exists(pk)'
    }));

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'Team Member Role Updated',
          Detail: JSON.stringify({
            teamId,
            teamName: team.name,
            targetUserId,
            previousRole,
            newRole: role,
            updatedBy: userId,
            updatedAt: now
          })
        }
      ]
    }));

    return formatResponse(200, { message: 'Member role updated successfully' });

  } catch (err) {
    console.error('Error updating member role:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
