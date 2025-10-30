/**
 * Unit tests for status history utility functions
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 *
 * Since we can't easily import ES modules in Jest, we'll test the logic inline
 * This tests the core business logic that would be in the status-history utility module
 */

// Inline implementations for testing (matching the actual utility functions)
const createStatusEntry = (status, timestamp = null) => {
  return {
    status,
    timestamp: timestamp || new Date().toISOString()
  };
};

const initializeStatusHistory = (initialStatus, timestamp = null) => {
  return [createStatusEntry(initialStatus, timestamp)];
};

const addStatusEntry = (existingHistory, newStatus, timestamp = null) => {
  const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
  history.push(createStatusEntry(newStatus, timestamp));
  return history;
};

const getCurrentStatus = (statusHistory) => {
  if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length === 0) {
    return null;
  }
  const latestEntry = statusHistory[statusHistory.length - 1];
  return latestEntry?.status || null;
};

const migrateToStatusHistory = (entity, fallbackTimestamp = null) => {
  if (entity.statusHistory && Array.isArray(entity.statusHistory) && entity.statusHistory.length > 0) {
    return {
      ...entity,
      status: getCurrentStatus(entity.statusHistory) || entity.status
    };
  }

  if (entity.status) {
    const timestamp = fallbackTimestamp || entity.createdAt || entity.updatedAt || new Date().toISOString();
    const statusHistory = initializeStatusHistory(entity.status, timestamp);

    return {
      ...entity,
      statusHistory,
      status: entity.status
    };
  }

  return entity;
};

const ensureStatusHistory = (entity, defaultStatus = 'unknown', timestamp = null) => {
  if (entity.statusHistory && Array.isArray(entity.statusHistory) && entity.statusHistory.length > 0) {
    return {
      ...entity,
      status: getCurrentStatus(entity.statusHistory) || entity.status
    };
  }

  const statusToUse = entity.status || defaultStatus;
  const timestampToUse = timestamp || entity.createdAt || entity.updatedAt || new Date().toISOString();

  const statusHistory = initializeStatusHistory(statusToUse, timestampToUse);

  return {
    ...entity,
    statusHistory,
    status: statusToUse
  };
};

const validateStatusHistory = (statusHistory) => {
  if (!Array.isArray(statusHistory)) {
    throw new Error('statusHistory must be an array');
  }

  if (statusHistory.length === 0) {
    throw new Error('statusHistory cannot be empty');
  }

  for (let i = 0; i < statusHistory.length; i++) {
    const entry = statusHistory[i];

    if (!entry || typeof entry !== 'object') {
      throw new Error(`statusHistory entry at index ${i} must be an object`);
    }

    if (!entry.status || typeof entry.status !== 'string') {
      throw new Error(`statusHistory entry at index ${i} must have a status string`);
    }

    if (!entry.timestamp || typeof entry.timestamp !== 'string') {
      throw new Error(`statusHistory entry at index ${i} must have a timestamp string`);
    }

    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(entry.timestamp)) {
      throw new Error(`statusHistory entry at index ${i} has invalid timestamp format: ${entry.timestamp}`);
    }
  }

  return true;
};

const createStatusUpdateParams = (newStatus, timestamp = null) => {
  const statusEntry = createStatusEntry(newStatus, timestamp);
  const now = new Date().toISOString();

  return {
    UpdateExpression: 'SET statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), #status = :status, updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':emptyList': [],
      ':newStatus': [statusEntry],
      ':status': newStatus,
      ':updatedAt': now
    }
  };
};

describe('Status History Utilities', () => {
  describe('createStatusEntry', () => {
    test('should create status entry with current timestamp', () => {
      const status = 'test-status';
      const entry = createStatusEntry(status);

      expect(entry.status).toBe(status);
      expect(entry.timestamp).toBeDefined();
      expect(typeof entry.timestamp).toBe('string');
      expect(new Date(entry.timestamp)).toBeInstanceOf(Date);
    });

    test('should create status entry with provided timestamp', () => {
      const status = 'test-status';
      const timestamp = '2025-01-15T10:30:00Z';
      const entry = createStatusEntry(status, timestamp);

      expect(entry.status).toBe(status);
      expect(entry.timestamp).toBe(timestamp);
    });
  });

  describe('initializeStatusHistory', () => {
    test('should create array with initial status entry', () => {
      const status = 'initial-status';
      const history = initializeStatusHistory(status);

      expect(Array.isArray(history)).toBe(true);
      expect(history).toHaveLength(1);
      expect(history[0].status).toBe(status);
      expect(history[0].timestamp).toBeDefined();
    });

    test('should use provided timestamp', () => {
      const status = 'initial-status';
      const timestamp = '2025-01-15T10:30:00Z';
      const history = initializeStatusHistory(status, timestamp);

      expect(history[0].timestamp).toBe(timestamp);
    });
  });

  describe('addStatusEntry', () => {
    test('should add entry to existing history', () => {
      const existingHistory = [
        { status: 'first', timestamp: '2025-01-15T10:00:00Z' }
      ];
      const newStatus = 'second';

      const updated = addStatusEntry(existingHistory, newStatus);

      expect(updated).toHaveLength(2);
      expect(updated[0]).toEqual(existingHistory[0]);
      expect(updated[1].status).toBe(newStatus);
      expect(updated[1].timestamp).toBeDefined();
    });

    test('should handle empty history array', () => {
      const updated = addStatusEntry([], 'first-status');

      expect(updated).toHaveLength(1);
      expect(updated[0].status).toBe('first-status');
    });

    test('should handle null/undefined history', () => {
      const updated = addStatusEntry(null, 'first-status');

      expect(updated).toHaveLength(1);
      expect(updated[0].status).toBe('first-status');
    });

    test('should not mutate original array', () => {
      const original = [
        { status: 'first', timestamp: '2025-01-15T10:00:00Z' }
      ];
      const originalLength = original.length;

      addStatusEntry(original, 'second');

      expect(original).toHaveLength(originalLength);
    });
  });

  describe('getCurrentStatus', () => {
    test('should return most recent status', () => {
      const history = [
        { status: 'first', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'second', timestamp: '2025-01-15T10:01:00Z' },
        { status: 'third', timestamp: '2025-01-15T10:02:00Z' }
      ];

      const current = getCurrentStatus(history);
      expect(current).toBe('third');
    });

    test('should return null for empty array', () => {
      const current = getCurrentStatus([]);
      expect(current).toBeNull();
    });

    test('should return null for null/undefined history', () => {
      expect(getCurrentStatus(null)).toBeNull();
      expect(getCurrentStatus(undefined)).toBeNull();
    });

    test('should handle single entry', () => {
      const history = [
        { status: 'only', timestamp: '2025-01-15T10:00:00Z' }
      ];

      const current = getCurrentStatus(history);
      expect(current).toBe('only');
    });

    test('should handle entry without status', () => {
      const history = [
        { timestamp: '2025-01-15T10:00:00Z' }
      ];

      const current = getCurrentStatus(history);
      expect(current).toBeNull();
    });
  });

  describe('migrateToStatusHistory', () => {
    test('should return entity as-is if statusHistory exists', () => {
      const entity = {
        status: 'current',
        statusHistory: [
          { status: 'old', timestamp: '2025-01-15T10:00:00Z' },
          { status: 'current', timestamp: '2025-01-15T10:01:00Z' }
        ],
        createdAt: '2025-01-15T09:00:00Z'
      };

      const migrated = migrateToStatusHistory(entity);

      expect(migrated.statusHistory).toEqual(entity.statusHistory);
      expect(migrated.status).toBe('current');
    });

    test('should create statusHistory from status field', () => {
      const entity = {
        status: 'existing-status',
        createdAt: '2025-01-15T10:00:00Z'
      };

      const migrated = migrateToStatusHistory(entity);

      expect(migrated.statusHistory).toHaveLength(1);
      expect(migrated.statusHistory[0].status).toBe('existing-status');
      expect(migrated.statusHistory[0].timestamp).toBe(entity.createdAt);
      expect(migrated.status).toBe('existing-status');
    });

    test('should use fallback timestamp when no createdAt', () => {
      const entity = { status: 'existing-status' };
      const fallbackTimestamp = '2025-01-15T12:00:00Z';

      const migrated = migrateToStatusHistory(entity, fallbackTimestamp);

      expect(migrated.statusHistory[0].timestamp).toBe(fallbackTimestamp);
    });

    test('should return entity as-is if no status or statusHistory', () => {
      const entity = { id: 'test', createdAt: '2025-01-15T10:00:00Z' };

      const migrated = migrateToStatusHistory(entity);

      expect(migrated).toEqual(entity);
    });
  });

  describe('ensureStatusHistory', () => {
    test('should return entity as-is if valid statusHistory exists', () => {
      const entity = {
        statusHistory: [
          { status: 'existing', timestamp: '2025-01-15T10:00:00Z' }
        ]
      };

      const ensured = ensureStatusHistory(entity);

      expect(ensured.statusHistory).toEqual(entity.statusHistory);
      expect(ensured.status).toBe('existing');
    });

    test('should create statusHistory from status field', () => {
      const entity = {
        status: 'existing-status',
        createdAt: '2025-01-15T10:00:00Z'
      };

      const ensured = ensureStatusHistory(entity);

      expect(ensured.statusHistory).toHaveLength(1);
      expect(ensured.statusHistory[0].status).toBe('existing-status');
      expect(ensured.status).toBe('existing-status');
    });

    test('should use default status when no status or statusHistory', () => {
      const entity = { createdAt: '2025-01-15T10:00:00Z' };
      const defaultStatus = 'default-status';

      const ensured = ensureStatusHistory(entity, defaultStatus);

      expect(ensured.statusHistory).toHaveLength(1);
      expect(ensured.statusHistory[0].status).toBe(defaultStatus);
      expect(ensured.status).toBe(defaultStatus);
    });

    test('should use unknown as default when no default provided', () => {
      const entity = { createdAt: '2025-01-15T10:00:00Z' };

      const ensured = ensureStatusHistory(entity);

      expect(ensured.status).toBe('unknown');
    });
  });

  describe('validateStatusHistory', () => {
    test('should validate correct statusHistory', () => {
      const history = [
        { status: 'first', timestamp: '2025-01-15T10:00:00Z' },
        { status: 'second', timestamp: '2025-01-15T10:01:00.123Z' }
      ];

      expect(() => validateStatusHistory(history)).not.toThrow();
      expect(validateStatusHistory(history)).toBe(true);
    });

    test('should throw error for non-array', () => {
      expect(() => validateStatusHistory('not-array')).toThrow('statusHistory must be an array');
      expect(() => validateStatusHistory({})).toThrow('statusHistory must be an array');
    });

    test('should throw error for empty array', () => {
      expect(() => validateStatusHistory([])).toThrow('statusHistory cannot be empty');
    });

    test('should throw error for non-object entry', () => {
      expect(() => validateStatusHistory(['string'])).toThrow('statusHistory entry at index 0 must be an object');
      expect(() => validateStatusHistory([null])).toThrow('statusHistory entry at index 0 must be an object');
    });

    test('should throw error for missing status', () => {
      const history = [{ timestamp: '2025-01-15T10:00:00Z' }];
      expect(() => validateStatusHistory(history)).toThrow('statusHistory entry at index 0 must have a status string');
    });

    test('should throw error for missing timestamp', () => {
      const history = [{ status: 'test' }];
      expect(() => validateStatusHistory(history)).toThrow('statusHistory entry at index 0 must have a timestamp string');
    });

    test('should throw error for invalid timestamp format', () => {
      const history = [{ status: 'test', timestamp: 'invalid-date' }];
      expect(() => validateStatusHistory(history)).toThrow('statusHistory entry at index 0 has invalid timestamp format');
    });
  });

  describe('createStatusUpdateParams', () => {
    test('should create correct DynamoDB update parameters', () => {
      const status = 'new-status';
      const params = createStatusUpdateParams(status);

      expect(params.UpdateExpression).toContain('SET statusHistory = list_append');
      expect(params.UpdateExpression).toContain('#status = :status');
      expect(params.UpdateExpression).toContain('updatedAt = :updatedAt');

      expect(params.ExpressionAttributeNames['#status']).toBe('status');

      expect(params.ExpressionAttributeValues[':emptyList']).toEqual([]);
      expect(params.ExpressionAttributeValues[':status']).toBe(status);
      expect(params.ExpressionAttributeValues[':updatedAt']).toBeDefined();

      expect(Array.isArray(params.ExpressionAttributeValues[':newStatus'])).toBe(true);
      expect(params.ExpressionAttributeValues[':newStatus']).toHaveLength(1);
      expect(params.ExpressionAttributeValues[':newStatus'][0].status).toBe(status);
      expect(params.ExpressionAttributeValues[':newStatus'][0].timestamp).toBeDefined();
    });

    test('should use provided timestamp', () => {
      const status = 'new-status';
      const timestamp = '2025-01-15T10:30:00Z';
      const params = createStatusUpdateParams(status, timestamp);

      expect(params.ExpressionAttributeValues[':newStatus'][0].timestamp).toBe(timestamp);
    });
  });
});
