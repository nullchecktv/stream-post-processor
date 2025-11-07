import { DynamoDBClient, QueryCommand, BatchWriteItemCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

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
      console.error('Missing teamId in event detail');
      return;
    }

    progress.teamId = teamId;
    console.log(`Starting asset cleanup for team: ${teamId}`);

    const teamKey = `team#${teamId}`;

    const episodeIds = await getAllTeamEpisodes(teamKey);
    progress.totalEpisodes = episodeIds.length;
    console.log(`Found ${episodeIds.length} episodes for team ${teamId}`);

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
        console.error(`Error cleaning up episode ${episodeId}:`, err);
        progress.errors.push(`Episode ${episodeId}: ${err.message}`);
      }
    }

    try {
      const membershipProgress = await cleanupTeamMemberships(teamKey);
      progress.totalDynamoDBRecords += membershipProgress.recordsFound;
      progress.deletedDynamoDBRecords += membershipProgress.recordsDeleted;
    } catch (err) {
      console.error('Error cleaning up team memberships:', err);
      progress.errors.push(`Team memberships: ${err.message}`);
    }

    try {
      const invitationProgress = await cleanupPendingInvitations(teamId);
      progress.totalDynamoDBRecords += invitationProgress.recordsFound;
      progress.deletedDynamoDBRecords += invitationProgress.recordsDeleted;
    } catch (err) {
      console.error('Error cleaning up pending invitations:', err);
      progress.errors.push(`Pending invitations: ${err.message}`);
    }

    try {
      await clearActiveTeamFromUsers(teamId);
    } catch (err) {
      console.error('Error clearing active team from users:', err);
      progress.errors.push(`Clear active team: ${err.message}`);
    }

    const duration = Date.now() - startTime;

    console.log(`Asset cleanup completed for team: ${teamId}`, {
      duration: `${duration}ms`,
      progress
    });

  } catch (err) {
    console.error('Error during team asset cleanup:', {
      error: err.message,
      stack: err.stack,
      teamId: progress.teamId,
      progress,
      timestamp: new Date().toISOString()
    });

    progress.errors.push(`Critical error: ${err.message}`);

    // Don't throw the error to prevent EventBridge retries for permanent failures
    // The cleanup will be marked as failed in metrics but won't block the system
    console.error('Team asset cleanup failed but will not retry to prevent system issues');
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
  console.log(`Cleaning up assets for episode: ${episodeId}`);

  const episodePk = `${teamKey}#${episodeId}`;
  const progress = {
    s3ObjectsFound: 0,
    s3ObjectsDeleted: 0,
    dynamoRecordsFound: 0,
    dynamoRecordsDeleted: 0
  };

  const allRecords = await getAllEpisodeRecords(episodePk);
  progress.dynamoRecordsFound = allRecords.length;
  console.log(`Found ${allRecords.length} records for episode ${episodeId}`);

  const s3Objects = await getAllEpisodeS3Objects(teamKey, episodeId, allRecords);
  progress.s3ObjectsFound = s3Objects.length;
  console.log(`Found ${s3Objects.length} S3 objects for episode ${episodeId}`);

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
    console.warn(`Error listing S3 objects for episode ${episodeId}:`, err);
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
          console.warn(`S3 batch ${batchIndex + 1} had ${response.Errors.length} errors:`, response.Errors);
        }

        console.log(`Deleted ${deletedCount} S3 objects (batch ${batchIndex + 1}/${batches.length})`);
        success = true;

      } catch (err) {
        retryCount++;
        console.error(`Error deleting S3 objects batch ${batchIndex + 1}, attempt ${retryCount}:`, err);

        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`Retrying S3 batch ${batchIndex + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`Failed to delete S3 batch ${batchIndex + 1} after ${MAX_RETRIES} attempts`);
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
          console.warn(`DynamoDB batch ${batchIndex + 1} has ${unprocessedRequests.length} unprocessed items`);

          currentBatch = unprocessedRequests.map(req => {
            const key = unmarshall(req.DeleteRequest.Key);
            return marshall(key);
          });

          retryCount++;
          if (retryCount < MAX_RETRIES) {
            const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
            console.log(`Retrying DynamoDB batch ${batchIndex + 1} with ${currentBatch.length} items in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          currentBatch = [];
          console.log(`Deleted ${processedCount} DynamoDB records (batch ${batchIndex + 1}/${batches.length})`);
        }

      } catch (err) {
        retryCount++;
        console.error(`Error deleting DynamoDB records batch ${batchIndex + 1}, attempt ${retryCount}:`, err);

        if (retryCount < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, retryCount - 1);
          console.log(`Retrying DynamoDB batch ${batchIndex + 1} in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          console.error(`Failed to delete DynamoDB batch ${batchIndex + 1} after ${MAX_RETRIES} attempts`);
          currentBatch = [];
        }
      }
    }
  }

  return totalDeleted;
};

const cleanupTeamMemberships = async (teamKey) => {
  console.log(`Cleaning up team memberships for: ${teamKey}`);

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
    console.log(`Deleted ${progress.recordsDeleted} team membership records`);
  }

  return progress;
};

const cleanupPendingInvitations = async (teamId) => {
  console.log(`Cleaning up pending invitations for team: ${teamId}`);

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
    progress.recordsDeleted = await deleteDynamoDBRecordsWithRetry(invitations);
    console.log(`Deleted ${progress.recordsDeleted} pending invitation records`);
  }

  return progress;
};

const clearActiveTeamFromUsers = async (teamId) => {
  console.log(`Clearing active team from user profiles for team: ${teamId}`);

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
      console.error(`Error clearing active team for user ${user.pk}:`, err);
    }
  }

  if (users.length > 0) {
    console.log(`Cleared active team from ${users.length} user profiles`);
  }
};

const publishProgress = async (progress) => {
  try {
    console.log('Cleanup progress:', {
      teamId: progress.teamId,
      episodesProgress: `${progress.processedEpisodes}/${progress.totalEpisodes}`,
      s3ObjectsProgress: `${progress.deletedS3Objects}/${progress.totalS3Objects}`,
      dynamoRecordsProgress: `${progress.deletedDynamoDBRecords}/${progress.totalDynamoDBRecords}`,
      errorCount: progress.errors.length
    });
  } catch (err) {
    console.error('Error publishing progress:', err);
  }
};
