/**
 * Utility functions for managing status history in episodes and clips
 * Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3
 */

/**
 * Creates a new status history entry
 * @param {string} status - The status value
 * @param {string} [timestamp] - Optional timestamp (defaults to current time)
 * @returns {Object} Status history entry with status and timestamp
 */
export const createStatusEntry = (status, timestamp = null) => {
  return {
    status,
    timestamp: timestamp || new Date().toISOString()
  };
};

/**
 * Initializes a status history array with an initial status
 * @param {string} initialStatus - The initial status value
 * @param {string} [timestamp] - Optional timestamp (defaults to current time)
 * @returns {Array} Status history array with initial entry
 */
export const initializeStatusHistory = (initialStatus, timestamp = null) => {
  return [createStatusEntry(initialStatus, timestamp)];
};

/**
 * Adds a new status entry to an existing status history array
 * @param {Array} existingHistory - Existing status history array
 * @param {string} newStatus - The new status to add
 * @param {string} [timestamp] - Optional timestamp (defaults to current time)
 * @returns {Array} Updated status history array with new entry appended
 */
export const addStatusEntry = (existingHistory, newStatus, timestamp = null) => {
  const history = Array.isArray(existingHistory) ? [...existingHistory] : [];
  history.push(createStatusEntry(newStatus, timestamp));
  return history;
};

/**
 * Computes the current status from a status history array
 * @param {Array} statusHistory - Status history array
 * @returns {string|null} The most recent status, or null if no history exists
 */
export const getCurrentStatus = (statusHistory) => {
  if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length === 0) {
    return null;
  }

  // Return the status from the most recent entry (last in array)
  const latestEntry = statusHistory[statusHistory.length - 1];
  return latestEntry?.status || null;
};

/**
 * Migrates an entity from single status field to statusHistory array
 * This function handles backward compatibility for existing episodes/clips
 * @param {Object} entity - The entity (episode or clip) to migrate
 * @param {string} [fallbackTimestamp] - Timestamp to use if entity doesn't have createdAt
 * @returns {Object} Migrated entity with statusHistory array and computed status field
 */
export const migrateToStatusHistory = (entity, fallbackTimestamp = null) => {
  // If entity already has statusHistory, return as-is
  if (entity.statusHistory && Array.isArray(entity.statusHistory) && entity.statusHistory.length > 0) {
    return {
      ...entity,
      status: getCurrentStatus(entity.statusHistory) || entity.status
    };
  }

  // If entity has a status field but no statusHistory, create history from status
  if (entity.status) {
    const timestamp = fallbackTimestamp || entity.createdAt || entity.updatedAt || new Date().toISOString();
    const statusHistory = initializeStatusHistory(entity.status, timestamp);

    return {
      ...entity,
      statusHistory,
      status: entity.status // Keep existing status field for backward compatibility
    };
  }

  // If entity has neither status nor statusHistory, return as-is
  return entity;
};

/**
 * Ensures an entity has a valid statusHistory array
 * Creates one from the status field if needed, or initializes with a default status
 * @param {Object} entity - The entity to ensure has statusHistory
 * @param {string} [defaultStatus] - Default status if entity has neither status nor statusHistory
 * @param {string} [timestamp] - Timestamp to use for migration
 * @returns {Object} Entity with guaranteed statusHistory array
 */
export const ensureStatusHistory = (entity, defaultStatus = 'unknown', timestamp = null) => {
  // If entity already has valid statusHistory, return as-is
  if (entity.statusHistory && Array.isArray(entity.statusHistory) && entity.statusHistory.length > 0) {
    return {
      ...entity,
      status: getCurrentStatus(entity.statusHistory) || entity.status
    };
  }

  // Use existing status field or default
  const statusToUse = entity.status || defaultStatus;
  const timestampToUse = timestamp || entity.createdAt || entity.updatedAt || new Date().toISOString();

  const statusHistory = initializeStatusHistory(statusToUse, timestampToUse);

  return {
    ...entity,
    statusHistory,
    status: statusToUse
  };
};

/**
 * Validates a status history array structure
 * @param {Array} statusHistory - Status history array to validate
 * @returns {boolean} True if valid, throws error if invalid
 */
export const validateStatusHistory = (statusHistory) => {
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

    // Validate timestamp format (basic ISO 8601 check)
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(entry.timestamp)) {
      throw new Error(`statusHistory entry at index ${i} has invalid timestamp format: ${entry.timestamp}`);
    }
  }

  return true;
};

/**
 * Creates DynamoDB UpdateExpression parameters for adding a status entry
 * This helper generates the necessary parameters for atomic status history updates
 * @param {string} newStatus - The new status to add
 * @param {string} [timestamp] - Optional timestamp (defaults to current time)
 * @returns {Object} Object with UpdateExpression, ExpressionAttributeNames, and ExpressionAttributeValues
 */
export const createStatusUpdateParams = (newStatus, timestamp = null) => {
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
