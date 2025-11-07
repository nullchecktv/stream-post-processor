import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters, requireTeamMember, requireTeamExists, checkExists } from '../utils/validation.mjs';
import { TeamSchemas } from '../utils/schemas.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, TeamSchemas.pathParametersWithUser);
    if (!pathValidation.success) return pathValidation.error;

    const { teamId, userId: targetUserId } = pathValidation.data;

    const bodyValidation = await validateRequest(event, TeamSchemas.updateMemberRole);
    if (!bodyValidation.success) return bodyValidation.error;

    const { tenantId, userId, data } = bodyValidation;
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
    logger.error('Error updating member role', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      targetUserId: event.pathParameters?.userId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
