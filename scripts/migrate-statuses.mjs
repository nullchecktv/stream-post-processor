import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME || 'NullCheckTable';
const DRY_RUN = process.env.DRY_RUN === 'true';

const STATUS_MAPPINGS = {
  episodes: {
    'draft': 'Draft',
    'plan_added': 'Planning',
    'Ready for Clip Gen': 'Ready',
    'processing': 'Processing',
    'published': 'Published',
    'archived': 'Archived'
  },
  clips: {
    'detected': 'Proposed',
    'processing': 'Processing',
    'created': 'Created',
    'failed': 'Failed',
    'reviewed': 'Created',
    'approved': 'Created',
    'rejected': 'Failed',
    'published': 'Created'
  },
  quotes: {
    'proposed': 'Proposed',
    'created': 'Created',
    'failed': 'Failed',
    'approved': 'Edited',
    'rejected': 'Failed',
    'processing': 'Processing'
  },
  blogs: {
    'outline_created': 'Proposed',
    'content_generating': 'Processing',
    'content_generated': 'Created',
    'outline_edited': 'Edited',
    'content_edited': 'Edited',
    'regenerating': 'Processing',
    'failed': 'Failed'
  },
  tracks: {
    'uploading': 'Uploading',
    'uploaded': 'Uploaded',
    'processing': 'Processing',
    'processed': 'Processed',
    'failed': 'Failed'
  },
  teams: {
    'active': 'Active',
    'archived': 'Archived'
  },
  memberships: {
    'active': 'Active',
    'pending': 'Pending',
    'removed': 'Removed'
  },
  invitations: {
    'pending': 'Pending',
    'accepted': 'Accepted',
    'declined': 'Declined',
    'cancelled': 'Cancelled',
    'expired': 'Expired'
  }
};

const migrateStatusHistory = (statusHistory, mapping) => {
  if (!statusHistory || !Array.isArray(statusHistory)) {
    return statusHistory;
  }

  return statusHistory.map(entry => ({
    ...entry,
    status: mapping[entry.status] || entry.status
  }));
};

const detectEntityType = (item) => {
  if (item.sk === 'metadata' && item.episodeId) {
    return 'episodes';
  }
  if (item.sk?.startsWith('data#clip#')) {
    return 'clips';
  }
  if (item.sk?.startsWith('data#quote#')) {
    return 'quotes';
  }
  if (item.sk?.startsWith('data#track#')) {
    return 'tracks';
  }
  if (item.sk?.startsWith('data#blog#')) {
    return 'blogs';
  }
  if (item.sk === 'metadata' && item.teamId) {
    return 'teams';
  }
  if (item.sk?.startsWith('member#')) {
    return 'memberships';
  }
  if (item.sk?.startsWith('invitation#')) {
    return 'invitations';
  }
  return null;
};

const migrateItem = async (item) => {
  const entityType = detectEntityType(item);

  if (!entityType || !item.status) {
    return null;
  }

  const mapping = STATUS_MAPPINGS[entityType];
  if (!mapping) {
    return null;
  }

  const oldStatus = item.status;
  const newStatus = mapping[oldStatus];

  if (!newStatus || oldStatus === newStatus) {
    return null;
  }

  const updates = {
    status: newStatus,
    updatedAt: new Date().toISOString()
  };

  if (item.statusHistory) {
    updates.statusHistory = migrateStatusHistory(item.statusHistory, mapping);
  }

  return {
    pk: item.pk,
    sk: item.sk,
    entityType,
    oldStatus,
    newStatus,
    updates
  };
};

const updateItem = async (pk, sk, updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.entries(updates).forEach(([key, value], index) => {
    const nameKey = `#attr${index}`;
    const valueKey = `:val${index}`;
    updateExpressions.push(`${nameKey} = ${valueKey}`);
    expressionAttributeNames[nameKey] = key;
    expressionAttributeValues[valueKey] = value;
  });

  const params = {
    TableName: TABLE_NAME,
    Key: { pk, sk },
    UpdateExpression: `SET ${updateExpressions.join(', ')}`,
    ExpressionAttributeNames: expressionAttributeNames,
    ExpressionAttributeValues: expressionAttributeValues
  };

  if (!DRY_RUN) {
    await docClient.send(new UpdateCommand(params));
  }
};

const scanAndMigrate = async () => {
  console.log(`Starting status migration for table: ${TABLE_NAME}`);
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
  console.log('---');

  const stats = {
    scanned: 0,
    migrated: 0,
    skipped: 0,
    errors: 0,
    byEntityType: {}
  };

  let lastEvaluatedKey = null;

  do {
    const scanParams = {
      TableName: TABLE_NAME,
      FilterExpression: 'attribute_exists(#status)',
      ExpressionAttributeNames: {
        '#status': 'status'
      }
    };

    if (lastEvaluatedKey) {
      scanParams.ExclusiveStartKey = lastEvaluatedKey;
    }

    const result = await docClient.send(new ScanCommand(scanParams));

    for (const item of result.Items || []) {
      stats.scanned++;

      try {
        const migration = await migrateItem(item);

        if (migration) {
          console.log(`[${migration.entityType}] ${migration.pk}#${migration.sk}`);
          console.log(`  Status: ${migration.oldStatus} → ${migration.newStatus}`);

          await updateItem(migration.pk, migration.sk, migration.updates);

          stats.migrated++;
          stats.byEntityType[migration.entityType] = (stats.byEntityType[migration.entityType] || 0) + 1;
        } else {
          stats.skipped++;
        }
      } catch (error) {
        console.error(`Error migrating item ${item.pk}#${item.sk}:`, error.message);
        stats.errors++;
      }
    }

    lastEvaluatedKey = result.LastEvaluatedKey;

    console.log(`Progress: Scanned ${stats.scanned}, Migrated ${stats.migrated}, Skipped ${stats.skipped}, Errors ${stats.errors}`);

  } while (lastEvaluatedKey);

  console.log('---');
  console.log('Migration complete!');
  console.log(`Total items scanned: ${stats.scanned}`);
  console.log(`Total items migrated: ${stats.migrated}`);
  console.log(`Total items skipped: ${stats.skipped}`);
  console.log(`Total errors: ${stats.errors}`);
  console.log('\nMigrations by entity type:');
  Object.entries(stats.byEntityType).forEach(([type, count]) => {
    console.log(`  ${type}: ${count}`);
  });

  if (DRY_RUN) {
    console.log('\n⚠️  This was a DRY RUN. No changes were made to the database.');
    console.log('To perform the actual migration, run with DRY_RUN=false');
  }
};

const main = async () => {
  try {
    await scanAndMigrate();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
};

main();
