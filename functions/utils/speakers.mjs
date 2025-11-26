import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { formatResponse } from './api.mjs';

const logger = new Logger({ serviceName: 'speakers' });
const bedrock = new BedrockRuntimeClient();
const ddb = new DynamoDBClient();
const s3 = new S3Client();

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

/**
 * Match transcript speaker names to episode speaker names using LLM-based fuzzy matching
 *
 * Uses AWS Bedrock (Amazon Nova Lite) to intelligently match speaker names even when
 * they differ in spelling, capitalization, formatting, or use nicknames/abbreviations.
 *
 * This function is useful for:
 * - Analyzing transcript speaker discrepancies
 * - Suggesting speaker name corrections
 * - Understanding speaker name variations
 *
 * NOTE: This function is NOT used in the video processing pipeline. For video processing,
 * use selectTrackForSegment from track-selection.mjs which handles track selection with
 * automatic fallbacks.
 *
 * @param {Array<string>} transcriptSpeakers - Speaker names found in transcript
 * @param {Array<string>} episodeSpeakers - Canonical episode speaker names
 * @returns {Promise<Object>} Match result with matches, unmatched, and suggestion
 *
 * @example
 * const result = await matchSpeakers(
 *   ['bob', 'alice j'],
 *   ['Bob Smith', 'Alice Johnson']
 * );
 * // Returns: {
 * //   matches: [
 * //     { transcriptName: 'bob', episodeName: 'Bob Smith', confidence: 'high' },
 * //     { transcriptName: 'alice j', episodeName: 'Alice Johnson', confidence: 'medium' }
 * //   ],
 * //   unmatched: [],
 * //   suggestion: null
 * // }
 *
 * Error Handling:
 * - Retries up to MAX_RETRIES times on retryable errors (throttling, 5xx errors)
 * - Returns empty matches and all speakers as unmatched on failure
 * - Logs detailed error information for debugging
 */
export const matchSpeakers = async (transcriptSpeakers, episodeSpeakers) => {
  if (!transcriptSpeakers || transcriptSpeakers.length === 0) {
    return {
      matches: [],
      unmatched: []
    };
  }

  if (!episodeSpeakers || episodeSpeakers.length === 0) {
    return {
      matches: [],
      unmatched: transcriptSpeakers
    };
  }

  const systemPrompt = `You are a speaker name matching assistant. Your job is to match speaker names from a transcript to a canonical list of episode speakers.

Rules:
- Match speakers even if spelling, capitalization, or formatting differs
- Handle nicknames, abbreviations, and variations (e.g., "Bob" matches "Robert Smith", "Dr. Smith" matches "John Smith")
- Return exact matches from the episode speaker list when you find a match
- If no match is found, return the transcript name unchanged in the unmatched list
- Provide confidence scores: "high" for exact or very close matches, "medium" for likely matches with variations, "low" for uncertain matches
- Be generous with matching - prefer false positives over false negatives

Respond with JSON only in this exact format:
{
  "matches": [
    {"transcriptName": "bob", "episodeName": "Bob Smith", "confidence": "high"},
    {"transcriptName": "alice j", "episodeName": "Alice Johnson", "confidence": "medium"}
  ],
  "unmatched": ["Charlie"]
}`;

  const userPrompt = `Transcript speakers: ${JSON.stringify(transcriptSpeakers)}
Episode speakers: ${JSON.stringify(episodeSpeakers)}

Match the transcript speakers to episode speakers. Return only valid JSON.`;

  let lastError;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        logger.info('Retrying speaker matching', { attempt, maxRetries: MAX_RETRIES });
        await sleep(RETRY_DELAY_MS * attempt);
      }

      logger.info('Invoking Bedrock for speaker matching', {
        transcriptSpeakers,
        episodeSpeakers,
        modelId: process.env.SPEAKER_MATCHING_MODEL_ID || 'amazon.nova-lite-v1:0',
        attempt
      });

      const response = await bedrock.send(new ConverseCommand({
        modelId: process.env.SPEAKER_MATCHING_MODEL_ID || 'amazon.nova-lite-v1:0',
        messages: [{
          role: 'user',
          content: [{ text: userPrompt }]
        }],
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          temperature: 0.1,
          maxTokens: 2000
        }
      }));

      const responseText = response.output.message.content[0].text;
      logger.info('Bedrock response received', { responseText });

      const result = JSON.parse(responseText);

      const matches = result.matches || [];
      const unmatched = result.unmatched || [];

      return {
        matches,
        unmatched,
        suggestion: generateSuggestion(unmatched)
      };
    } catch (error) {
      lastError = error;

      const isRetryable = error.name === 'ThrottlingException' ||
                          error.name === 'ServiceUnavailableException' ||
                          error.name === 'TimeoutError' ||
                          error.$metadata?.httpStatusCode >= 500;

      if (!isRetryable || attempt === MAX_RETRIES) {
        logger.error('Error matching speakers with Bedrock', {
          error: error.message,
          errorName: error.name,
          stack: error.stack,
          transcriptSpeakers,
          episodeSpeakers,
          attempt,
          isRetryable
        });
        break;
      }

      logger.warn('Retryable error in speaker matching', {
        error: error.message,
        errorName: error.name,
        attempt,
        willRetry: true
      });
    }
  }

  return {
    matches: [],
    unmatched: transcriptSpeakers,
    suggestion: generateSuggestion(transcriptSpeakers)
  };
};

const generateSuggestion = (unmatchedSpeakers) => {
  if (!unmatchedSpeakers || unmatchedSpeakers.length === 0) {
    return null;
  }

  if (unmatchedSpeakers.length === 1) {
    return `Consider adding "${unmatchedSpeakers[0]}" to the episode speakers list.`;
  }

  return `Consider adding these speakers to the episode: ${unmatchedSpeakers.join(', ')}`;
};
