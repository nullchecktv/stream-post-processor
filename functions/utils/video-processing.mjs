import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3 = new S3Client();

export const timeToSeconds = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') {
    throw new Error('Invalid time string');
  }

  const parts = timeStr.split(':').map(part => parseInt(part, 10));

  if (parts.length === 2) {
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  } else {
    throw new Error('Time string must be in HH:MM:SS or MM:SS format');
  }
};

export const secondsToTime = (seconds) => {
  if (typeof seconds !== 'number' || seconds < 0) {
    throw new Error('Seconds must be a non-negative number');
  }

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export const loadHlsManifest = async (episodeId, trackName, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for video processing operations');
  }

  try {
    const manifestKey = `${tenantId}/${episodeId}/videos/${trackName}/chunks/${trackName}_chunk.m3u8`;

    const command = new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: manifestKey
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error('Empty response body from S3');
    }

    const manifestContent = await response.Body.transformToString();

    if (!manifestContent || manifestContent.trim().length === 0) {
      throw new Error('Empty manifest content');
    }

    return parseHlsManifest(manifestContent, episodeId, trackName, tenantId);
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      throw new Error(`HLS manifest not found: ${episodeId}/${trackName}_manifest.m3u8`);
    }
    console.error('Failed to load HLS manifest:', error);
    throw new Error(`Failed to load HLS manifest for ${episodeId}/${trackName}: ${error.message}`);
  }
};

export const parseHlsManifest = (manifestContent, episodeId, trackName, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for parsing HLS manifest');
  }

  if (!manifestContent || typeof manifestContent !== 'string') {
    throw new Error('Invalid manifest content: must be a non-empty string');
  }

  const lines = manifestContent.split('\n').filter(line => line.trim());
  const segments = [];
  let currentTime = 0;
  let manifestVersion = null;
  let targetDuration = null;

  if (!lines[0] || !lines[0].startsWith('#EXTM3U')) {
    throw new Error('Invalid M3U8 format: missing #EXTM3U header');
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (line.startsWith('#EXT-X-VERSION:')) {
      manifestVersion = parseInt(line.split(':')[1]);
    } else if (line.startsWith('#EXT-X-TARGETDURATION:')) {
      targetDuration = parseInt(line.split(':')[1]);
    } else if (line.startsWith('#EXTINF:')) {
      const durationMatch = line.match(/#EXTINF:([\d.]+)/);
      if (durationMatch) {
        const duration = parseFloat(durationMatch[1]);

        if (duration <= 0) {
          console.warn(`Invalid segment duration: ${duration} at line ${i}`);
          continue;
        }

        const nextLine = lines[i + 1];

        if (nextLine && !nextLine.startsWith('#')) {
          const segmentFile = nextLine.trim();

          if (!segmentFile) {
            console.warn(`Empty segment filename at line ${i + 1}`);
            continue;
          }

          const segmentKey = `${tenantId}/${episodeId}/videos/${trackName}/chunks/${segmentFile}`;

          segments.push({
            key: segmentKey,
            filename: segmentFile,
            start: currentTime,
            end: currentTime + duration,
            duration: duration,
            index: segments.length
          });

          currentTime += duration;
        } else {
          console.warn(`Missing segment filename after #EXTINF at line ${i}`);
        }
      } else {
        console.warn(`Invalid #EXTINF format at line ${i}: ${line}`);
      }
    }
  }

  if (segments.length === 0) {
    throw new Error('No valid segments found in manifest');
  }

  return {
    episodeId,
    trackName,
    totalDuration: currentTime,
    segmentCount: segments.length,
    segments,
    metadata: {
      version: manifestVersion,
      targetDuration: targetDuration
    }
  };
};

export const calculateChunkMapping = (segment, hlsSegments) => {
  if (!segment || !segment.startTime || !segment.endTime) {
    throw new Error('Invalid segment: must have startTime and endTime');
  }

  if (!Array.isArray(hlsSegments) || hlsSegments.length === 0) {
    throw new Error('Invalid HLS segments: must be a non-empty array');
  }

  const startSeconds = timeToSeconds(segment.startTime);
  const endSeconds = timeToSeconds(segment.endTime);

  if (startSeconds >= endSeconds) {
    throw new Error(`Invalid segment timing: startTime (${startSeconds}s) must be before endTime (${endSeconds}s)`);
  }

  const relevantChunks = hlsSegments.filter(chunk => {
    return chunk.start < endSeconds && chunk.end > startSeconds;
  });

  if (relevantChunks.length === 0) {
    throw new Error(`No chunks found for segment ${segment.startTime} - ${segment.endTime}. Available range: 0 - ${hlsSegments[hlsSegments.length - 1]?.end || 0}s`);
  }

  const mappings = relevantChunks.map((chunk, index) => {
    const chunkStartOffset = Math.max(0, startSeconds - chunk.start);
    const chunkEndOffset = Math.min(chunk.duration, endSeconds - chunk.start);
    const extractionDuration = chunkEndOffset - chunkStartOffset;

    if (extractionDuration <= 0) {
      console.warn(`Zero or negative duration for chunk ${chunk.filename}: ${extractionDuration}s`);
    }

    return {
      s3Key: chunk.key,
      filename: chunk.filename,
      startOffset: chunkStartOffset,
      endOffset: chunkEndOffset,
      duration: extractionDuration,
      chunkStart: chunk.start,
      chunkEnd: chunk.end,
      chunkDuration: chunk.duration,
      chunkIndex: chunk.index,
      mappingIndex: index
    };
  });

  const totalMappingDuration = mappings.reduce((sum, mapping) => sum + mapping.duration, 0);
  const expectedDuration = endSeconds - startSeconds;

  if (Math.abs(totalMappingDuration - expectedDuration) > 0.1) {
    console.warn(`Duration mismatch: expected ${expectedDuration}s, got ${totalMappingDuration}s`);
  }

  return mappings;
};

export const generateSegmentKey = (episodeId, clipId, segmentIndex, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for generating segment keys');
  }

  return `${tenantId}/${episodeId}/clips/${clipId}/segments/${segmentIndex.toString().padStart(3, '0')}.mp4`;
};

export const generateClipKey = (episodeId, clipId, tenantId) => {
  if (!tenantId) {
    throw new Error('tenantId is required for generating clip keys');
  }

  return `${tenantId}/${episodeId}/clips/${clipId}/clip.mp4`;
};

export const createConcatFileContent = (segmentFiles) => {
  if (!Array.isArray(segmentFiles) || segmentFiles.length === 0) {
    throw new Error('Segment files array is required and must not be empty');
  }

  return segmentFiles
    .map(file => `file '${file}'`)
    .join('\n');
};

export const validateSegmentTiming = (segment) => {
  if (!segment || typeof segment !== 'object') {
    throw new Error('Segment must be an object');
  }

  if (!segment.startTime || !segment.endTime) {
    throw new Error('Segment must have startTime and endTime');
  }

  const startSeconds = timeToSeconds(segment.startTime);
  const endSeconds = timeToSeconds(segment.endTime);

  if (startSeconds >= endSeconds) {
    throw new Error('Segment startTime must be before endTime');
  }

  if (startSeconds < 0 || endSeconds < 0) {
    throw new Error('Segment times must be non-negative');
  }
};

export const calculateTotalDuration = (segments) => {
  if (!Array.isArray(segments) || segments.length === 0) {
    return 0;
  }

  return segments.reduce((total, segment) => {
    const startSeconds = timeToSeconds(segment.startTime);
    const endSeconds = timeToSeconds(segment.endTime);
    return total + (endSeconds - startSeconds);
  }, 0);
};

export const validateSegmentSequence = (segments) => {
  if (!Array.isArray(segments)) {
    throw new Error('Segments must be an array');
  }

  if (segments.length === 0) {
    return true;
  }

  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    validateSegmentTiming(segment);

    if (i < segments.length - 1) {
      const nextSegment = segments[i + 1];
      const currentEnd = timeToSeconds(segment.endTime);
      const nextStart = timeToSeconds(nextSegment.startTime);

      if (currentEnd > nextStart) {
        throw new Error(`Segment ${i} overlaps with segment ${i + 1}: ${segment.endTime} > ${nextSegment.startTime}`);
      }
    }
  }

  return true;
};

export const findSegmentBoundaries = (segment, hlsSegments) => {
  const startSeconds = timeToSeconds(segment.startTime);
  const endSeconds = timeToSeconds(segment.endTime);

  let firstChunkIndex = -1;
  let lastChunkIndex = -1;

  for (let i = 0; i < hlsSegments.length; i++) {
    const chunk = hlsSegments[i];

    if (firstChunkIndex === -1 && chunk.end > startSeconds) {
      firstChunkIndex = i;
    }

    if (chunk.start < endSeconds) {
      lastChunkIndex = i;
    }
  }

  return {
    firstChunkIndex,
    lastChunkIndex,
    chunkCount: lastChunkIndex - firstChunkIndex + 1,
    startChunk: hlsSegments[firstChunkIndex],
    endChunk: hlsSegments[lastChunkIndex]
  };
};

export const estimateProcessingTime = (segment, chunkCount) => {
  const segmentDuration = timeToSeconds(segment.endTime) - timeToSeconds(segment.startTime);
  const baseTime = segmentDuration * 2;
  const additionalTime = (chunkCount - 1) * segmentDuration * 0.5;

  return Math.ceil(baseTime + additionalTime);
};
