import { DynamoDBClient, QueryCommand, BatchWriteItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const handler = async (event) => {
  try {
    const { userAttributes } = event.request;
    const userId = userAttributes.sub;
    const email = userAttributes.email.toLowerCase();

    console.log(`Processing post-confirmation for user ${userId} with email ${email}`);

    const pendingInvitationsResponse = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: marshall({
        ':pk': `invitation#${email}`
      })
    }));

    if (!pendingInvitationsResponse.Items || pendingInvitationsResponse.Items.length === 0) {
      console.log(`No pending invitations found for email ${email}`);
      return event;
    }

    const invitations = pendingInvitationsResponse.Items.map(item => unmarshall(item));
    console.log(`Found ${invitations.length} pending invitations for ${email}`);

    const now = new Date().toISOString();
    const membershipRecords = [];
    const invitationsToDelete = [];
    const eventsToPublish = [];

    for (const invitation of invitations) {
      const membershipRecord = {
        pk: `team#${invitation.teamId}`,
        sk: `user#${userId}`,
        GSI1PK: `user#${userId}#teams`,
        GSI1SK: `${now}#${invitation.teamId}`,
        userId,
        teamId: invitation.teamId,
        role: invitation.role,
        status: 'active',
        invitedBy: invitation.invitedBy,
        joinedAt: now,
        createdAt: now,
        updatedAt: now
      };

      membershipRecords.push({
        PutRequest: {
          Item: marshall(membershipRecord)
        }
      });

      invitationsToDelete.push({
        DeleteRequest: {
          Key: marshall({
            pk: invitation.pk,
            sk: invitation.sk
          })
        }
      });

      eventsToPublish.push({
        Source: 'nullcheck',
        DetailType: 'Team Member Auto-Linked',
        Detail: JSON.stringify({
          userId,
          email,
          teamId: invitation.teamId,
          teamName: invitation.teamName,
          role: invitation.role,
          invitedBy: invitation.invitedBy,
          inviterName: invitation.inviterName,
          linkedAt: now
        })
      });
    }

    const batchWriteRequests = [...membershipRecords, ...invitationsToDelete];

    for (let i = 0; i < batchWriteRequests.length; i += 25) {
      const batch = batchWriteRequests.slice(i, i + 25);
      await ddb.send(new BatchWriteItemCommand({
        RequestItems: {
          [process.env.TABLE_NAME]: batch
        }
      }));
    }

    if (eventsToPublish.length > 0) {
      for (let i = 0; i < eventsToPublish.length; i += 10) {
        const eventBatch = eventsToPublish.slice(i, i + 10);
        await eventBridge.send(new PutEventsCommand({
          Entries: eventBatch
        }));
      }
    }

    console.log(`Successfully auto-linked user ${userId} to ${invitations.length} teams`);

    return event;

  } catch (err) {
    console.error('Error in post-confirmation trigger:', {
      error: err.message,
      stack: err.stack,
      userId: event.request?.userAttributes?.sub,
      email: event.request?.userAttributes?.email,
      timestamp: new Date().toISOString()
    });

    // Don't throw errors in Cognito triggers as it would block user registration
    // Log the error and continue with the registration process
    return event;
  }
};
