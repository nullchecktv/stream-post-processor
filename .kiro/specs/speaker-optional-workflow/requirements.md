# Requirements Document

## Introduction

The current system requires speaker attribution in transcripts for clip generation because speakers are used to determine which video track to extract from during multi-track clip processing. However, this creates unnecessary friction when users upload transcripts without speaker labels or when episodes only have a single video track. This feature optimizes the user experience by making speaker attribution optional when it's not needed for video processing, while maintaining the existing speaker-based track selection when multiple tracks are present.

## Glossary

- **Speaker Attribution**: Speaker name prefix in SRT entries (e.g., "Allen: Hello there")
- **Track**: A video file uploaded for an episode (e.g., main camera, guest camera, screen share)
- **Track Selection**: Process of determining which video track to use for each clip segment based on speaker
- **Single-Track Episode**: Episode with only one video track uploaded
- **Multi-Track Episode**: Episode with multiple video tracks uploaded
- **Speaker-Track Mapping**: Association between speaker names and their corresponding video tracks
- **Clip Segment**: Individual time range within a clip that may come from different speakers/tracks
- **Segment Extractor**: Lambda function that extracts video segments from source tracks
- **Clip Detector**: AI agent thatalyzes transcripts to identify potential clips
- **Track Speakers**: Array of speaker names associated with a video track

## Requirements

### Requirement 1

**User Story:** As a content creator with a single video track, I want to upload transcripts without speaker labels, so that I can quickly process episodes without unnecessary metadata entry.

#### Acceptance Criteria

1. WHEN an episode has only one video track uploaded THEN the system SHALL allow transcript upload without speaker attribution
2. WHEN processing a single-track episode THEN the clip detector SHALL generate clips without requiring speaker information
3. WHEN generating clips for a single-track episode THEN the segment extractor SHALL use the single available track for all segments
4. WHEN a single-track episode has no speakers in the transcript THEN the system SHALL not display speaker validation warnings
5. WHEN a user views a single-track episode THEN the UI SHALL not prompt for speaker information

### Requirement 2

**User Story:** As a content creator with multiple video tracks, I want clear guidance when speaker attribution is missing, so that I understand why clip generation requires speaker labels.

#### Acceptance Criteria

1. WHEN an episode has multiple video tracks uploaded THEN the system SHALL require speaker attribution in transcripts for clip generation
2. WHEN a multi-track episode has a transcript without speakers THEN the system SHALL display a clear warning explaining the requirement
3. WHEN displaying the speaker requirement warning THEN the system SHALL explain that speakers are needed to match segments to video tracks
4. WHEN a user uploads a transcript without speakers to a multi-track episode THEN the system SHALL allow the upload but mark clips as requiring speaker information
5. WHEN clip generation is attempted without speakers on a multi-track episode THEN the system SHALL provide actionable guidance on adding speaker labels

### Requirement 3

**User Story:** As a clip detector agent, I want to generate clips regardless of speaker attribution, so that single-track episodes can be processed automatically.

#### Acceptance Criteria

1. WHEN the clip detector processes a transcript THEN the system SHALL generate clips with or without speaker attribution
2. WHEN a clip segment has no speaker attribution THEN the system SHALL set the speaker field to null
3. WHEN creating clip segments without speakers THEN the system SHALL maintain all other segment properties (startTime, endTime, transcript, order)
4. WHEN the clip detector completes THEN the system SHALL store clips with nullable speaker fields in DynamoDB
5. WHEN clips are created without speakers THEN the system SHALL not fail validation due to missing speaker information

### Requirement 4

**User Story:** As a segment extractor function, I want to intelligently select tracks based on available information, so that I can process both single-track and multi-track episodes correctly.

#### Acceptance Criteria

1. WHEN processing a clip segment with a speaker THEN the system SHALL attempt to match the speaker to a track using existing track-speaker mapping
2. WHEN processing a clip segment without a speaker on a single-track episode THEN the system SHALL use the single available track
3. WHEN processing a clip segment without a speaker on a multi-track episode THEN the system SHALL use a default track selection strategy
4. WHEN no track can be matched for a segment THEN the system SHALL log a warning and use the first available track as fallback
5. WHEN track selection completes THEN the system SHALL record the selection method (speaker-matched, single-track-default, or fallback) in segment metadata

### Requirement 5

**User Story:** As a content creator, I want to see which clips can be processed with my current track configuration, so that I can prioritize uploading additional tracks if needed.

#### Acceptance Criteria

1. WHEN viewing clips for a single-track episode THEN the system SHALL indicate that all clips can be processed
2. WHEN viewing clips for a multi-track episode without speakers THEN the system SHALL indicate which clips may have suboptimal track selection
3. WHEN a clip has segments without speaker attribution THEN the system SHALL display a warning about potential track selection issues
4. WHEN all clips have proper speaker-to-track mapping THEN the system SHALL display a success indicator
5. WHEN displaying track selection status THEN the system SHALL provide clear explanations of any issues

### Requirement 6

**User Story:** As a system operator, I want the track selection logic to be resilient to missing speaker information, so that the system degrades gracefully rather than failing.

#### Acceptance Criteria

1. WHEN track selection encounters a missing speaker THEN the system SHALL apply fallback logic without throwing errors
2. WHEN using fallback track selection THEN the system SHALL log the fallback reason and selected track
3. WHEN multiple segments use fallback selection THEN the system SHALL maintain consistency by using the same fallback track
4. WHEN fallback selection is used THEN the system SHALL record this in the clip processing metadata
5. WHEN clip processing completes with fallback selection THEN the system SHALL notify the user of potential quality issues

### Requirement 7

**User Story:** As a content creator, I want to add speaker labels to my transcript after initial upload, so that I can improve clip quality for multi-track episodes.

#### Acceptance Criteria

1. WHEN a transcript is uploaded without speakers THEN the system SHALL allow re-uploading the same transcript with speaker labels added
2. WHEN a transcript with speakers is uploaded THEN the system SHALL update the episode's speaker list
3. WHEN speakers are added to a transcript THEN the system SHALL trigger re-processing of existing clips
4. WHEN clips are re-processed with new speaker information THEN the system SHALL update track selections for all segments
5. WHEN re-processing completes THEN the system SHALL notify the user that clips have been updated with improved track selection

### Requirement 8

**User Story:** As a system operator, I want to track whether episodes have speaker attribution, so that I can provide appropriate guidance and processing paths.

#### Acceptance Criteria

1. WHEN a transcript is processed THEN the system SHALL detect whether speaker attribution is present
2. WHEN speaker attribution is detected THEN the system SHALL set a flag on the episode metadata indicating speakers are available
3. WHEN no speaker attribution is detected THEN the system SHALL set a flag indicating speakers are not available
4. WHEN the speaker availability flag changes THEN the system SHALL update the episode metadata
5. WHEN displaying episode information THEN the system SHALL show whether speaker attribution is available

### Requirement 9

**User Story:** As a content creator, I want clear onboarding guidance about speaker attribution, so that I understand when it's required and how to add it.

#### Acceptance Criteria

1. WHEN a user uploads their first transcript THEN the system SHALL display guidance about speaker attribution
2. WHEN guidance is displayed THEN the system SHALL explain that speakers are optional for single-track episodes
3. WHEN guidance is displayed THEN the system SHALL explain that speakers are recommended for multi-track episodes
4. WHEN guidance is displayed THEN the system SHALL provide examples of proper speaker attribution format
5. WHEN a user dismisses the guidance THEN the system SHALL not show it again unless explicitly requested

### Requirement 10

**User Story:** As a clip detector agent, I want to provide helpful context about speaker attribution in my output, so that users understand the quality implications of their transcript format.

#### Acceptance Criteria

1. WHEN the clip detector processes a transcript without speakers THEN the system SHALL include a note in the response about speaker attribution
2. WHEN the note is included THEN the system SHALL explain whether speakers are needed for this episode
3. WHEN speakers are not needed THEN the system SHALL reassure the user that clip quality will not be affected
4. WHEN speakers are needed THEN the system SHALL suggest adding speaker labels for optimal results
5. WHEN the clip detector completes THEN the system SHALL include speaker attribution status in the processing summary

