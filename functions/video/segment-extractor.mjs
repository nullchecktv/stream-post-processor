import { Logger } from '@aws-lambda-powertools/logger';
import { loadHlsManifest, calculateChunkMapping, validateSegmentTiming, generateSegmentKey } from '../utils/video-processing.mjs';
import { extractVideoSegment, createTempDir, cleanup,  execFFmpeg } from '../utils/ffmpeg.mjs';
import { downloadVideoFile, uploadSegmentFile, objectExists, verifySegmentIntegrity } from '../utils/s3-video.mjs';
import { selectTrackForSegment } from '../utils/track-selection.mjs';
import { CLIP_STATUS } from '../../schemas/clips.mjs';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

const logger = new Logger({ serviceName: 'video' });
const s3 = new S3Client();

async function getSegmentMetadata(bucketName, segmentS3Key) {
  try {
    const command = new HeadObjectCommand({
      Bucket: bucketName,
      Key: segmentS3Key
    });

    const response = await s3.send(command);
    const metadata = response.Metadata || {};

    return {
      duration: parseFloat(metadata.duration || metadata['total-duration'] || '0'),
      fileSize: response.ContentLength || 0,
      resolution: metadata.resolution || "1920x1080"
    };
  } catch (error) {
    logger.error('Failed to get segment metadata', {
      error: error.message,
      stack: error.stack,
      segmentS3Key
    });
    // Return default metadata if we can't get it from S3
    return {
      duration: 0,
      fileSize: 0,
      resolution: "1920x1080"
    };
  }
}

export const handler = async (event) => {
  let tempDir = null;

  try {
    const { tenantId, episodeId, trackName = 'main', clipId, segment, order } = event;

    if (!tenantId) {
      logger.error('Missing tenantId in event');
      throw new Error('Unauthorized');
    }

    if (!episodeId || !clipId || !segment) {
      throw new Error('Missing required parameters: episodeId, clipId, segment');
    }

    // Validate the single segment
    try {
      validateSegmentTiming(segment);
    } catch (error) {
      throw new Error(`Invalid segment: ${error.message}`);
    }

    tempDir = await createTempDir('segment-extraction-');
    const bucketName = process.env.BUCKET_NAME;

    let useTrackName = trackName;
    let trackSelection = null;

    try {
      trackSelection = await selectTrackForSegment(
        episodeId,
        segment,
        tenantId,
        {
          enableLLMMatching: true,
          fallbackTrack: trackName,
          confidenceThreshold: 0.7
        }
      );

      useTrackName = trackSelection.trackName;

      const logLevel = trackSelection.warning ? 'warn' : 'info';
      logger[logLevel]('Track selected for segment', {
        speaker: segment.speaker,
        selectedTrack: trackSelection.trackName,
        matchType: trackSelection.matchType,
        confidence: trackSelection.confidence,
        matchedSpeaker: trackSelection.matchedSpeaker,
        reasoning: trackSelection.reasoning,
        warning: trackSelection.warning,
        episodeId,
        clipId,
        order
      });
    } catch (error) {
      logger.error('Track selection failed, using default track', {
        error: error.message,
        stack: error.stack,
        speaker: segment.speaker,
        defaultTrack: trackName,
        episodeId,
        clipId,
        order
      });
      useTrackName = trackName;
      trackSelection = {
        trackName: useTrackName,
        matchType: 'error-fallback',
        confidence: 0.0,
        reasoning: `Track selection error: ${error.message}`
      };
    }

    const manifest = await loadHlsManifest(episodeId, useTrackName, tenantId);
    const chunkMappings = calculateChunkMapping(segment, manifest.segments);

    if (chunkMappings.length === 0) {
      throw new Error(`No chunks found for segment (${segment.startTime} - ${segment.endTime})`);
    }

    // Use the order parameter to ensure unique segment filenames
    const segmentIndex = order || 0;
    const segmentS3Key = generateSegmentKey(episodeId, clipId, segmentIndex, tenantId);

    const segmentExists = await objectExists(bucketName, segmentS3Key);
    if (segmentExists) {
      const metadata = await getSegmentMetadata(bucketName, segmentS3Key);

      logger.info('Using cached segment', {
        episodeId,
        clipId,
        order,
        segmentS3Key,
        trackName: useTrackName
      });

      return {
        episodeId,
        clipId,
        segmentFile: segmentS3Key,
        order,
        status: CLIP_STATUS.CREATED,
        metadata,
        trackSelection: trackSelection || {
          trackName: useTrackName,
          matchType: 'cached',
          confidence: 1.0,
          reasoning: 'Segment already exists in S3'
        }
      };
    }

    let metadata;
    if (chunkMappings.length === 1) {
      metadata = await extractSingleChunkSegment(chunkMappings[0], segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId);
    } else {
      metadata = await extractMultiChunkSegment(chunkMappings, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId);
    }

    logger.info('Segment extraction completed', {
      episodeId,
      clipId,
      order,
      segmentS3Key,
      trackName: useTrackName,
      duration: metadata.duration
    });

    return {
      episodeId,
      clipId,
      segmentFile: segmentS3Key,
      order,
      status: CLIP_STATUS.CREATED,
      metadata,
      trackSelection: trackSelection || {
        trackName: useTrackName,
        matchType: 'default',
        confidence: 1.0,
        reasoning: 'Default track selection'
      }
    };

  } catch (error) {
    logger.error('Segment extraction failed', {
      error: error.message,
      stack: error.stack,
      episodeId: event.episodeId,
      clipId: event.clipId,
      order: event.order
    });
    throw error;
  } finally {
    if (tempDir) {
      await cleanup(tempDir);
    }
  }
};

async function extractSingleChunkSegment(chunkMapping, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId) {
  const chunkLocalPath = join(tempDir, `chunk_${segmentIndex}.mp4`);
  const segmentLocalPath = join(tempDir, `segment_${segmentIndex}.mp4`);

  try {
    await downloadVideoFile(bucketName, chunkMapping.s3Key, chunkLocalPath);
    await extractVideoSegment(chunkLocalPath, segmentLocalPath, chunkMapping.startOffset, chunkMapping.duration);
    const uploadResult = await uploadSegmentFile(bucketName, episodeId, clipId, segmentIndex, segmentLocalPath, {
      'extraction-type': 'single-chunk',
      'source-chunk': chunkMapping.filename,
      'start-offset': chunkMapping.startOffset.toString(),
      'duration': chunkMapping.duration.toString()
    }, tenantId);
    await verifySegmentIntegrity(bucketName, segmentS3Key, uploadResult.fileSize);

    // Get file stats for metadata
    const stats = await fs.stat(segmentLocalPath);
    return {
      duration: chunkMapping.duration,
      fileSize: uploadResult.fileSize,
      resolution: uploadResult.resolution || "1920x1080" // Default resolution if not available
    };
  } finally {
    await cleanup(chunkLocalPath);
    await cleanup(segmentLocalPath);
  }
}

async function extractMultiChunkSegment(chunkMappings, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId) {
  const chunkParts = [];
  const segmentLocalPath = join(tempDir, `segment_${segmentIndex}.mp4`);

  try {
    for (let i = 0; i < chunkMappings.length; i++) {
      const chunkMapping = chunkMappings[i];
      const chunkLocalPath = join(tempDir, `chunk_${segmentIndex}_${i}.mp4`);
      const partLocalPath = join(tempDir, `part_${segmentIndex}_${i}.mp4`);

      await downloadVideoFile(bucketName, chunkMapping.s3Key, chunkLocalPath);
      await extractVideoSegment(chunkLocalPath, partLocalPath, chunkMapping.startOffset, chunkMapping.duration);
      chunkParts.push(partLocalPath);
      await cleanup(chunkLocalPath);
    }

    await concatenateVideoParts(chunkParts, segmentLocalPath);
    const uploadResult = await uploadSegmentFile(bucketName, episodeId, clipId, segmentIndex, segmentLocalPath, {
      'extraction-type': 'multi-chunk',
      'source-chunks': chunkMappings.map(m => m.filename).join(','),
      'chunk-count': chunkMappings.length.toString(),
      'total-duration': chunkMappings.reduce((sum, m) => sum + m.duration, 0).toString()
    }, tenantId);
    await verifySegmentIntegrity(bucketName, segmentS3Key, uploadResult.fileSize);

    // Get file stats for metadata
    const stats = await fs.stat(segmentLocalPath);
    const totalDuration = chunkMappings.reduce((sum, m) => sum + m.duration, 0);
    return {
      duration: totalDuration,
      fileSize: uploadResult.fileSize,
      resolution: uploadResult.resolution || "1920x1080" // Default resolution if not available
    };
  } finally {
    for (const partPath of chunkParts) {
      await cleanup(partPath);
    }
    await cleanup(segmentLocalPath);
  }
}

async function concatenateVideoParts(partPaths, outputPath) {
  const concatContent = partPaths.map(path => `file '${path}'`).join('\n');
  const concatFilePath = join(dirname(outputPath), 'concat.txt');

  await fs.writeFile(concatFilePath, concatContent);

  try {
    const args = [
      '-f', 'concat',
      '-safe', '0',
      '-i', concatFilePath,
      '-c', 'copy',
      '-avoid_negative_ts', 'make_zero',
      '-y',
      outputPath
    ];
    await execFFmpeg(args);
  } finally {
    await cleanup(concatFilePath);
  }
}
