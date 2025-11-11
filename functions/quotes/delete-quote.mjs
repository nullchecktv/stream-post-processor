import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, GetItemCommand, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { formatResponse } from '../utils/api.mjs';
import { validatePathParameters } from '../utils/validation.mjs';
import { QuoteSchemas } from '../utils/schemas.mjs';

const logger = new Logger({ serviceName: 'quotes' });
const ddb = new DynamoDBClient();
const s3 = new S3Client();

export const handler = async (event) => {
  try {
    const { tenantId } = event.requestContext.authorizer;

    if (!tenantId) {
      logger.error('Missing tenantId in authorizer context');
      return formatResponse(401, { error: 'Unauthorized' });
    }

    const pathValidation = await validatePathParameters(event, QuoteSchemas.pathParametersWithQuote);
    if (!pathValidation.success) {
      return pathValidation.error;
    }

    const { episodeId, quoteId } = pathValidation.data;

    const getResult = await ddb.send(new GetItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      })
    }));

    if (!getResult.Item) {
      return formatResponse(204);
    }

    const quote = unmarshall(getResult.Item);

    if (quote.s3Key) {
      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: process.env.BUCKET_NAME,
          Key: quote.s3Key
        }));

        logger.info('Deleted quote graphic from S3', {
          quoteId,
          s3Key: quote.s3Key
        });
      } catch (error) {
        logger.warn('Failed to delete quote graphic from S3', {
          error: error.message,
          quoteId,
          s3Key: quote.s3Key
        });
      }
    }

    await ddb.send(new DeleteItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      })
    }));

    return formatResponse(204);

  } catch (err) {
    logger.error('Error deleting quote', {
      error: err.message,
      stack: err.stack,
      episodeId: event.pathParameters?.episodeId,
      quoteId: event.pathParameters?.quoteId
    });
    return formatResponse(500, { message: 'Something went wrong' });
  }
};
