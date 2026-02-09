import { Logger } from '@aws-lambda-powertools/logger';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { unmarshall } from '@aws-sdk/util-dynamodb';
import { TRACK_STATUS } from '../../schemas/tracks.mjs';

const logger = new Logger({ serviceName: 'utils' });

const s3 = new S3Client();
const ddb = new DynamoDBClient();
const transcriptCache = new Map();

export const loadTranscript = async (key) => {
  try {
    const cached = transcriptCache.get(key);
    if (cached) {
      return cached;
    }

    const res = await s3.send(new GetObjectCommand({ Bucket: process.env.BUCKET_NAME, Key: key }));
    if (!res.Body) throw new Error('Empty S3 object body');
    const text = await res.Body.transformToString();

    transcriptCache.set(key, text);
    return text;
  } catch (err) {
    logger.error('Failed to load transcript', {
      error: err.message,
      stack: err.stack,
      bucket: process.env.BUCKET_NAME,
      key
    });
    return '';
  }
};

export const parseSrtEntry = (entry) => {
  const lines = entry.trim().split('\n');
  if (lines.length < 3) return null;

  const sequenceNumber = parseInt(lines[0]);
  if (isNaN(sequenceNumber)) return null;

  const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})/);
  if (!timeMatch) return null;

  const startTime = timeMatch[1];
  const endTime = timeMatch[2];
  const text = lines.slice(2).join(' ').trim();

  return {
    sequenceNumber,
    startTime,
    endTime,
    text
  };
};

export const extractSpeakerFromText = (text) => {
  const speakerMatch = text.match(/^([A-Za-z]+):\s*(.*)$/);
  if (speakerMatch) {
    return {
      speaker: speakerMatch[1],
      text: speakerMatch[2].trim()
    };
  }
  return { speaker: null, text };
};

export const timeToSeconds = (timeStr) => {
  const [time, ms] = timeStr.split(',');
  const [hours, minutes, seconds] = time.split(':').map(Number);
  return hours * 3600 + minutes * 60 + seconds + parseInt(ms) / 1000;
};

export const secondsToTime = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const ms = Math.round((totalSeconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
};

const isFillerText = (text) => {
  const cleaned = text.trim().toLowerCase();
  if (cleaned.length <= 2) return true;

  const fillerWords = ['uh', 'um', 'ah', 'er', 'hmm'];
  return fillerWords.includes(cleaned.replace(/[.,!?]/g, ''));
};

export const preprocessTranscript = (rawSrt) => {
  const entries = rawSrt.split(/\n\s*\n/).map(parseSrtEntry).filter(Boolean);

  if (entries.length === 0) return rawSrt;

  const mergedSegments = [];
  let currentSegment = null;
  let currentSpeaker = null;

  for (const entry of entries) {
    const { speaker, text } = extractSpeakerFromText(entry.text);

    if (!text.trim()) continue;

    const actualSpeaker = speaker || currentSpeaker;

    if (currentSegment &&
        actualSpeaker === currentSpeaker &&
        timeToSeconds(entry.startTime) - timeToSeconds(currentSegment.endTime) < 2.0) {

      if (!isFillerText(text)) {
        currentSegment.text += ' ' + text;
      }
      currentSegment.endTime = entry.endTime;
    } else {
      if (currentSegment && !isFillerText(currentSegment.text)) {
        mergedSegments.push(currentSegment);
      }

      currentSegment = {
        startTime: entry.startTime,
        endTime: entry.endTime,
        speaker: actualSpeaker,
        text: text
      };
      currentSpeaker = actualSpeaker;
    }
  }

  if (currentSegment && !isFillerText(currentSegment.text)) {
    mergedSegments.push(currentSegment);
  }

  return mergedSegments
    .filter(segment => segment.text.trim().length > 0 && !isFillerText(segment.text))
    .map(segment => {
      const speakerPrefix = segment.speaker ? `${segment.speaker}: ` : '';
      return `${segment.startTime} --> ${segment.endTime}\n${speakerPrefix}${segment.text}`;
    })
    .join('\n\n');
};

export const loadAndPreprocessTranscript = async (key) => {
  const rawTranscript = await loadTranscript(key);
  if (!rawTranscript) return '';

  return preprocessTranscript(rawTranscript);
};

export const parseSrtFile = (content) => {
  if (!content || typeof content !== 'string') {
    return [];
  }

  const entries = content.split(/\n\s*\n/).filter(block => block.trim());
  const parsed = [];

  for (const entry of entries) {
    const result = parseSrtEntry(entry);
    if (result) {
      parsed.push(result);
    }
  }

  return parsed;
};

export const detectSpeaker = (text) => {
  if (!text || typeof text !== 'string') {
    return { speaker: null, dialogue: text || '' };
  }

  const speakerMatch = text.match(/^([A-Za-z][A-Za-z\s]*?):\s*(.*)$/);
  if (speakerMatch) {
    const dialogue = speakerMatch[2].trim();
    if (dialogue.length === 0) {
      return { speaker: null, dialogue: text };
    }
    return {
      speaker: speakerMatch[1].trim(),
      dialogue
    };
  }

  return { speaker: null, dialogue: text };
};

const TRUE_FILLER_WORDS = ['um', 'uh', 'uhm', 'ah', 'er', 'hmm', 'hm', 'mm', 'mmm'];

const CONTEXTUAL_FILLER_WORDS = [
  'you know', 'i mean', 'like',
  'sort of', 'kind of', 'pretty much',
  'basically', 'essentially', 'practically',
  'actually', 'literally', 'in fact',
  'well', 'so', 'right', 'now', 'just', 'really',
  'okay', 'yeah',
  'to be honest', 'honestly', 'frankly'
];

export const removeFillerWords = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let result = text;

  const trueFillerPattern = new RegExp(
    `\\b(${TRUE_FILLER_WORDS.join('|')})\\b`,
    'gi'
  );
  result = result.replace(trueFillerPattern, '');

  const contextualFillerPattern = new RegExp(
    `(^|[,;]\\s*)(${CONTEXTUAL_FILLER_WORDS.join('|')})\\b`,
    'gi'
  );
  result = result.replace(contextualFillerPattern, '$1');

  result = result.replace(/,\s*,/g, ',');
  result = result.replace(/;\s*;/g, ';');
  result = result.replace(/\s{2,}/g, ' ');
  result = result.replace(/,\s+([.!?])/g, '$1');
  result = result.replace(/;\s+([.!?])/g, '$1');
  result = result.replace(/^[,;]\s*/, '');
  result = result.replace(/\s+$/, '');

  result = result.replace(/^([a-z])/, (match) => match.toUpperCase());

  return result.trim();
};

export const normalizeWhitespace = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let result = text;

  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
};

export const formatCleanedTranscript = (entries) => {
  if (!Array.isArray(entries) || entries.length === 0) {
    return '';
  }

  const paragraphs = [];
  let currentSpeaker = null;
  let currentText = '';
  let sentenceCount = 0;

  for (const entry of entries) {
    const { speaker, dialogue } = detectSpeaker(entry.text);
    const cleanedDialogue = normalizeWhitespace(removeFillerWords(dialogue));

    if (!cleanedDialogue) continue;

    const sentences = cleanedDialogue.split(/[.!?]+/).filter(s => s.trim()).length;

    const shouldBreak = speaker !== currentSpeaker ||
                       (speaker === null && currentSpeaker === null && sentenceCount >= 5);

    if (shouldBreak) {
      if (currentText) {
        paragraphs.push(currentSpeaker ? `${currentSpeaker}: ${currentText}` : currentText);
      }
      currentSpeaker = speaker;
      currentText = cleanedDialogue;
      sentenceCount = sentences;
    } else {
      currentText += ' ' + cleanedDialogue;
      sentenceCount += sentences;
    }
  }

  if (currentText) {
    paragraphs.push(currentSpeaker ? `${currentSpeaker}: ${currentText}` : currentText);
  }

  return paragraphs.join('\n\n');
};

export const calculateTrackCount = async (episodeId, tenantId) => {
  try {
    const result = await ddb.send(new QueryCommand({
      TableName: process.env.TABLE_NAME,
      KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
      ExpressionAttributeValues: {
        ':pk': { S: `${tenantId}#${episodeId}` },
        ':sk': { S: 'data#track#' }
      }
    }));

    if (!result.Items || result.Items.length === 0) {
      return 0;
    }

    const validTracks = result.Items
      .map(item => unmarshall(item))
      .filter(track =>
        track.status === TRACK_STATUS.UPLOADED ||
        track.status === TRACK_STATUS.PROCESSED
      );

    return validTracks.length;
  } catch (err) {
    logger.error('Failed to calculate track count', {
      error: err.message,
      stack: err.stack,
      episodeId,
      tenantId
    });
    return 0;
  }
};

export const detectSpeakersInTranscript = (transcriptContent) => {
  if (!transcriptContent || typeof transcriptContent !== 'string') {
    return {
      hasSpeakers: false,
      speakers: []
    };
  }

  const entries = parseSrtFile(transcriptContent);
  const speakerSet = new Set();
  let hasSpeakerAttribution = false;

  for (const entry of entries) {
    const { speaker } = detectSpeaker(entry.text);
    if (speaker) {
      hasSpeakerAttribution = true;
      speakerSet.add(speaker);
    }
  }

  return {
    hasSpeakers: hasSpeakerAttribution,
    speakers: Array.from(speakerSet).sort()
  };
};
