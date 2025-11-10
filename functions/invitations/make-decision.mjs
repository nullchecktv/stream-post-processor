import { DynamoDBClient, GetItemCommand, UpdateItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from '../utils/api.mjs';
import { validateRequest, validatePathParameters } from '../utils/validation.mjs';
import { removeNotificationsByInvitation } from '../utils/notifications.mjs';
import { randomUUID } from 'crypto';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'invitations' });

const InvitationDecisionSchemas = {
  pathParameters: {
    type: 'object',
    properties: {
      invitationId: { type: 'string', minLength: 1 }
    },
    required: ['invitationId'],
    additionalProperties: false
  },
  body: {
    type: 'object',
    properties: {
      action: { enum: ['accept', 'reject'] }
    },
    required: ['action'],
    additionalProperties: false
  }
};

export const handler = async (event) => {
  try {
    const pathValidation = await validatePathParameters(event, InvitationDecisionSchemas.pathParameters);
    if (!pathValidation.success) return pathValidation.error;

    const { invitationId } = pathValidation.data;

    const bodyValidation = await validateRequest(event, InvitationDecisionSchemas.body);
    if (!bodyValidation.success) return bodyValidation.error;

    const { tenantId, userId, data } = bodyValidation;
    const { action } = data;

    // Get the invitation
    const invitationResponse = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `invitation#${invitationId}`,
        sk: 'metadata'
      })
    }));

    if (!invitationResponse.Item) {
      return formatResponse(404, { message: 'Invitation not found' });
    }

    const invitation = unmarshall(invitationResponse.Item);

    // Validate invitation ownership for existing users
    if (invitation.type === 'existing_user') {
      if (invitation.invitedUserId !== userId) {
        return formatResponse(403, { message: 'Not authorized to act on this invitation' });
      }
    } else {
      // For new users, we would need to validate by email during signup
      // For now, we'll allow any authenticated user to act on new_user invitations
      // This should be enhanced with proper email verification
    }

    // Check if invitation is still valid
    if (invitation.status !== 'pending') {
      return formatResponse(409, { message: `Invitation has already been ${invitation.status}` });
    }

    // Check if invitation has expired
    const now = new Date();
    const expiresAt = new Date(invitation.expiresAt);
    if (now > expiresAt) {
      // Clean up expired invitation notifications
      if (invitation.notificationId && invitation.invitedUserId) {
        try {
          await removeNotificationsByInvitation(invitation.invitedUserId, invitationId);
        } catch (error) {
          logger.error('Failed to clean up expired invitation notifications', {
            error: error.message,
            stack: error.stack,
            invitationId,
            invitedUserId: invitation.invitedUserId
          });
        }
      }

      return formatResponse(410, { message: 'Invitation has expired' });
    }

    const updateTime = new Date().toISOString();

    if (action === 'accept') {
      // Get user profile for denormalized data
      const userProfileResponse = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `user#${userId}`,
          sk: 'profile'
        })
      }));

      const userProfile = userProfileResponse.Item ? unmarshall(userProfileResponse.Item) : null;

      // Update invitation status
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata'
        }),
        UpdateExpression: 'SET #status = :status, acceptedAt = :acceptedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': 'accepted',
          ':acceptedAt': updateTime,
          ':pendingStatus': 'pending'
        }),
        ConditionExpression: '#status = :pendingStatus'
      }));

      // Create team membership with denormalized user data
      const membershipId = randomUUID();
      const membership = {
        pk: `team#${invitation.teamId}`,
        sk: `user#${userId}`,
        GSI1PK: `user#${userId}#teams`,
        GSI1SK: `team#${invitation.teamId}`,
        id: membershipId,
        teamId: invitation.teamId,
        userId,
        email: userProfile?.email || invitation.email,
        name: userProfile?.name,
        role: invitation.role,
        status: 'active',
        joinedAt: updateTime,
        createdAt: updateTime
      };

      try {
        await ddb.send(new PutItemCommand({
          TableName: process.env.TABLE_NAME,
          Item: marshall(membership, { removeUndefinedValues: true }),
          ConditionExpression: 'attribute_not_exists(pk) AND attribute_not_exists(sk)'
        }));
      } catch (error) {
        if (error.name === 'ConditionalCheckFailedException') {
          return formatResponse(409, { message: 'User is already a member of this team' });
        }
        throw error; // Re-throw other errors
      }

      // Remove associated notifications
      if (invitation.notificationId) {
        try {
          await removeNotificationsByInvitation(userId, invitationId);
        } catch (error) {
          logger.error('Failed to clean up invitation notifications', {
            error: error.message,
            stack: error.stack,
            invitationId,
            userId,
            action: 'accept'
          });
          // Continue even if notification cleanup fails
        }
      }

      return formatResponse(200, {
        message: 'Invitation accepted successfully',
        teamId: invitation.teamId,
        teamName: invitation.teamName,
        role: invitation.role
      });

    } else if (action === 'reject') {
      // Update invitation status
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `invitation#${invitationId}`,
          sk: 'metadata'
        }),
        UpdateExpression: 'SET #status = :status, rejectedAt = :rejectedAt',
        ExpressionAttributeNames: {
          '#status': 'status'
        },
        ExpressionAttributeValues: marshall({
          ':status': 'rejected',
          ':rejectedAt': updateTime,
          ':pendingStatus': 'pending'
        }),
        ConditionExpression: '#status = :pendingStatus'
      }));

      // Remove associated notifications
      if (invitation.notificationId) {
        try {
          await removeNotificationsByInvitation(userId, invitationId);
        } catch (error) {
          logger.error('Failed to clean up invitation notifications', {
            error: error.message,
            stack: error.stack,
            invitationId,
            userId,
            action: 'reject'
          });
          // Continue even if notification cleanup fails
        }
      }

      return formatResponse(200, {
        message: 'Invitation rejected successfully'
      });
    }

  } catch (err) {
    logger.error('Error processing invitation decision', {
      error: err.message,
      stack: err.stack,
      name: err.name
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
