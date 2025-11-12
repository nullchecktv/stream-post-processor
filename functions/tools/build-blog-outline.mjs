import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';
import { marshall } from '@aws-sdk/util-dynamodb';

const logger = new Logger({ serviceName: 'tools' });
const ddb = new DynamoDBClient();
const eventBridge = new EventBridgeClient();

export const buildBlogOutlineTool = {
  isMultiTenant: true,
  name: 'buildBlogOutline',
  description: 'Creates and stores a structured markdown outline for a blog post based on episode content',
  schema: z.object({
    episodeId: z.string().uuid().describe('The episode ID for which to create the blog outline'),
    outline: z.string().min(50).describe('Markdown formatted outline with sections and key points')
  }),
  handler: async (context, { episodeId, outline }) => {
    try {
      const { tenantId, userId } = context;

      if (!tenantId) {
        logger.error('Missing tenantId in tool handler', {
          episodeId
        });
        return 'Unauthorized: Missing tenant context';
      }

      const now = new Date().toISOString();

      const outlineItem = {
        pk: `${tenantId}#${episodeId}`,
        sk: 'data#blog#outline',
        outline,
        status: 'outline_created',
        createdAt: now,
        updatedAt: now
      };

      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(outlineItem)
      }));

      try {
        await eventBridge.send(new PutEventsCommand({
          Entries: [
            {
              Source: 'nullcheck',
              DetailType: 'BlogOutlineCreated',
              Detail: JSON.stringify({
                episodeId,
                tenantId,
                userId,
                timestamp: now
              })
            }
          ]
        }));
      } catch (error_) {
        logger.error('Failed to publish BlogOutlineCreated event', {
          error: error_.message,
          stack: error_.stack,
          episodeId,
          tenantId
        });
      }

      logger.info('Created blog outline for episode', {
        episodeId,
        tenantId,
        outlineLength: outline.length
      });

      return `Successfully created blog outline for episode ${episodeId}. The outline has been stored and content generation will begin automatically.`;
    } catch (err) {
      logger.error('Error creating blog outline', {
        error: err.message,
        stack: err.stack,
        episodeId,
        tenantId: context?.tenantId
      });
      return 'Something went wrong while creating blog outline';
    }
  }
};
