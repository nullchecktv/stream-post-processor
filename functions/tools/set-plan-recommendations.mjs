import { Logger } from '@aws-lambda-powertools/logger';
import { z } from 'zod';
import { DynamoDBClient, GetItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { addStatusEntry } from '../utils/status-history.mjs';

const logger = new Logger({ serviceName: 'tools' });
const ddb = new DynamoDBClient();

export const setPlanRecommendationsTool = {
  isMultiTenant: true,
  name: 'setPlanRecommendations',
  description: 'Store AI-generated recommendations for an episode plan including suggested flow, title, description, and key learning moments',
  schema: z.object({
    episodeId: z.string().describe('The unique identifier of the episode'),
    suggestedFlow: z.string()
      .regex(/^sequenceDiagram/)
      .describe('A Mermaid sequence diagram showing the proposed episode flow (must start with "sequenceDiagram")'),
    proposedTitle: z.string()
      .min(10)
      .max(200)
      .describe('A compelling title for the episode (10-200 characters)'),
    proposedDescription: z.string()
      .min(50)
      .max(1000)
      .describe('A promotional description for the episode (50-1000 characters)'),
    keyLearningMoments: z.array(z.string().min(1))
      .min(1)
      .describe('Array of key learning moments or takeaways from the episode')
  }),
  handler: async (tenantId, { episodeId, suggestedFlow, proposedTitle, proposedDescription, keyLearningMoments }) => {
    try {
      if (!tenantId) {
        logger.error('Missing tenantId in tool handler', { episodeId });
        return 'Unauthorized: Missing tenant context';
      }

      const episodeResult = await ddb.send(new GetItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: `${tenantId}#${episodeId}`,
          sk: 'metadata'
        })
      }));

      if (!episodeResult.Item) {
        logger.error('Episode not found', { episodeId, tenantId });
        return `Episode with ID '${episodeId}' was not found`;
      }

      const episode = unmarshall(episodeResult.Item);
      const now = new Date().toISOString();

      const recommendationsItem = {
        pk: `${tenantId}#${episodeId}`,
        sk: 'recommendations',
        suggestedFlow,
        proposedTitle,
        proposedDescription,
        keyLearningMoments,
        generatedAt: now
      };

      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall(recommendationsItem)
      }));

      const updatedStatusHistory = addStatusEntry(
        episode.statusHistory || [],
        'recommendations_generated',
        now
      );

      await ddb.send(new PutItemCommand({
        TableName: process.env.TABLE_NAME,
        Item: marshall({
          ...episode,
          statusHistory: updatedStatusHistory,
          status: 'recommendations_generated',
          updatedAt: now
        })
      }));

      logger.info('Stored plan recommendations', {
        episodeId,
        tenantId,
        titleLength: proposedTitle.length,
        descriptionLength: proposedDescription.length,
        learningMomentsCount: keyLearningMoments.length
      });

      return `Successfully stored recommendations for episode ${episodeId}`;
    } catch (err) {
      logger.error('Error storing plan recommendations', {
        error: err.message,
        stack: err.stack,
        episodeId,
        tenantId
      });
      return 'Something went wrong while storing recommendations';
    }
  }
};
