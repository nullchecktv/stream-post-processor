#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const parseSrtEntry = (entry) => {
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

const parseSrtFile = (content) => {
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

const detectSpeaker = (text) => {
  if (!text || typeof text !== 'string') {
    return { speaker: null, dialogue: text || '' };
  }

  const speakerMatch = text.match(/^([A-Za-z][A-Za-z\s]*?):\s*(.*)$/);
  if (speakerMatch) {
    return {
      speaker: speakerMatch[1].trim(),
      dialogue: speakerMatch[2].trim()
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

const removeFillerWords = (text) => {
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

const normalizeWhitespace = (text) => {
  if (!text || typeof text !== 'string') {
    return text || '';
  }

  let result = text;
  result = result.replace(/[ \t]+/g, ' ');
  result = result.replace(/\n{3,}/g, '\n\n');
  result = result.trim();

  return result;
};

const formatCleanedTranscript = (entries) => {
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

const main = () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error('Usage: node scripts/test-transcript-formatting.mjs <path-to-srt-file> [output-file]');
    console.error('');
    console.error('Examples:');
    console.error('  node scripts/test-transcript-formatting.mjs transcript.srt');
    console.error('  node scripts/test-transcript-formatting.mjs transcript.srt output.md');
    process.exit(1);
  }

  const inputPath = resolve(args[0]);
  const outputPath = args[1] ? resolve(args[1]) : null;

  try {
    const srtContent = readFileSync(inputPath, 'utf-8');
    console.log(`Reading SRT file: ${inputPath}`);

    const entries = parseSrtFile(srtContent);
    console.log(`Parsed ${entries.length} SRT entries`);

    const formatted = formatCleanedTranscript(entries);

    if (outputPath) {
      writeFileSync(outputPath, formatted, 'utf-8');
      console.log(`\nFormatted transcript written to: ${outputPath}`);
    } else {
      console.log('\n--- Formatted Transcript ---\n');
      console.log(formatted);
      console.log('\n--- End of Transcript ---');
    }

    console.log(`\nStats:`);
    console.log(`  Original entries: ${entries.length}`);
    console.log(`  Output lines: ${formatted.split('\n\n').length}`);
    console.log(`  Characters: ${formatted.length}`);

  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

main();
