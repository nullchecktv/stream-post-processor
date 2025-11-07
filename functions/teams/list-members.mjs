import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse, getPagingParams, buildPagingParams } from '../utils/api.mjs';
import { validateRequest, requireTeamMember } from '../utils/validation.mjs';

const ddb = new DynamoDBClient();
const logger = new Logger({ serviceName: 'teams' });

export const handler = async (event) => {
  try {
    const { teamId } = event.pathParameters;

    const validation = validateRequest(event, {});
    if (validation.error) return validation.error;

    const { userId } = validation;

    const { limit, nextToken } = getPagingParams(event);

    const memberCheck = await requireTeamMember(teamId, userId);
    if (memberCheck.error) return memberCheck.error;
    const { membership } = memberCheck;

    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `team#${teamId}`,
        ':sk': 'user#'
      }),
      Limit: limit,
      ...nextToken && { ExclusiveStartKey: marshall(nextToken) }
    };

    const membersResponse = await ddb.send(new QueryCommand(queryParams));

    const members = membersResponse.Items?.map(item => {
      const member = unmarshall(item);
      return {
        userId: member.userId,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt
      };
    }).filter(member => member.status === 'active') || [];

    let pendingInvitations = [];

    if (['owner', 'administrator'].includes(membership.role)) {
      const invitationsResponse = await ddb.send(new QueryCommand({
        TableName: process.env.TABLE_NAME,
        IndexName: 'GSI1',
        KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
        ExpressionAttributeValues: marshall({
          ':gsi1pk': `team#${teamId}`,
          ':gsi1sk': 'invitation#'
        })
      }));

      pendingInvitations = invitationsResponse.Items?.map(item => {
        const invitation = unmarshall(item);
        return {
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          invitedBy: invitation.invitedBy,
          expiresAt: invitation.expiresAt,
          createdAt: invitation.createdAt
        };
      }) || [];
    }

    const response = buildPagingParams(members, membersResponse.LastEvaluatedKey);

    // Rename 'items' to 'members' for this specific endpoint
    response.members = response.items;
    delete response.items;

    if (['owner', 'administrator'].includes(membership.role)) {
      response.pendingInvitations = pendingInvitations;
    }

    return formatResponse(200, response);

  } catch (err) {
    logger.error('Error listing team members', {
      error: err.message,
      stack: err.stack,
      teamId: event.pathParameters?.teamId,
      userId: event.requestContext?.authorizer?.userId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
