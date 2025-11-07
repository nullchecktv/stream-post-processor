import { Logger } from '@aws-lambda-powertools/logger';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const logger = new Logger({ serviceName: 'utils' });

const s3 = new S3Client();
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
