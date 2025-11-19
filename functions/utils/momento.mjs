import { Logger } from '@aws-lambda-powertools/logger';
import { AuthClient, CredentialProvider, ExpiresIn, TopicRole } from '@gomomento/sdk';

const logger = new Logger({ serviceName: 'momento' });
const authClient = new AuthClient({ credentialProvider: CredentialProvider.fromEnvironmentVariable('MOMENTO_API_KEY') });

export const generateMomentoToken = async (tenantId, userId, teams) => {
  try {
    const permissions = [
      {
        role: TopicRole.SubscribeOnly,
        cache: process.env.MOMENTO_CACHE_NAME,
        topic: userId
      },
      {
        role: TopicRole.SubscribeOnly,
        cache: process.env.MOMENTO_CACHE_NAME,
        topic: `${userId}_tasks`
      }
    ];

    for (const team of teams) {
      permissions.push({
        role: TopicRole.SubscribeOnly,
        cache: process.env.MOMENTO_CACHE_NAME,
        topic: team.teamId
      });

      permissions.push({
        role: TopicRole.SubscribeOnly,
        cache: process.env.MOMENTO_CACHE_NAME,
        topic: `${team.teamId}_tasks`
      });
    }

    logger.info('Generating Momento token', {
      tenantId,
      userId,
      teamsCount: teams.length,
      teamIds: teams.map(t => t.teamId),
      permissionsCount: permissions.length,
      userTopics: [userId, `${userId}_tasks`],
      teamTopics: teams.flatMap(t => [t.teamId, `${t.teamId}_tasks`])
    });

    const tokenResponse = await authClient.generateDisposableToken({ permissions },
      ExpiresIn.minutes(15), { tokenId: userId }
    );

    if (tokenResponse.type === 'Success') {
      return tokenResponse.authToken;
    }

    logger.error('Failed to generate Momento token', {
      tenantId,
      userId,
      errorType: tokenResponse.type
    });
    return null;
  } catch (err) {
    logger.error('Error generating Momento token', {
      error: err.message,
      stack: err.stack,
      tenantId,
      userId
    });
    return null;
  }
};
