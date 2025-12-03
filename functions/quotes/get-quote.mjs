import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { QuotePathParamsSchema } from '../../schemas/index.mjs';
import { QUOTE_STATUS } from '../utils/quotes.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();
const s3 = new S3Client({ region: process.env.AWS_REGION });

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, QuotePathParamsSchema);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId, quoteId } = pathValidation.data;

    const result = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      })
    }));

    if (!result.Item) {
      return formatResponse(404, { error: 'Quote not found' });
    }

    const quote = unmarshall(result.Item);

    let imageUrl = null;
    if (quote.s3Key && quote.status === QUOTE_STATUS.CREATED) {
      try {
        const command = new GetObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: quote.s3Key
        });
        imageUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });
      } catch (error) {
        logger.warn('Failed to generate presigned URL for quote', {
          quoteId: quote.quoteId,
          s3Key: quote.s3Key,
          error: error.message
        });
      }
    }

    return formatResponse(200, {
      id: quote.quoteId,
      text: quote.text,
      speaker: quote.speaker,
      timestamp: quote.timestamp,
      relevanceScore: quote.relevanceScore || 0,
      status: quote.status,
      showSpeaker: quote.showSpeaker !== undefined ? quote.showSpeaker : true,
      showEpisodeTitle: quote.showEpisodeTitle !== undefined ? quote.showEpisodeTitle : true,
      orientation: quote.orientation || 'landscape',
      imageUrl,
      createdAt: quote.createdAt,
      updatedAt: quote.updatedAt
    });

  } catch (err) {
    logger.error('Error getting quote', {
      error: err.message,
      stack: err.stack,
      episodeId: event?.pathParameters?.episodeId,
      quoteId: event?.pathParameters?.quoteId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
