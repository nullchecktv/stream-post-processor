# Requirements Document

## Introduction

This feature optimizes transcript processing by creating a cleaned, token-efficient version of SRT transcripts for AI agents that don't require timestamp information. Currently, all three agents (clip detector, quote detector, and blog generator) receive the full SRT format with timestamps, but only the clip detector needs this information. By creating a cleaned transcript.md file that removes timestamps, filler words, and unnecessary whitespace, we can reduce token consumption for the quote and blog agents while maintaining the necessary timing information for clip detection.

## Glossary

- **SRT File**: SubRip Subtitle file format containing numbered entries with timestamps and text, optionally with speaker attribution
- **Transcript Processor**: Lambda function that parses SRT files and creates cleaned transcripts
- **Cleaned Transcript**: Markdown file with dialogue text, optional speaker attribution, timestamps removed, filler words removed, and whitespace optimized
- **Speaker Attribution**: Optional speaker name prefix in SRT entries (e.g., "Allen: Hello there")
- **Filler Words**: Common verbal fillers like "um", "uh", "like", "you know", "I mean", "sort of", "kind of"
- **Token**: Unit of text processed by AI models, directly impacting cost and processing time
- **Agent**: AI-powered Lambda function that processes transcripts (clip detector, quote detector, blog generator)
- **EventBridge**: AWS service that routes events between services

## Requirements

### Requirement 1

**User Story:** As a system operator, I want to automatically create optimized transcripts when SRT files are uploaded, so that AI agents consume fewer tokens and process content more efficiently.

#### Acceptance Criteria

1. WHEN an SRT file is uploaded to S3 THEN the system SHALL trigger a transcript processor function
2. WHEN the transcript processor runs THEN the system SHALL parse the SRT file and extract dialogue text
3. WHEN the SRT file contains speaker attribution THEN the system SHALL preserve speaker names in the cleaned transcript
4. WHEN the SRT file does not contain speaker attribution THEN the system SHALL create the cleaned transcript without speaker names
5. WHEN creating the cleaned transcript THEN the system SHALL remove all timestamp notation from the content
6. WHEN creating the cleaned transcript THEN the system SHALL remove common filler words from the dialogue
7. WHEN creating the cleaned transcript THEN the system SHALL normalize whitespace to reduce unnecessary characters

### Requirement 2

**User Story:** As a system operator, I want the cleaned transcript stored as transcript.md in S3, so that it can be easily accessed by agents that don't need timing information.

#### Acceptance Criteria

1. WHEN the transcript processor completes parsing THEN the system SHALL save the cleaned content as transcript.md in the episode's S3 directory
2. WHEN saving the cleaned transcript THEN the system SHALL use the same S3 path structure as the original SRT file
3. WHEN the cleaned transcript is saved THEN the system SHALL trigger an S3 object creation event
4. WHEN the cleaned transcript save fails THEN the system SHALL log the error and allow the original SRT processing to continue

### Requirement 3

**User Story:** As a quote detector agent, I want to receive cleaned transcripts without timestamps, so that I can process content more efficiently and reduce token costs.

#### Acceptance Criteria

1. WHEN the transcript.md file is created in S3 THEN the system SHALL trigger the quote detector agent via S3 event
2. WHEN the quote detector agent is triggered THEN the system SHALL load the transcript.md file from the event key
3. WHEN processing the cleaned transcript THEN the quote detector SHALL extract quotes without timestamp information
4. WHEN the quote detector completes THEN the system SHALL maintain the same output format as before

### Requirement 4

**User Story:** As a blog generator agent, I want to receive cleaned transcripts without timestamps, so that I can focus on content and reduce token consumption.

#### Acceptance Criteria

1. WHEN the transcript.md file is created in S3 THEN the system SHALL trigger the blog generator agent via S3 event
2. WHEN the blog generator agent is triggered THEN the system SHALL load the transcript.md file from the event key
3. WHEN processing the cleaned transcript THEN the blog generator SHALL create content based on the dialogue
4. WHEN the blog generator completes THEN the system SHALL maintain the same output format as before

### Requirement 5

**User Story:** As a clip detector agent, I want to continue receiving the original SRT file with timestamps, so that I can accurately identify clip segments with precise timing information.

#### Acceptance Criteria

1. WHEN the clip detector agent is triggered THEN the system SHALL continue to load the original SRT file
2. WHEN processing the SRT file THEN the clip detector SHALL extract timestamps exactly as they appear
3. WHEN creating clip segments THEN the clip detector SHALL include precise startTime and endTime values
4. WHEN the clip detector completes THEN the system SHALL maintain the same output format as before

### Requirement 6

**User Story:** As a system operator, I want the transcript processor to handle parsing errors gracefully, so that a single malformed SRT file doesn't break the entire processing pipeline.

#### Acceptance Criteria

1. WHEN the SRT file contains malformed entries THEN the system SHALL skip invalid entries and continue processing
2. WHEN the SRT file cannot be parsed THEN the system SHALL log the error and exit without creating a cleaned transcript
3. WHEN parsing errors occur THEN the system SHALL allow the original transcript-added event to continue processing
4. WHEN the transcript processor fails THEN the system SHALL not prevent agents from running with the original SRT file

### Requirement 7

**User Story:** As a system operator, I want filler word removal to be configurable, so that I can adjust the cleaning strategy without code changes.

#### Acceptance Criteria

1. WHEN the transcript processor initializes THEN the system SHALL load a predefined list of filler words
2. WHEN removing filler words THEN the system SHALL preserve sentence structure and readability
3. WHEN a filler word appears at the start of a sentence THEN the system SHALL remove it and capitalize the next word
4. WHEN multiple filler words appear consecutively THEN the system SHALL remove all of them
5. WHEN filler words are part of meaningful phrases THEN the system SHALL preserve them to maintain context


### Requirement 8

**User Story:** As a system operator, I want the transcript processor to handle both speaker-attributed and non-attributed SRT files, so that the system works with various transcript formats.

#### Acceptance Criteria

1. WHEN parsing an SRT entry THEN the system SHALL detect if speaker attribution is present
2. WHEN speaker attribution is detected THEN the system SHALL extract the speaker name and dialogue separately
3. WHEN no speaker attribution is detected THEN the system SHALL treat the entire entry as dialogue
4. WHEN creating the cleaned transcript with speakers THEN the system SHALL format it as "Speaker: dialogue text"
5. WHEN creating the cleaned transcript without speakers THEN the system SHALL format it as plain dialogue text with paragraph breaks
