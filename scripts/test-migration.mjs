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

const testCases = [
  {
    name: 'Episode with draft status',
    item: {
      pk: 'episode-123',
      sk: 'metadata',
      episodeId: 'episode-123',
      status: 'draft',
      statusHistory: [
        { status: 'draft', timestamp: '2025-01-15T10:00:00Z' }
      ]
    },
    expectedType: 'episodes',
    expectedOldStatus: 'draft',
    expectedNewStatus: 'Draft'
  },
  {
    name: 'Clip with detected status',
    item: {
      pk: 'episode-123',
      sk: 'data#clip#clip-456',
      status: 'detected',
      statusHistory: [
        { status: 'detected', timestamp: '2025-01-15T10:00:00Z' }
      ]
    },
    expectedType: 'clips',
    expectedOldStatus: 'detected',
    expectedNewStatus: 'Proposed'
  },
  {
    name: 'Quote with approved status',
    item: {
      pk: 'episode-123',
      sk: 'data#quote#quote-789',
      status: 'approved',
      statusHistory: [
        { status: 'proposed', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'approved', timestamp: '2025-01-15T10:05:00Z' }
      ]
    },
    expectedType: 'quotes',
    expectedOldStatus: 'approved',
    expectedNewStatus: 'Edited'
  },
  {
    name: 'Track with uploading status',
    item: {
      pk: 'episode-123',
      sk: 'data#track#main',
      status: 'uploading'
    },
    expectedType: 'tracks',
    expectedOldStatus: 'uploading',
    expectedNewStatus: 'Uploading'
  },
  {
    name: 'Team with active status',
    item: {
      pk: 'team#team-123',
      sk: 'metadata',
      teamId: 'team-123',
      status: 'active'
    },
    expectedType: 'teams',
    expectedOldStatus: 'active',
    expectedNewStatus: 'Active'
  },
  {
    name: 'Membership with pending status',
    item: {
      pk: 'team#team-123',
      sk: 'member#user-456',
      status: 'pending'
    },
    expectedType: 'memberships',
    expectedOldStatus: 'pending',
    expectedNewStatus: 'Pending'
  },
  {
    name: 'Invitation with pending status',
    item: {
      pk: 'team#team-123',
      sk: 'invitation#user@example.com',
      status: 'pending'
    },
    expectedType: 'invitations',
    expectedOldStatus: 'pending',
    expectedNewStatus: 'Pending'
  },
  {
    name: 'Blog with outline_created status',
    item: {
      pk: 'episode-123',
      sk: 'data#blog#blog-999',
      status: 'outline_created'
    },
    expectedType: 'blogs',
    expectedOldStatus: 'outline_created',
    expectedNewStatus: 'Proposed'
  }
];

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

const migrateStatusHistory = (statusHistory, mapping) => {
  if (!statusHistory || !Array.isArray(statusHistory)) {
    return statusHistory;
  }

  return statusHistory.map(entry => ({
    ...entry,
    status: mapping[entry.status] || entry.status
  }));
};

console.log('Testing migration logic...\n');

let passed = 0;
let failed = 0;

for (const testCase of testCases) {
  const entityType = detectEntityType(testCase.item);
  const mapping = STATUS_MAPPINGS[entityType];
  const oldStatus = testCase.item.status;
  const newStatus = mapping?.[oldStatus];

  const typeMatch = entityType === testCase.expectedType;
  const oldStatusMatch = oldStatus === testCase.expectedOldStatus;
  const newStatusMatch = newStatus === testCase.expectedNewStatus;

  if (typeMatch && oldStatusMatch && newStatusMatch) {
    console.log(`✓ ${testCase.name}`);
    console.log(`  Entity: ${entityType}, ${oldStatus} → ${newStatus}`);

    if (testCase.item.statusHistory) {
      const migratedHistory = migrateStatusHistory(testCase.item.statusHistory, mapping);
      console.log(`  Status history migrated: ${migratedHistory.length} entries`);
    }

    passed++;
  } else {
    console.log(`✗ ${testCase.name}`);
    console.log(`  Expected: ${testCase.expectedType}, ${testCase.expectedOldStatus} → ${testCase.expectedNewStatus}`);
    console.log(`  Got: ${entityType}, ${oldStatus} → ${newStatus}`);
    failed++;
  }
  console.log();
}

console.log('---');
console.log(`Tests passed: ${passed}/${testCases.length}`);
console.log(`Tests failed: ${failed}/${testCases.length}`);

if (failed > 0) {
  process.exit(1);
}
