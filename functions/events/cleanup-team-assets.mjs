import { Logger } from '@aws-lambda-powertools/logger';
import { DynamoDBClient, QueryCommand, BatchWriteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { removeNotificationsByInvitation } from '../utils/notifications.mjs';

const logger = new Logger({ serviceName: 'events' });

const ddb = new DynamoDBClient();
const s3 = new S3Client();

const BATCH_SIZE = 25;
const S3_DELETE_BATCH_SIZE = 1000;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

export const handler = async (event) => {
  const startTime = Date.now();
  let progress = {
    teamId: null,
    totalEpisodes: 0,
    processedEpisodes: 0,
    totalS3Objects: 0,
    deletedS3Objects: 0,
    totalDynamoDBRecords: 0,
    deletedDynamoDBRecords: 0,
    errors: []
  };

  try {
    const { teamId } = event.detail;

    if (!teamId) {
      logger.error('Missing teamId in event detail');
      return;
    }

    progress.teamId = teamId;
    logger.info('Starting asset cleanup for team', { teamId });

    const teamKey = `team#${teamId}`;

    const episodeIds = await getAllTeamEpisodes(teamKey);
    progress.totalEpisodes = episodeIds.length;
    logger.info('Found episodes for team', { teamId, episodeCount: episodeIds.length });

    for (const episodeId of episodeIds) {
      try {
        const episodeProgress = await cleanupEpisodeAssets(teamKey, episodeId);
        progress.totalS3Objects += episodeProgress.s3ObjectsFound;
        progress.deletedS3Objects += episodeProgress.s3ObjectsDeleted;
        progress.totalDynamoDBRecords += episodeProgress.dynamoRecordsFound;
        progress.deletedDynamoDBRecords += episodeProgress.dynamoRecordsDeleted;
        progress.processedEpisodes++;

        await publishProgress(progress);
      } catch (err) {
        logger.error('Error cleaning up episode', { episodeId, error: err.message });
        progress.errors.push(`Episode ${episodeId}: ${err.message}`);
      }
    }

    try {
      const membershipProgress = await cleanupTeamMemberships(teamKey);
      progress.totalDynamoDBRecords += membershipProgress.recordsFound;
      progress.deletedDynamoDBRecords += membershipProgress.recordsDeleted;
    } catch (err) {
      logger.error('Error cleaning up team memberships', { error: err.message });
      progress.errors.push(`Team memberships: ${err.message}`);
    }

    try {
      const invitationProgress = await cleanupPendingInvitations(teamId);
      progress.totalDynamoDBRecords += invitationProgress.recordsFound;
      progress.deletedDynamoDBRecords += invitationProgress.recordsDeleted;
    } catch (err) {
      logger.error('Error cleaning up pending invitations', { error: err.message });
      progress.errors.push(`Pending invitations: ${err.message}`);
    }

    try {
      await clearActiveTeamFromUsers(teamId);
    } catch (err) {
      logger.error('Error clearing active team from users', { error: err.message });
      progress.errors.push(`Clear active team: ${err.message}`);
    }

    const duration = Date.now() - startTime;

    logger.info('Asset cleanup completed for team', {
      teamId,
      duration: `${duration}ms`,
      progress
    });

  } catch (err) {
    logger.error('Error during team asset cleanup', {
      error: err.message,
      stack: err.stack,
      teamId: progress.teamId,
      progress,
      timestamp: new Date().toISOString()
    });

    progress.errors.push(`Critical error: ${err.message}`);

    logger.error('Team asset cleanup failed but will not retry to prevent system issues');
    return { statusCode: 500 };
  }
};

const getAllTeamEpisodes = async (teamKey) => {
  const episodeIds = [];
  let lastEvaluatedKey = null;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: marshall({
        ':gsi1pk': `${teamKey}#episode`
      }),
      ProjectionExpression: 'pk'
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items) {
      for (const item of response.Items) {
        const episode = unmarshall(item);
        const episodeId = episode.pk.split('#')[2];
        if (episodeId) {
          episodeIds.push(episodeId);
        }
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return episodeIds;
};

const cleanupEpisodeAssets = async (teamKey, episodeId) => {
  logger.info('Cleaning up assets for episode', { episodeId });

  const episodePk = `${teamKey}#${episodeId}`;
  const progress = {
    s3ObjectsFound: 0,
    s3ObjectsDeleted: 0,
    dynamoRecordsFound: 0,
    dynamoRecordsDeleted: 0
  };

  const allRecords = await getAllEpisodeRecords(episodePk);
  progress.dynamoRecordsFound = allRecords.length;
  logger.info('Found records for episode', { episodeId, recordCount: allRecords.length });

  const s3Objects = await getAllEpisodeS3Objects(teamKey, episodeId, allRecords);
  progress.s3ObjectsFound = s3Objects.length;
  logger.info('Found S3 objects for episode', { episodeId, objectCount: s3Objects.length });

  if (s3Objects.length > 0) {
    progress.s3ObjectsDeleted = await deleteS3ObjectsWithRetry(s3Objects);
  }

  if (allRecords.length > 0) {
    progress.dynamoRecordsDeleted = await deleteDynamoDBRecordsWithRetry(allRecords);
  }

  return progress;
};

const getAllEpisodeRecords = async (episodePk) => {
  const records = [];
  let lastEvaluatedKey = null;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk',
      ExpressionAttributeValues: marshall({
        ':pk': episodePk
      })
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items) {
      records.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return records;
};

const getAllEpisodeS3Objects = async (teamKey, episodeId, records) => {
  const s3Objects = [];
  const teamId = teamKey.replace('team#', '');

  const episodePrefix = `${teamId}/${episodeId}/`;

  try {
    let continuationToken = null;

    do {
      const listParams = {
        Bucket: process.env.BUCKET_NAME,
        Prefix: episodePrefix
      };

      if (continuationToken) {
        listParams.ContinuationToken = continuationToken;
      }

      const response = await s3.send(new ListObjectsV2Command(listParams));

      if (response.Contents) {
        s3Objects.push(...response.Contents.map(obj => ({ Key: obj.Key })));
      }

      continuationToken = response.NextContinuationToken;
    } while (continuationToken);

  } catch (err) {
    logger.warn('Error listing S3 objects for episode', { episodeId, error: err.message });
  }

  for (const record of records) {
    const item = unmarshall(record);
    if (item.s3Key) {
      s3Objects.push({ Key: item.s3Key });
    }

    if (item.processingResults?.chunks) {
      for (const chunk of item.processingResults.chunks) {
        if (chunk.s3Key) {
          s3Objects.push({ Key: chunk.s3Key });
        }
      }
    }
  }

  const uniqueObjects = s3Objects.filter((obj, index, self) =>
    index === self.findIndex(o => o.Key === obj.Key)
  );

  return uniqueObjects;
};

const deleteS3ObjectsWithRetry = async (objects) => {
  if (objects.length === 0) return 0;

  let totalDeleted = 0;
  const batches = [];

  for (let i = 0; i < objects.length; i += S3_DELETE_BATCH_SIZE) {
    batches.push(objects.slice(i, i + S3_DELETE_BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let retryCount = 0;
    let success = false;

    while (retryCount < MAX_RETRIES && !success) {
      try {
        const response = await s3.send(new DeleteObjectsCommand({
          Bucket: process.env.BUCKET_NAME,
          Delete: {
            Objects: batch,
            Quiet: false
          }
        }));

        const deletedCount = response.Deleted ? response.Deleted.length : batch.length;
        totalDeleted += deletedCount;

        if (response.Errors && response.Errors.length > 0) {
          logger.warn('S3 batch had errors', { batchIndex: batchIndex + 1, errorCount: response.Errors.length, errors: response.Errors });
        }

        logger.info('Deleted S3 objects', { deletedCount, batchIndex: batchIndex + 1, totalBatches: batches.length });
        success = true;

      } catch (err) {
        retryCount++;
        logger.error('Error deleting S3 objects batch', { batchIndex: batchIndex + 1, attempt: retryCount, error: err.message });

        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          logger.info('Retrying S3 batch', { batchIndex: batchIndex + 1, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error('Failed to delete S3 batch after max retries', { batchIndex: batchIndex + 1, maxRetries: MAX_RETRIES });
        }
      }
    }
  }

  return totalDeleted;
};

const deleteDynamoDBRecordsWithRetry = async (records) => {
  if (records.length === 0) return 0;

  let totalDeleted = 0;
  const batches = [];

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    batches.push(records.slice(i, i + BATCH_SIZE));
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex];
    let currentBatch = batch;
    let retryCount = 0;

    while (currentBatch.length > 0 && retryCount < MAX_RETRIES) {
      const deleteRequests = currentBatch.map(record => {
        const item = unmarshall(record);
        return {
          DeleteRequest: {
            Key: marshall({
              pk: item.pk,
              sk: item.sk
            })
          }
        };
      });

      try {
        const response = await ddb.send(new BatchWriteItemCommand({
          RequestItems: {
            [process.env.TABLE_NAME]: deleteRequests
          }
        }));

        const processedCount = currentBatch.length;
        totalDeleted += processedCount;

        if (response.UnprocessedItems && response.UnprocessedItems[process.env.TABLE_NAME]) {
          const unprocessedRequests = response.UnprocessedItems[process.env.TABLE_NAME];
          logger.warn('DynamoDB batch has unprocessed items', { batchIndex: batchIndex + 1, unprocessedCount: unprocessedRequests.length });

          currentBatch = unprocessedRequests.map(req => {
            const key = unmarshall(req.DeleteRequest.Key);
            return marshall(key);
          });

          retryCount++;
          if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
            logger.info('Retrying DynamoDB batch with unprocessed items', { batchIndex: batchIndex + 1, itemCount: currentBatch.length, delay });
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          currentBatch = [];
          logger.info('Deleted DynamoDB records', { processedCount, batchIndex: batchIndex + 1, totalBatches: batches.length });
        }

      } catch (err) {
        retryCount++;
        logger.error('Error deleting DynamoDB records batch', { batchIndex: batchIndex + 1, attempt: retryCount, error: err.message });

        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          logger.info('Retrying DynamoDB batch', { batchIndex: batchIndex + 1, delay });
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          logger.error('Failed to delete DynamoDB batch after max retries', { batchIndex: batchIndex + 1, maxRetries: MAX_RETRIES });
          currentBatch = [];
        }
      }
    }
  }

  return totalDeleted;
};

const cleanupTeamMemberships = async (teamKey) => {
  logger.info('Cleaning up team memberships', { teamKey });

  const memberships = [];
  let lastEvaluatedKey = null;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: marshall({
        ':pk': teamKey,
        ':sk': 'user#'
      })
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items) {
      memberships.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  const progress = {
    recordsFound: memberships.length,
    recordsDeleted: 0
  };

  if (memberships.length > 0) {
    progress.recordsDeleted = await deleteDynamoDBRecordsWithRetry(memberships);
    logger.info('Deleted team membership records', { deletedCount: progress.recordsDeleted });
  }

  return progress;
};

const cleanupPendingInvitations = async (teamId) => {
  logger.info('Cleaning up pending invitations for team', { teamId });

  const invitations = [];
  let lastEvaluatedKey = null;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk AND begins_with(GSI1SK, :gsi1sk)',
      ExpressionAttributeValues: marshall({
        ':gsi1pk': `team#${teamId}`,
        ':gsi1sk': 'invitation#'
      })
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items) {
      invitations.push(...response.Items);
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  const progress = {
    recordsFound: invitations.length,
    recordsDeleted: 0
  };

  if (invitations.length > 0) {
    // Clean up associated notifications before deleting invitations
    for (const invitationItem of invitations) {
      const invitation = unmarshall(invitationItem);
      if (invitation.invitedUserId && invitation.id) {
        try {
          await removeNotificationsByInvitation(invitation.invitedUserId, invitation.id);
        } catch (error) {
          logger.error('Failed to clean up notifications for invitation', { invitationId: invitation.id, error: error.message });
          // Continue with cleanup even if notification removal fails
        }
      }
    }

    progress.recordsDeleted = await deleteDynamoDBRecordsWithRetry(invitations);
    logger.info('Deleted pending invitation records', { deletedCount: progress.recordsDeleted });
  }

  return progress;
};

const clearActiveTeamFromUsers = async (teamId) => {
  logger.info('Clearing active team from user profiles for team', { teamId });

  const users = [];
  let lastEvaluatedKey = null;

  do {
    const queryParams = {
      TableName: process.env.TABLE_NAME,
      IndexName: 'GSI1',
      KeyConditionExpression: 'GSI1PK = :gsi1pk',
      ExpressionAttributeValues: marshall({
        ':gsi1pk': 'users'
      }),
      ProjectionExpression: 'pk, sk, activeTeamId'
    };

    if (lastEvaluatedKey) {
      queryParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const response = await ddb.send(new QueryCommand(queryParams));

    if (response.Items) {
      for (const item of response.Items) {
        const user = unmarshall(item);
        if (user.activeTeamId === teamId) {
          users.push(user);
        }
      }
    }

    lastEvaluatedKey = response.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  for (const user of users) {
    try {
      await ddb.send(new UpdateItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: marshall({
          pk: user.pk,
          sk: user.sk
        }),
        UpdateExpression: 'REMOVE activeTeamId SET updatedAt = :updatedAt',
        ExpressionAttributeValues: marshall({
          ':updatedAt': new Date().toISOString()
        })
      }));
    } catch (err) {
      logger.error('Error clearing active team for user', { userPk: user.pk, error: err.message });
    }
  }

  if (users.length > 0) {
    logger.info('Cleared active team from user profiles', { userCount: users.length });
  }
};

const publishProgress = async (progress) => {
  try {
    logger.info('Cleanup progress', {
      teamId: progress.teamId,
      episodesProgress: `${progress.processedEpisodes}/${progress.totalEpisodes}`,
      s3ObjectsProgress: `${progress.deletedS3Objects}/${progress.totalS3Objects}`,
      dynamoRecordsProgress: `${progress.deletedDynamoDBRecords}/${progress.totalDynamoDBRecords}`,
      errorCount: progress.errors.length
    });
  } catch (err) {
    logger.error('Error publishing progress', { error: err.message });
  }
};
