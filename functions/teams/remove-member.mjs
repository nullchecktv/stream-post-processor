import { DynamoDBClient, GetItemCommand, UpdateItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validatePathParameters, validateQueryParameters, requireTeamMember, requireTeamExists, checkExists } from '../utils/validation.mjs';
import { TeamPathParamsWithUserSchema, TeamRemoveMemberQuerySchema, MEMBERSHIP_STATUS } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const { userId } = event.requestContext.authorizer;

    if (!userId) {
      logger.error('Missing userId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, TeamPathParamsWithUserSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const queryValidation = await validateQueryParameters(event, TeamRemoveMemberQuerySchema);
    if (!queryValidation.success) {
      return queryValidation.error;
    }

    const { teamId, userId: targetUserId } = pathValidation.data;
    const confirmDelete = queryValidation.data.confirmDelete === 'true';

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'administrator');
    if (memberCheck.error) return memberCheck.error;

    const targetMembership = await checkExists(`team#${teamId}`, `user#${targetUserId}`);
    if (!targetMembership) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `User with ID '${targetUserId}' is not a member of team '${teamId}'`
      });
    }

    if (targetMembership.role === 'owner' && targetMembership.userId === targetUserId) {
      return formatResponse(403, { error: 'Forbidden', message: 'Team owners cannot remove themselves from the team' });
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
          ':status': MEMBERSHIP_STATUS.REMOVED,
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
    logger.error('Error removing team member', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      targetUserId: event.pathParameters?.userId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
