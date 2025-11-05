import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, requireTeamMember, requireTeamExists, checkExists } from '../utils/validate.mjs';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { teamId } = event.pathParameters;

    const validation = validateRequest(event, {
      email: { required: true, type: 'string', email: true },
      role: { type: 'string', enum: ['administrator', 'member'] }
    });

    if (validation.error) return validation.error;

    const { userId, data } = validation;
    const email = data.email.toLowerCase();
    const role = data.role || 'member';

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'administrator');
    if (memberCheck.error) return memberCheck.error;

    const existingInvitation = await checkExists(`invitation#${email}`, `team#${teamId}`);
    if (existingInvitation) {
      return formatResponse(409, { message: 'User already has a pending invitation to this team' });
    }

    const inviterProfile = await checkExists(`user#${userId}`, 'profile');
    const inviterName = inviterProfile?.name || 'Unknown';

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const ttl = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);

    const invitationItem = {
      pk: `invitation#${email}`,
      sk: `team#${teamId}`,
      GSI1PK: `team#${teamId}`,
      GSI1SK: `invitation#${email}`,
      email,
      teamId,
      teamName: team.name,
      role,
      invitedBy: userId,
      inviterName,
      status: 'pending',
      expiresAt,
      ttl,
      createdAt: now
    };

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(invitationItem),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));

    await eventBridge.send(new PutEventsCommand({
      Entries: [
        {
          Source: 'nullcheck',
          DetailType: 'Team Member Added',
          Detail: JSON.stringify({
            teamId,
            teamName: team.name,
            email,
            role,
            invitedBy: userId,
            inviterName,
            invitationType: 'pending',
            invitedAt: now
          })
        }
      ]
    }));

    return formatResponse(201, { message: 'Team member invitation sent successfully' });

  } catch (err) {
    console.error('Error adding team member:', err);
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
