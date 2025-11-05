import { DynamoDBClient, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, formatEmptyResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists } from '../utils/validate.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

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
      return formatResponse(404, { message: 'Invitation not found' });
    }

    const invitation = unmarshall(invitationResponse.Item);

    if (invitation.status !== 'pending') {
      return formatResponse(400, { message: 'Only pending invitations can be cancelled' });
    }

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
        ':status': 'pending'
      })
    }));

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
    console.error('Error cancelling team invitation:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
