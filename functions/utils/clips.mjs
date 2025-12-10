import { CLIP_STATUS, CLIP_STATUS_TRANSITIONS } from '../../schemas/clips.mjs';

export { CLIP_STATUS, CLIP_STATUS_TRANSITIONS };

export const parseEpisodeIdFromKey = (key) => {
  const cleaned = key.replace(/^\/+/, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length !== 3 || (parts[2] !== 'transcript.srt' && parts[2] !== 'transcript.md')) {
    throw new Error(`Unexpected key format: ${key}. Expected "/<tenantId>/<episodeId>/transcript.srt" or "/<tenantId>/<episodeId>/transcript.md"`);
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

export const createClipKey = (episodeId, clipId) => ({
  pk: episodeId,
  sk: `data#clip#${clipId}`
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

  if (metadata.processingDuration && status === CLIP_STATUS.CREATED) {
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

  if (newStatus === CLIP_STATUS.CREATED) {
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
  const { marshall } = await import('@aws-sdk/util-dynamodb');
  const { UpdateItemCommand } = await import('@aws-sdk/client-dynamodb');

  const params = createStatusUpdateParams(newStatus, null, metadata);

  const updateParams = {
    TableName: tableName,
    Key: marshall({
      pk: episodeId,
      sk: `data#clip#${clipId}`
    }),
    UpdateExpression: params.UpdateExpression,
    ExpressionAttributeNames: params.ExpressionAttributeNames,
    ExpressionAttributeValues: marshall(params.ExpressionAttributeValues)
  };

  await docClient.send(new UpdateItemCommand(updateParams));
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

export const generateClipS3Key = (episodeId, clipId, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for generating clip S3 keys');
  }
  return `${tenantId}/${episodeId}/clips/${clipId}.mp4`;
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
