import { DynamoDBClient, PutItemCommand, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters, requireTeamMember, requireTeamExists, checkExists } from '../utils/validation.mjs';
import { TeamSchemas } from '../utils/schemas.mjs';
import { createTeamInvitationNotification } from '../utils/notifications.mjs';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();
const logger = new Logger({ serviceName: 'teams' });

const findUserByEmail = async (email) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: marshall({
        ':pk': 'users',
        ':email': email.toLowerCase()
      })
    }));

    return result.Items && result.Items.length > 0 ? unmarshall(result.Items[0]) : null;
  } catch (error) {
    logger.error('Error finding user by email', {
      error: error.message,
      stack: error.stack,
      email
    });
    return null;
  }
};

const checkExistingInvitation = async (email, teamId) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :pk',
      FilterExpression: 'email = :email AND #status = :status',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':pk': `team#${teamId}`,
        ':email': email.toLowerCase(),
        ':status': 'pending'
      })
    }));

    return result.Items && result.Items.length > 0 ? unmarshall(result.Items[0]) : null;
  } catch (error) {
    logger.error('Error checking existing invitation', {
      error: error.message,
      stack: error.stack,
      email,
      teamId
    });
    return null;
  }
};

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, TeamSchemas.pathParameters);
    if (!pathValidation.success) return pathValidation.error;

    const { teamId } = pathValidation.data;

    const bodyValidation = await validateRequest(event, TeamSchemas.addMember);
    if (!bodyValidation.success) return bodyValidation.error;

    const { tenantId, userId, data } = bodyValidation;
    const email = data.email.toLowerCase();
    const role = data.role || 'member';

    const teamCheck = await requireTeamExists(teamId);
    if (teamCheck.error) return teamCheck.error;
    const { team } = teamCheck;

    const memberCheck = await requireTeamMember(teamId, userId, 'administrator');
    if (memberCheck.error) return memberCheck.error;

    // Check for existing pending invitations for this email and team
    const existingInvitation = await checkExistingInvitation(email, teamId);
    if (existingInvitation) {
      return formatResponse(409, { message: 'User already has a pending invitation to this team' });
    }

    // Check if user exists by email
    const existingUser = await findUserByEmail(email);

    const inviterProfile = await checkExists(`user#${userId}`, 'profile');
    const inviterName = inviterProfile?.name || 'Unknown';

    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days for invitations
    const ttl = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60);
    const invitationId = randomUUID();

    const invitationType = existingUser ? 'existing_user' : 'new_user';
    let notificationId = null;

    const invitationItem = {
      pk: `invitation#${invitationId}`,
      sk: 'metadata',
      GSI1PK: `team#${teamId}`,
      GSI1SK: `invitation#${invitationId}`,
      id: invitationId,
      email,
      teamId,
      teamName: team.name,
      role,
      invitedBy: userId,
      inviterName,
      status: 'pending',
      type: invitationType,
      expiresAt,
      ttl,
      createdAt: now
    };

    // Add invitedUserId for existing users
    if (existingUser) {
      invitationItem.invitedUserId = existingUser.pk.replace('user#', '');
    }

    await ddb.send(new PutItemCommand({
      TableName: process.env.TABLE_NAME,
      Item: marshall(invitationItem),
      ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
    }));



    // Create in-app notification for existing users
    if (existingUser) {
      try {
        const notification = await createTeamInvitationNotification(
          existingUser.pk.replace('user#', ''),
          teamId,
          team.name,
          inviterName,
          invitationId
        );
        notificationId = notification.id;

        // Update invitation with notification ID
        await ddb.send(new UpdateItemCommand({
          TableName: process.env.TABLE_NAME,
          Key: marshall({
            pk: `invitation#${invitationId}`,
            sk: 'metadata'
          }),
          UpdateExpression: 'SET notificationId = :notificationId',
          ExpressionAttributeValues: marshall({
            ':notificationId': notificationId
          }),
          ConditionExpression: 'attribute_exists(pk) AND attribute_exists(sk)'
        }));
      } catch (error) {
        logger.error('Failed to create invitation notification', {
          error: error.message,
          stack: error.stack,
          invitationId,
          teamId,
          userId: existingUser.pk.replace('user#', '')
        });
        // Continue with invitation even if notification fails
      }
    }

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
            invitationType,
            invitationId,
            notificationId,
            invitedAt: now
          })
        }
      ]
    }));

    return formatResponse(201, {
      message: 'Team member invitation sent successfully',
      invitationType,
      invitationId
    });

  } catch (err) {
    logger.error('Error adding team member', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
