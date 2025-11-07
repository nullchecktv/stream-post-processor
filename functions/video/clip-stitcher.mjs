import { Logger } from '@aws-lambda-powertools/logger';
import { createConcatFileContent, secondsToTime } from '../utils/video-processing.mjs';
import { downloadSegmentFiles, uploadFinalClip, cleanupSegmentFiles, verifyFinalClipIntegrity, cleanupEmptyFolders } from '../utils/s3-video.mjs';
import { execFFmpeg, getVideoInfo, createTempDir, cleanup, checkFFmpegAvailability } from '../utils/ffmpeg.mjs';
import { DynamoDBClient, DeleteItemCommand } from '@aws-sdk/client-dynamodb';
import { join } from 'path';
import { promises as fs } from 'fs';

const logger = new Logger({ serviceName: 'video' });
const ddb = new DynamoDBClient();

export const handler = async (event) => {
  let tempDir = null;

  try {
    const { tenantId, episodeId, clipId, segments } = event;

    if (!tenantId) {
      logger.error('Missing tenantId in event');
      throw new Error('Unauthorized');
    }

    if (!episodeId || !clipId || !Array.isArray(segments)) {
      throw new Error('Missing required parameters: episodeId, clipId, segments');
    }

    if (segments.length === 0) {
      throw new Error('No segments provided for stitching');
    }

    // Extract segment file paths from the new format
    const segmentFiles = segments.map(segment => segment.segmentFile);

    const ffmpegVersion = await checkFFmpegAvailability();
    tempDir = await createTempDir('clip-stitching-');
    const bucketName = process.env.BUCKET_NAME;

    const localSegments = await downloadSegmentFiles(bucketName, segmentFiles, tempDir, {
      maxRetries: 3,
      retryDelay: 1000
    });

    const concatFile = await createConcatFile(localSegments, tempDir);
    const outputFile = join(tempDir, `${clipId}.mp4`);
    await stitchSegments(concatFile, outputFile);

    const metadata = await extractVideoMetadata(outputFile);

    const uploadResult = await uploadFinalClip(bucketName, episodeId, clipId, outputFile, {
      ...metadata,
      segmentCount: segmentFiles.length,
      ffmpegVersion
    }, tenantId);

    const verificationResult = await verifyFinalClipIntegrity(
      bucketName,
      uploadResult.s3Key,
      uploadResult.fileSize,
      {
        'episode-id': episodeId,
        'clip-id': clipId,
        'duration': metadata.duration,
        'resolution': metadata.resolution,
        'video-codec': metadata.videoCodec
      }
    );

    const shouldCleanUp = process.env.CLEAN_SEGMENTS === 'true';
    if (shouldCleanUp) {
      await cleanupSegmentFiles(bucketName, segmentFiles, { maxRetries: 2 });
      await cleanupSegmentRecords(tenantId, episodeId, clipId, segments);
      await cleanupEmptySegmentFolders(bucketName, tenantId, episodeId, clipId);
    }

    return {
      episodeId,
      clipId,
      clipS3Key: uploadResult.s3Key,
      fileSize: uploadResult.fileSize,
      duration: metadata.duration,
      resolution: metadata.resolution,
      metadata: {
        ...metadata,
        segmentCount: segmentFiles.length,
        processedAt: new Date().toISOString(),
        uploadedAt: uploadResult.uploadedAt
      },
      status: 'completed'
    };

  } catch (error) {
    logger.error('Clip stitching failed', {
      error: error.message,
      stack: error.stack,
      episodeId: event.episodeId,
      clipId: event.clipId
    });
    throw error;
  } finally {
    if (tempDir) {
      await cleanup(tempDir);
    }
  }
};

async function createConcatFile(segmentPaths, tempDir) {
  const concatFilePath = join(tempDir, 'concat.txt');
  const concatContent = createConcatFileContent(segmentPaths);

  await fs.writeFile(concatFilePath, concatContent);

  const stats = await fs.stat(concatFilePath);
  if (stats.size === 0) {
    throw new Error('Created concat file is empty');
  }

  return concatFilePath;
}

async function stitchSegments(concatFile, outputFile) {
  const args = [
    '-f', 'concat',
    '-safe', '0',
    '-i', concatFile,
    '-c', 'copy',
    '-avoid_negative_ts', 'make_zero',
    '-y',
    outputFile
  ];

  await execFFmpeg(args);

  const stats = await fs.stat(outputFile);
  if (stats.size === 0) {
    throw new Error('FFmpeg produced empty output file');
  }
}

async function extractVideoMetadata(filePath) {
  try {
    const videoInfo = await getVideoInfo(filePath);
    const format = videoInfo.format || {};
    const videoStream = videoInfo.streams?.find(stream => stream.codec_type === 'video') || {};
    const audioStream = videoInfo.streams?.find(stream => stream.codec_type === 'audio') || {};

    const duration = parseFloat(format.duration) || 0;
    const fileSize = parseInt(format.size) || 0;
    const bitRate = parseInt(format.bit_rate) || 0;

    const width = videoStream.width || 0;
    const height = videoStream.height || 0;
    const frameRate = videoStream.r_frame_rate || '0/1';
    const videoCodec = videoStream.codec_name || 'unknown';
    const pixelFormat = videoStream.pix_fmt || 'unknown';

    const audioCodec = audioStream.codec_name || 'unknown';
    const sampleRate = parseInt(audioStream.sample_rate) || 0;
    const channels = audioStream.channels || 0;
    const audioBitRate = parseInt(audioStream.bit_rate) || 0;

    const aspectRatio = width && height ? (width / height).toFixed(2) : '0.00';
    const isHD = width >= 1280 && height >= 720;
    const isFullHD = width >= 1920 && height >= 1080;
    const is4K = width >= 3840 && height >= 2160;

    return {
      duration: secondsToTime(duration),
      durationSeconds: duration,
      fileSize,
      bitRate,
      resolution: `${width}x${height}`,
      width,
      height,
      aspectRatio,
      frameRate,
      videoCodec,
      pixelFormat,
      audioCodec,
      sampleRate,
      channels,
      audioBitRate,
      isHD,
      isFullHD,
      is4K,
      streamCount: videoInfo.streams?.length || 0,
      hasVideo: !!videoStream.codec_name,
      hasAudio: !!audioStream.codec_name,
      formatName: format.format_name || 'unknown',
      formatLongName: format.format_long_name || 'unknown',
      extractedAt: new Date().toISOString()
    };

  } catch (error) {
    logger.error('Failed to extract video metadata', {
      error: error.message,
      stack: error.stack,
      filePath
    });

    let fileSize = 0;
    try {
      const stats = await fs.stat(filePath);
      fileSize = stats.size;
    } catch (statError) {
      logger.error('Failed to get file stats', {
        error: statError.message,
        stack: statError.stack,
        filePath
      });
    }

    return {
      duration: '00:00:00',
      durationSeconds: 0,
      fileSize,
      bitRate: 0,
      resolution: '0x0',
      width: 0,
      height: 0,
      aspectRatio: '0.00',
      frameRate: '0/1',
      videoCodec: 'unknown',
      pixelFormat: 'unknown',
      audioCodec: 'unknown',
      sampleRate: 0,
      channels: 0,
      audioBitRate: 0,
      isHD: false,
      isFullHD: false,
      is4K: false,
      streamCount: 0,
      hasVideo: false,
      hasAudio: false,
      formatName: 'unknown',
      formatLongName: 'unknown',
      extractedAt: new Date().toISOString(),
      metadataError: error.message
    };
  }
}

async function cleanupSegmentRecords(tenantId, episodeId, clipId, segments) {
  const results = {
    deleted: [],
    failed: []
  };

  for (const segment of segments) {
    try {
      const segmentKey = {
        pk: { S: `${tenantId}#${episodeId}` },
        sk: { S: `segment#${clipId}#${segment.order}` }
      };

      await ddb.send(new DeleteItemCommand({
        TableName: process.env.TABLE_NAME,
        Key: segmentKey
      }));

      results.deleted.push(`segment#${clipId}#${segment.order}`);
      logger.info('Deleted segment record', {
        segmentKey: `segment#${clipId}#${segment.order}`,
        clipId,
        order: segment.order
      });

    } catch (error) {
      logger.error('Failed to delete segment record', {
        error: error.message,
        stack: error.stack,
        segmentKey: `segment#${clipId}#${segment.order}`,
        clipId,
        order: segment.order
      });
      results.failed.push({
        segmentKey: `segment#${clipId}#${segment.order}`,
        error: error.message
      });
    }
  }

  logger.info('Segment record cleanup completed', {
    deletedCount: results.deleted.length,
    failedCount: results.failed.length,
    clipId
  });
  return results;
}

async function cleanupEmptySegmentFolders(bucketName, tenantId, episodeId, clipId) {
  const foldersToClean = [
    `${tenantId}/${episodeId}/clips/${clipId}/segments`,
    `${tenantId}/${episodeId}/clips/${clipId}`
  ];

  try {
    const cleanupResults = await cleanupEmptyFolders(bucketName, foldersToClean, {
      maxRetries: 2
    });

    logger.info('Folder cleanup completed', {
      cleaned: cleanupResults.cleaned,
      failed: cleanupResults.failed,
      skipped: cleanupResults.skipped,
      clipId
    });
    return cleanupResults;

  } catch (error) {
    logger.error('Failed to cleanup empty folders', {
      error: error.message,
      stack: error.stack,
      foldersToClean,
      clipId
    });
    return {
      cleaned: 0,
      failed: foldersToClean.length,
      skipped: 0,
      errors: [{ error: error.message }]
    };
  }
}
