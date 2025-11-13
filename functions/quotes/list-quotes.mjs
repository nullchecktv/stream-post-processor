import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse, getPagingParams, buildPagingParams } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { EpisodePathParamsSchema } from '../../schemas/index.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, EpisodePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId } = pathValidation.data;
    const { limit, nextToken } = getPagingParams(event);

    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      Limit: limit,
      ...(nextToken && { ExclusiveStartKey: nextToken }),
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': `${tenantId}#${episodeId}`,
        ':sk': 'data#quote#'
      })
    }));

    if (!result.Items || result.Items.length === 0) {
      return formatResponse(200, buildPagingParams([], null));
    }

    const quotes = result.Items.map((item) => {
      const quote = unmarshall(item);

      return {
        id: quote.quoteId,
        text: quote.text,
        speaker: quote.speaker,
        status: quote.status,
        timestamp: quote.timestamp,
        relevanceScore: quote.relevanceScore || 0,
        createdAt: quote.createdAt,
        updatedAt: quote.updatedAt
      };
    });

    return formatResponse(200, buildPagingParams(quotes, result.LastEvaluatedKey));

  } catch (err) {
    logger.error('Error listing quotes', {
      error: err.message,
      stack: err.stack,
      episodeId: event?.pathParameters?.episodeId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
