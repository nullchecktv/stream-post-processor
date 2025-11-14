import { Logger } from '@aws-lambda-powertools/logger';
import { AuthClient, CredentialProvider, ExpiresIn, TopicRole } from '@gomomento/sdk';

const logger = new Logger({ serviceName: 'momento' });
const authClient = new AuthClient({ credentialProvider: CredentialProvider.fromEnvironmentVariable('MOMENTO_API_KEY') });

export const generateMomentoToken = async (userId, teams) => {
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

    const tokenResponse = await authClient.generateDisposableToken({ permissions },
      ExpiresIn.minutes(15), { userId }
    );

    if (tokenResponse.type === 'Success') {
      return tokenResponse.authToken;
    }

    logger.error('Failed to generate Momento token', {
      userId,
      errorType: tokenResponse.type
    });
    return null;
  } catch (err) {
    logger.error('Error generating Momento token', {
      error: err.message,
      stack: err.stack,
      userId
    });
    return null;
  }
};
