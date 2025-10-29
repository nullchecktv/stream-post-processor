/**
 * Clip data model utilities
 * Provides functions for working with enhanced clip entities
 * Requirements: 1.5, 4.4
 */

/**
 * Valid clip status values
 */
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

/**
 * Create a clip key for DynamoDB operations
 */
export const createClipKey = (episodeId, clipId) => ({
  pk: episodeId,
  sk: `clip#${clipId}`
});

/**
 * Create GSI key for chronological clip queries
 */
export const createClipGSIKey = (createdAt, episodeId, clipId) => ({
  GSI1PK: 'clips',
  GSI1SK: `${createdAt}#${episodeId}#${clipId}`
});

/**
 * Validate clip status transition
 */
export const isValidStatusTransition = (currentStatus, newStatus) => {
  const validTransitions = {
    [CLIP_STATUS.DETECTED]: [CLIP_STATUS.PROCESSING, CLIP_STATUS.FAILED],
    [CLIP_STATUS.PROCESSING]: [CLIP_STATUS.PROCESSED, CLIP_STATUS.FAILED],
    [CLIP_STATUS.PROCESSED]: [CLIP_STATUS.REVIEWED, CLIP_STATUS.FAILED],
    [CLIP_STATUS.FAILED]: [CLIP_STATUS.PROCESSING], // Allow retry
    [CLIP_STATUS.REVIEWED]: [CLIP_STATUS.APPROVED, CLIP_STATUS.REJECTED],
    [CLIP_STATUS.APPROVED]: [CLIP_STATUS.PUBLISHED],
    [CLIP_STATUS.REJECTED]: [], // Terminal state
    [CLIP_STATUS.PUBLISHED]: [] // Terminal state
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
};

/**
 * Create processing metadata object
 */
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

/**
 * Create processing error object
 */
export const createProcessingError = (message, code = null) => ({
  message,
  timestamp: new Date().toISOString(),
  ...(code && { code })
});

/**
 * Calculate clip duration from segments
 */
export const calculateClipDuration = (segments) => {
  if (!segments || segments.length === 0) return null;

  const totalSeconds = segments.reduce((total, segment) => {
    const start = timeToSeconds(segment.startTime);
    const end = timeToSeconds(segment.endTime);
    return total + (end - start);
  }, 0);

  return secondsToTime(totalSeconds);
};

/**
 * Convert time string (HH:MM:SS) to seconds
 */
export const timeToSeconds = (timeString) => {
  const [hours, minutes, seconds] = timeString.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds;
};

/**
 * Convert seconds to time string (HH:MM:SS)
 */
export const secondsToTime = (seconds) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

/**
 * Generate S3 key for clip file
 */
export const generateClipS3Key = (episodeId, clipId) => {
  return `${episodeId}/clips/${clipId}/clip.mp4`;
};

/**
 * Generate S3 key for clip segment
 */
export const generateSegmentS3Key = (episodeId, clipId, segmentIndex) => {
  return `${episodeId}/clips/${clipId}/segments/${segmentIndex}.mp4`;
};

/**
 * Validate clip entity structure
 */
export const validateClipEntity = (clip) => {
  const required = ['pk', 'sk', 'clipId', 'status'];
  const missing = required.filter(field => !clip[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required clip fields: ${missing.join(', ')}`);
  }

  if (!Object.values(CLIP_STATUS).includes(clip.status)) {
    throw new Error(`Invalid clip status: ${clip.status}`);
  }

  return true;
};
