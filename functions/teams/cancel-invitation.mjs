import { DynamoDBClient, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists } from '../utils/validation.mjs';
import { INVITATION_STATUS } from '../../schemas/index.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const { teamId, email } = event.pathParameters;

    const validation = validateRequest(event, {});
    if (validation.error) return validation.error;

    const { userId } = validation;

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'administrator');
    if (memberCheck.error) return memberCheck.error;

    const invitationResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `invitation#${email.toLowerCase()}`,
        sk: `team#${teamId}`
      })
    }));

    if (!invitationResponse.Item) {
      return formatResponse(404, {
        error: 'NotFound',
        message: `Invitation for email '${email}' was not found in team '${teamId}'`
      });
    }

    const invitation = unmarshall(invitationResponse.Item);

    if (invitation.status !== INVITATION_STATUS.PENDING) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Only pending invitations can be cancelled'
      });
    }

    try {
      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `invitation#${email.toLowerCase()}`,
          sk: `team#${teamId}`
        }),
        ConditionExpression: 'attribute_exists(pk) AND #status = :status',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': INVITATION_STATUS.PENDING
        })
      }));

    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        return formatResponse(409, { error: 'Conflict', message: 'Invitation status has changed and cannot be cancelled' });
      }
      throw error;
    }

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'Team Invitation Cancelled',
          Detail: JSON.stringify({
            teamId,
            teamName: team.name,
            email: email.toLowerCase(),
            role: invitation.role,
            cancelledBy: userId,
            inviterName: invitation.inviterName,
            cancelledAt: new Date().toISOString()
          })
        }
      ]
    }));

    return formatEmptyResponse();

  } catch (err) {
    logger.error('Error cancelling team invitation', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      email: event.pathParameters?.email,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { error: 'InternalError', message: 'Something went wrong' });
  }
};
