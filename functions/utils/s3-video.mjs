import { Logger } from '@aws-lambda-powertools/logger';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { promises as fs } from 'fs';
import { createReadStream, createWriteStream } from 'fs';
import { pipeline } from 'stream/promises';
import { join } from 'path';

const logger = new Logger({ serviceName: 'utils' });

const s3 = new S3Client();

export const downloadVideoFile = async (bucket, key, localPath) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await s3.send(command);

    if (!response.Body) {
      throw new Error('No body in S3 response');
    }

    const writeStream = createWriteStream(localPath);
    await pipeline(response.Body, writeStream);

  } catch (error) {
    logger.error('Failed to download video file from S3', {
      error: error.message,
      stack: error.stack,
      bucket,
      key
    });
    throw new Error(`Failed to download video file from S3: ${error.message}`);
  }
};

export const uploadVideoFile = async (bucket, key, localPath) => {
  try {
    const stats = await fs.stat(localPath);
    const fileSize = stats.size;
    const readStream = createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: readStream,
      ContentType: 'video/mp4',
      Metadata: {
        'original-filename': localPath.split('/').pop(),
        'file-size': fileSize.toString()
      }
    });

    const response = await s3.send(command);

    return {
      s3Key: key,
      fileSize,
      etag: response.ETag
    };
  } catch (error) {
    logger.error('Failed to upload video file to S3', {
      error: error.message,
      stack: error.stack,
      bucket,
      key,
      localPath
    });
    throw new Error(`Failed to upload video file to S3: ${error.message}`);
  }
};

export const objectExists = async (bucket, key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await s3.send(command);
    return true;
  } catch (error) {
    if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
};

export const getS3FileSize = async (bucket, key) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await s3.send(command);
    return response.ContentLength || 0;
  } catch (error) {
    logger.error('Failed to get S3 file size', {
      error: error.message,
      stack: error.stack,
      bucket,
      key
    });
    throw new Error(`Failed to get S3 file size: ${error.message}`);
  }
};

export const createClipDirectoryStructure = (episodeId, clipId) => {
  const baseDir = `${episodeId}/clips/${clipId}`;

  return {
    baseDir,
    segmentsDir: `${baseDir}/segments`,
    finalClipPath: `${baseDir}/clip.mp4`,
    metadataPath: `${baseDir}/metadata.json`
  };
};

export const uploadSegmentFile = async (bucket, episodeId, clipId, segmentIndex, localPath, metadata = {}, tenantId = null) => {
  const { generateSegmentKey } = await import('./video-processing.mjs');
  const segmentKey = generateSegmentKey(episodeId, clipId, segmentIndex, tenantId);

  try {
    const stats = await fs.stat(localPath);
    const fileSize = stats.size;
    const readStream = createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: segmentKey,
      Body: readStream,
      ContentType: 'video/mp4',
      Metadata: {
        'episode-id': episodeId,
        'clip-id': clipId,
        'segment-index': segmentIndex.toString(),
        'file-size': fileSize.toString(),
        'upload-timestamp': new Date().toISOString(),
        ...metadata
      }
    });

    const response = await s3.send(command);

    return {
      s3Key: segmentKey,
      segmentIndex,
      fileSize,
      etag: response.ETag,
      uploadedAt: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Failed to upload segment file to S3', {
      error: error.message,
      stack: error.stack,
      bucket,
      episodeId,
      clipId,
      segmentIndex
    });
    throw new Error(`Failed to upload segment file to S3: ${error.message}`);
  }
};

export const batchUploadSegments = async (bucket, episodeId, clipId, segmentFiles) => {
  const results = [];
  const errors = [];

  for (const { index, localPath, metadata = {} } of segmentFiles) {
    try {
      const result = await uploadSegmentFile(bucket, episodeId, clipId, index, localPath, metadata);
      results.push(result);
    } catch (error) {
      logger.error('Failed to upload segment in batch', {
        error: error.message,
        stack: error.stack,
        index
      });
      errors.push({ index, error: error.message });
    }
  }

  if (errors.length > 0) {
    logger.error('Multiple segments failed to upload', {
      errorCount: errors.length,
      totalSegments: segmentFiles.length,
      errors
    });
    throw new Error(`Failed to upload ${errors.length} out of ${segmentFiles.length} segments`);
  }

  return results;
};

export const downloadSegmentFiles = async (bucket, segmentKeys, tempDir, options = {}) => {
  const { maxRetries = 3, retryDelay = 1000 } = options;

  if (!Array.isArray(segmentKeys) || segmentKeys.length === 0) {
    throw new Error('Segment keys array is required and must not be empty');
  }

  const localFiles = [];
  const errors = [];

  for (let i = 0; i < segmentKeys.length; i++) {
    const segmentKey = segmentKeys[i];
    const localPath = join(tempDir, `segment_${i.toString().padStart(3, '0')}.mp4`);

    let lastError = null;
    let success = false;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await downloadVideoFile(bucket, segmentKey, localPath);

        const stats = await fs.stat(localPath);
        if (stats.size === 0) {
          throw new Error(`Downloaded segment is empty: ${segmentKey}`);
        }

        localFiles.push(localPath);
        success = true;
        break;

      } catch (error) {
        lastError = error;
        logger.error('Failed to download segment', {
          error: error.message,
          segmentIndex: i,
          attempt,
          segmentKey
        });

        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (!success) {
      errors.push({ index: i, segmentKey, error: lastError.message });
    }
  }

  if (errors.length > 0) {
    logger.error('Multiple segments failed to download', {
      errorCount: errors.length,
      totalSegments: segmentKeys.length,
      errors
    });
    throw new Error(`Failed to download ${errors.length} out of ${segmentKeys.length} segments`);
  }

  return localFiles;
};

export const cleanupSegmentFiles = async (bucket, segmentKeys, options = {}) => {
  const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
  const { dryRun = false, maxRetries = 3 } = options;

  if (!Array.isArray(segmentKeys) || segmentKeys.length === 0) {
    return { deleted: 0, failed: 0, skipped: segmentKeys?.length || 0 };
  }

  if (dryRun) {
    return { deleted: 0, failed: 0, skipped: segmentKeys.length };
  }

  const results = { deleted: 0, failed: 0, errors: [] };

  try {
    const batchSize = 1000;
    const batches = [];

    for (let i = 0; i < segmentKeys.length; i += batchSize) {
      batches.push(segmentKeys.slice(i, i + batchSize));
    }

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      let lastError = null;
      let success = false;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          const deleteParams = {
            Bucket: bucket,
            Delete: {
              Objects: batch.map(key => ({ Key: key })),
              Quiet: false
            }
          };

          const response = await s3.send(new DeleteObjectsCommand(deleteParams));

          const deletedCount = response.Deleted?.length || 0;
          const errorCount = response.Errors?.length || 0;

          results.deleted += deletedCount;
          results.failed += errorCount;

          if (response.Errors && response.Errors.length > 0) {
            results.errors.push(...response.Errors);
          }

          success = true;
          break;

        } catch (error) {
          lastError = error;
          logger.error('Failed to delete batch', {
            error: error.message,
            batchIndex: batchIndex + 1,
            attempt
          });

          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }

      if (!success) {
        results.failed += batch.length;
        results.errors.push({
          Code: 'BatchDeleteFailed',
          Message: lastError?.message || 'Unknown error',
          Keys: batch
        });
      }
    }

    if (results.failed > 0) {
      logger.warn('Some segment files could not be deleted. This may result in storage costs but does not affect functionality.', {
        failedCount: results.failed
      });
    }

    return results;

  } catch (error) {
    logger.error('Critical error during segment cleanup', {
      error: error.message,
      stack: error.stack,
      segmentCount: segmentKeys.length
    });
    results.failed = segmentKeys.length;
    results.errors.push({
      Code: 'CleanupFailed',
      Message: error.message
    });
    return results;
  }
};

export const cleanupLocalFiles = async (filePaths) => {
  if (!Array.isArray(filePaths) || filePaths.length === 0) {
    return { deleted: 0, failed: 0 };
  }

  const results = { deleted: 0, failed: 0, errors: [] };

  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      results.deleted++;
    } catch (error) {
      results.failed++;
      results.errors.push({ filePath, error: error.message });
      logger.warn('Failed to cleanup local file', {
        filePath,
        error: error.message
      });
    }
  }

  return results;
};

export const uploadFinalClip = async (bucket, episodeId, clipId, localPath, metadata = {}, tenantId = null) => {
  const { generateClipKey } = await import('./video-processing.mjs');
  const clipKey = generateClipKey(episodeId, clipId, tenantId);

  try {
    const stats = await fs.stat(localPath);
    const fileSize = stats.size;
    const readStream = createReadStream(localPath);

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: clipKey,
      Body: readStream,
      ContentType: 'video/mp4',
      Metadata: {
        'episode-id': episodeId,
        'clip-id': clipId,
        'file-size': fileSize.toString(),
        'upload-timestamp': new Date().toISOString(),
        'content-type': 'final-clip',
        'duration': metadata.duration || '00:00:00',
        'duration-seconds': (metadata.durationSeconds || 0).toString(),
        'resolution': metadata.resolution || '0x0',
        'width': (metadata.width || 0).toString(),
        'height': (metadata.height || 0).toString(),
        'video-codec': metadata.videoCodec || 'unknown',
        'audio-codec': metadata.audioCodec || 'unknown',
        'bit-rate': (metadata.bitRate || 0).toString(),
        'frame-rate': metadata.frameRate || '0/1',
        'sample-rate': (metadata.sampleRate || 0).toString(),
        'channels': (metadata.channels || 0).toString(),
        'segment-count': (metadata.segmentCount || 0).toString(),
        'ffmpeg-version': metadata.ffmpegVersion || 'unknown'
      }
    });

    const response = await s3.send(command);

    return {
      s3Key: clipKey,
      fileSize,
      etag: response.ETag,
      uploadedAt: new Date().toISOString(),
      metadata: {
        ...metadata,
        s3Key: clipKey,
        uploadedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    logger.error('Failed to upload final clip to S3', {
      error: error.message,
      stack: error.stack,
      bucket,
      episodeId,
      clipId
    });
    throw new Error(`Failed to upload final clip to S3: ${error.message}`);
  }
};

export const verifySegmentIntegrity = async (bucket, key, expectedSize) => {
  try {
    const actualSize = await getS3FileSize(bucket, key);

    if (actualSize !== expectedSize) {
      logger.error('Size mismatch for segment', {
        key,
        expectedSize,
        actualSize
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Failed to verify segment integrity', {
      error: error.message,
      stack: error.stack,
      key
    });
    return false;
  }
};

export const verifyFinalClipIntegrity = async (bucket, key, expectedSize, expectedMetadata = {}) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const response = await s3.send(command);
    const actualSize = response.ContentLength || 0;
    const metadata = response.Metadata || {};

    const results = {
      exists: true,
      sizeMatch: actualSize === expectedSize,
      expectedSize,
      actualSize,
      metadata: metadata,
      metadataChecks: {}
    };

    const metadataChecks = [
      'episode-id',
      'clip-id',
      'duration',
      'resolution',
      'video-codec'
    ];

    for (const field of metadataChecks) {
      const expected = expectedMetadata[field];
      const actual = metadata[field];
      results.metadataChecks[field] = {
        expected,
        actual,
        match: expected ? actual === expected : true
      };
    }

    const allMetadataValid = Object.values(results.metadataChecks)
      .every(check => check.match);

    results.valid = results.sizeMatch && allMetadataValid;

    return results;

  } catch (error) {
    logger.error('Failed to verify final clip integrity', {
      error: error.message,
      stack: error.stack,
      key
    });
    return {
      exists: false,
      valid: false,
      error: error.message
    };
  }
};

export const cleanupEmptyFolders = async (bucket, folderPaths, options = {}) => {
  const { ListObjectsV2Command, DeleteObjectCommand } = await import('@aws-sdk/client-s3');
  const { dryRun = false, maxRetries = 3 } = options;

  if (!Array.isArray(folderPaths) || folderPaths.length === 0) {
    return { cleaned: 0, failed: 0, skipped: 0 };
  }

  const results = { cleaned: 0, failed: 0, skipped: 0, errors: [] };

  for (const folderPath of folderPaths) {
    try {
      const prefix = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;

      const listCommand = new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        MaxKeys: 1
      });

      const listResponse = await s3.send(listCommand);

      if (!listResponse.Contents || listResponse.Contents.length === 0) {
        if (dryRun) {
          results.skipped++;
          continue;
        }

        let success = false;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          try {
            const deleteCommand = new DeleteObjectCommand({
              Bucket: bucket,
              Key: prefix
            });

            await s3.send(deleteCommand);
            results.cleaned++;
            success = true;
            break;

          } catch (error) {
            lastError = error;
            if (error.name === 'NoSuchKey' || error.$metadata?.httpStatusCode === 404) {
              results.cleaned++;
              success = true;
              break;
            }

            if (attempt < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }

        if (!success) {
          results.failed++;
          results.errors.push({
            folder: folderPath,
            error: lastError?.message || 'Unknown error'
          });
        }
      } else {
        results.skipped++;
      }

    } catch (error) {
      results.failed++;
      results.errors.push({
        folder: folderPath,
        error: error.message
      });
    }
  }

  return results;
};
