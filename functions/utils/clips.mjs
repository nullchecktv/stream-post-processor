/**
 * Clip utilities - S3 key parsing, status management, and data operations
 */

export const parseEpisodeIdFromKey = (key) => {
  const cleaned = key.replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length !== 3 || parts[2] !== 'transcript.srt') {
    throw new Error(`Unexpected key format: ${key}. Expected "/<tenantId>/<episodeId>/transcript.srt"`);
  }
  return {
    tenantId: parts[0],
    episodeId: parts[1]
  };
};

export const parseTenantIdFromKey = (key) => {
  const cleaned = key.replace(/^\/+/, '');
  const keyParts = cleaned.split('/').filter(Boolean);
  if (keyParts.length < 2) {
    throw new Error(`Invalid S3 key format: ${key}`);
  }
  return keyParts[0];
};

export const CLIP_STATUS = {
  DETECTED: 'detected',
  PROCESSING: 'processing',
  PROCESSED: 'processed',
  FAILED: 'failed',
  REVIEWED: 'reviewed',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  PUBLISHED: 'published'
};

const CLIP_STATUS_TRANSITIONS = {
  [CLIP_STATUS.DETECTED]: [CLIP_STATUS.PROCESSING],
  [CLIP_STATUS.PROCESSING]: [CLIP_STATUS.PROCESSED, CLIP_STATUS.FAILED],
  [CLIP_STATUS.PROCESSED]: [CLIP_STATUS.REVIEWED, CLIP_STATUS.APPROVED, CLIP_STATUS.REJECTED],
  [CLIP_STATUS.FAILED]: [CLIP_STATUS.PROCESSING], // Allow retry
  [CLIP_STATUS.REVIEWED]: [CLIP_STATUS.APPROVED, CLIP_STATUS.REJECTED],
  [CLIP_STATUS.APPROVED]: [CLIP_STATUS.PUBLISHED],
  [CLIP_STATUS.REJECTED]: [], // Terminal state
  [CLIP_STATUS.PUBLISHED]: [] // Terminal state
};

export const createClipKey = (episodeId, clipId) => ({
  pk: episodeId,
  sk: `clip#${clipId}`
});

export const createClipGSIKey = (createdAt, episodeId, clipId) => ({
  GSI1PK: 'clips',
  GSI1SK: `${createdAt}#${episodeId}#${clipId}`
});

export const validateStatusTransition = (currentStatus, newStatus) => {
  if (!currentStatus) {
    return true;
  }

  if (!Object.values(CLIP_STATUS).includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const allowedTransitions = CLIP_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Cannot transition from '${currentStatus}' to '${newStatus}'`);
  }

  return true;
};

export const isValidStatusTransition = validateStatusTransition;

export const getCurrentStatus = (statusHistory) => {
  if (!statusHistory || !Array.isArray(statusHistory) || statusHistory.length === 0) {
    return null;
  }

  const latestEntry = statusHistory[statusHistory.length - 1];
  return latestEntry?.status || null;
};

export const getCurrentClipStatus = (clip) => {
  if (clip.statusHistory && Array.isArray(clip.statusHistory) && clip.statusHistory.length > 0) {
    return getCurrentStatus(clip.statusHistory);
  }
  return clip.status || null;
};

export const validateStatusUpdate = (clip, newStatus) => {
  if (!newStatus || !Object.values(CLIP_STATUS).includes(newStatus)) {
    throw new Error(`Invalid status: ${newStatus}`);
  }

  const currentStatus = getCurrentClipStatus(clip);
  validateStatusTransition(currentStatus, newStatus);

  return true;
};

export const createStatusEntry = (status, timestamp = null, metadata = {}) => {
  const entry = {
    status,
    timestamp: timestamp || new Date().toISOString()
  };

  if (metadata.error && status === CLIP_STATUS.FAILED) {
    entry.error = metadata.error;
    entry.errorType = metadata.errorType || 'UnknownError';
  }

  if (metadata.processingDuration && status === CLIP_STATUS.PROCESSED) {
    entry.processingDuration = metadata.processingDuration;
  }

  if (metadata.segmentCount) {
    entry.segmentCount = metadata.segmentCount;
  }

  return entry;
};

export const createStatusUpdateParams = (newStatus, timestamp = null, metadata = {}) => {
  const statusEntry = createStatusEntry(newStatus, timestamp, metadata);
  const now = timestamp || new Date().toISOString();

  const params = {
    UpdateExpression: 'SET #statusHistory = list_append(if_not_exists(#statusHistory, :emptyList), :newStatus), #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#statusHistory': 'statusHistory',
      '#status': 'status',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':emptyList': [],
      ':newStatus': [statusEntry],
      ':status': newStatus,
      ':updatedAt': now
    }
  };

  if (newStatus === CLIP_STATUS.PROCESSED) {
    if (metadata.s3Key) {
      params.UpdateExpression += ', #s3Key = :s3Key';
      params.ExpressionAttributeNames['#s3Key'] = 's3Key';
      params.ExpressionAttributeValues[':s3Key'] = metadata.s3Key;
    }

    if (metadata.fileSize) {
      params.UpdateExpression += ', #fileSize = :fileSize';
      params.ExpressionAttributeNames['#fileSize'] = 'fileSize';
      params.ExpressionAttributeValues[':fileSize'] = metadata.fileSize;
    }

    if (metadata.duration) {
      params.UpdateExpression += ', #duration = :duration';
      params.ExpressionAttributeNames['#duration'] = 'duration';
      params.ExpressionAttributeValues[':duration'] = metadata.duration;
    }

    if (metadata.processingMetadata) {
      params.UpdateExpression += ', #processingMetadata = :processingMetadata';
      params.ExpressionAttributeNames['#processingMetadata'] = 'processingMetadata';
      params.ExpressionAttributeValues[':processingMetadata'] = metadata.processingMetadata;
    }
  }

  if (newStatus === CLIP_STATUS.FAILED && metadata.error) {
    params.UpdateExpression += ', #processingError = :processingError';
    params.ExpressionAttributeNames['#processingError'] = 'processingError';
    params.ExpressionAttributeValues[':processingError'] = {
      message: metadata.error,
      errorType: metadata.errorType || 'UnknownError',
      timestamp: now
    };
  }

  return params;
};

export const updateClipStatus = async (docClient, tableName, episodeId, clipId, newStatus, metadata = {}) => {
  const params = createStatusUpdateParams(newStatus, null, metadata);

  params.TableName = tableName;
  params.Key = {
    pk: episodeId,
    sk: `clip#${clipId}`
  };

  const { UpdateCommand } = await import('@aws-sdk/lib-dynamodb');
  await docClient.send(new UpdateCommand(params));
};

export const createProcessingMetadata = ({
  segmentCount,
  totalProcessingTime,
  ffmpegVersion,
  resolution,
  codec = 'h264'
} = {}) => ({
  ...(segmentCount && { segmentCount }),
  ...(totalProcessingTime && { totalProcessingTime }),
  ...(ffmpegVersion && { ffmpegVersion }),
  ...(resolution && { resolution }),
  codec
});

export const createProcessingError = (message, code = null) => ({
  message,
  timestamp: new Date().toISOString(),
  ...(code && { code })
});

export const calculateClipDuration = (segments) => {
  if (!segments || segments.length === 0) return null;

  const totalSeconds = segments.reduce((total, segment) => {
    const start = timeToSeconds(segment.startTime);
    const end = timeToSeconds(segment.endTime);
    return total + (end - start);
  }, 0);

  return secondsToTime(totalSeconds);
};

export const timeToSeconds = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

export const secondsToTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const generateClipS3Key = (episodeId, clipId) => {
  return `${episodeId}/clips/${clipId}/clip.mp4`;
};

export const generateSegmentS3Key = (episodeId, clipId, segmentIndex) => {
  return `${episodeId}/clips/${clipId}/segments/${segmentIndex}.mp4`;
};

export const validateClipEntity = (clip) => {
  const required = ['pk', 'sk', 'clipId'];
  const missing = required.filter(field => !clip[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required clip fields: ${missing.join(', ')}`);
  }

  return true;
};
