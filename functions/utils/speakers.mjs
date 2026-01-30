import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '@aws-lambda-powertools/logger';

const logger = new Logger({ serviceName: 'speakers' });
const s3 = new S3Client();

/**
 * Extract speaker names from a transcript file stored in S3
 *
 * Parses transcript content to identify unique speaker names using common patterns:
 * - "Speaker Name: text" format
 * - "[Speaker Name] text" format
 * - "<Speaker Name> text" format
 *
 * @param {string} s3Key - S3 object key for the transcript file
 * @returns {Promise<Array<string>>} Array of unique speaker names found in transcript
 *
 * @example
 * const speakers = await extractSpeakersFromTranscript('tenant123/episode-id/transcript.srt');
 * // Returns: ['Alice Johnson', 'Bob Smith', 'Charlie Davis']
 */
export const extractSpeakersFromTranscript = async (s3Key) => {
  try {
    const transcriptContent = await downloadFromS3(s3Key);

    if (!transcriptContent || transcriptContent.trim().length === 0) {
      logger.error('Empty transcript content', { s3Key });
      return [];
    }

    const lines = transcriptContent.split('\n');
    const speakers = new Set();

    const speakerPatterns = [
      /^([A-Za-z\s]+):\s*/,
      /^\[([A-Za-z\s]+)\]\s*/,
      /^<([A-Za-z\s]+)>\s*/
    ];

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.length === 0) continue;

      for (const pattern of speakerPatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          const speaker = match[1].trim();
          if (speaker.length > 0 && speaker.length <= 100) {
            speakers.add(speaker);
          }
          break;
        }
      }
    }

    return Array.from(speakers);
  } catch (error) {
    logger.error('Failed to extract speakers from transcript', {
      error: error.message,
      stack: error.stack,
      s3Key
    });
    return [];
  }
};

const downloadFromS3 = async (s3Key) => {
  try {
    const response = await s3.send(new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: s3Key
    }));

    if (!response.Body) {
      throw new Error('Empty S3 object body');
    }

    return await response.Body.transformToString();
  } catch (error) {
    logger.error('Failed to download transcript from S3', {
      error: error.message,
      s3Key
    });
    throw error;
  }
};
