import { loadHlsManifest, calculateChunkMapping, validateSegmentTiming, generateSegmentKey } from '../utils/video-processing.mjs';
import { extractVideoSegment, createTempDir, cleanup, checkFFmpegAvailability, execFFmpeg } from '../utils/ffmpeg.mjs';
import { downloadVideoFile, uploadSegmentFile, objectExists, verifySegmentIntegrity, getS3FileSize } from '../utils/s3-video.mjs';
import { selectTrackForSpeaker } from '../utils/track-selection.mjs';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

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
    console.error(`Failed to get segment metadata for ${segmentS3Key}:`, error);
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
    const { tenantId, episodeId, trackName = 'main', clipId, segment } = event;

    if (!tenantId) {
      console.error('Missing tenantId in event');
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

    const ffmpegVersion = await checkFFmpegAvailability();
    tempDir = await createTempDir('segment-extraction-');
    const bucketName = process.env.BUCKET_NAME;

    // Simple track selection: if segment has a speaker, try to find their track
    let useTrackName = trackName;
    if (segment.speaker) {
      try {
        const speakerTrack = await selectTrackForSpeaker(episodeId, segment.speaker, tenantId);
        if (speakerTrack) {
          useTrackName = speakerTrack.trackName;
          console.log(`Using track '${useTrackName}' for speaker '${segment.speaker}'`);
        }
      } catch (error) {
        console.warn(`Failed to find track for speaker '${segment.speaker}', using default: ${error.message}`);
      }
    }

    const manifest = await loadHlsManifest(episodeId, useTrackName, tenantId);
    const chunkMappings = calculateChunkMapping(segment, manifest.segments);

    if (chunkMappings.length === 0) {
      throw new Error(`No chunks found for segment (${segment.startTime} - ${segment.endTime})`);
    }

    // Use segmentIndex 0 since we're processing a single segment
    const segmentIndex = 0;
    const segmentS3Key = generateSegmentKey(episodeId, clipId, segmentIndex, tenantId);

    const segmentExists = await objectExists(bucketName, segmentS3Key);
    if (segmentExists) {
      // Return existing segment metadata
      const metadata = await getSegmentMetadata(bucketName, segmentS3Key);
      return {
        episodeId,
        clipId,
        segmentFile: segmentS3Key,
        status: 'completed',
        metadata
      };
    }

    let metadata;
    if (chunkMappings.length === 1) {
      metadata = await extractSingleChunkSegment(chunkMappings[0], segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId);
    } else {
      metadata = await extractMultiChunkSegment(chunkMappings, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId, tenantId);
    }

    return {
      episodeId,
      clipId,
      segmentFile: segmentS3Key,
      status: 'completed',
      metadata
    };

  } catch (error) {
    console.error('Segment extraction failed:', error);
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
