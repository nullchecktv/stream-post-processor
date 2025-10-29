import { loadHlsManifest, calculateChunkMapping, validateSegmentTiming, generateSegmentKey } from '../utils/video-processing.mjs';
import { extractVideoSegment, createTempDir, cleanup, checkFFmpegAvailability, execFFmpeg } from '../utils/ffmpeg.mjs';
import { downloadVideoFile, uploadSegmentFile, objectExists, verifySegmentIntegrity } from '../utils/s3-video.mjs';
import { selectTrackForSpeaker } from '../utils/track-selection.mjs';
import { join, dirname } from 'path';
import { promises as fs } from 'fs';

export const handler = async (event) => {
  let tempDir = null;

  try {
    const { tenantId, episodeId, trackName = 'main', clipId, segments } = event;

    if (!tenantId) {
      console.error('Missing tenantId in event');
      throw new Error('Unauthorized');
    }

    if (!episodeId || !clipId || !Array.isArray(segments)) {
      throw new Error('Missing required parameters: episodeId, clipId, segments');
    }

    segments.forEach((segment, index) => {
      try {
        validateSegmentTiming(segment);
      } catch (error) {
        throw new Error(`Invalid segment ${index}: ${error.message}`);
      }
    });

    const ffmpegVersion = await checkFFmpegAvailability();
    tempDir = await createTempDir('segment-extraction-');
    const segmentFiles = [];
    const bucketName = process.env.BUCKET_NAME;

    for (let segmentIndex = 0; segmentIndex < segments.length; segmentIndex++) {
      const segment = segments[segmentIndex];

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
        throw new Error(`No chunks found for segment ${segmentIndex} (${segment.startTime} - ${segment.endTime})`);
      }

      const segmentS3Key = generateSegmentKey(episodeId, clipId, segmentIndex, tenantId);
      segmentFiles.push(segmentS3Key);

      const segmentExists = await objectExists(bucketName, segmentS3Key);
      if (segmentExists) {
        continue;
      }

      if (chunkMappings.length === 1) {
        await extractSingleChunkSegment(chunkMappings[0], segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId);
      } else {
        await extractMultiChunkSegment(chunkMappings, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId);
      }
    }

    return {
      episodeId,
      clipId,
      segmentFiles,
      totalSegments: segments.length,
      status: 'completed',
      ffmpegVersion
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

async function extractSingleChunkSegment(chunkMapping, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId) {
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
  } finally {
    await cleanup(chunkLocalPath);
    await cleanup(segmentLocalPath);
  }
}

async function extractMultiChunkSegment(chunkMappings, segmentS3Key, bucketName, tempDir, segmentIndex, episodeId, clipId) {
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
