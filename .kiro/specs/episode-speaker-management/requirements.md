# Requirements Document

## Introduction

This feature elevates speaker management to the episode level, making speakers a core attribute of episodes rather than just tracks. The system will maintain a canonical list of speakers for each episode, validate track and transcript speaker references against this list, and use AI to intelligently match speaker names from transcripts to the episode's speaker list. All downstream entities (tracks, segments, quotes) will reference speakers from the episode's authoritative speaker list.

## Glossary

- **Episode_Entity**: Episode record in DynamoDB containing the canonical speakers array
- **Speaker_Array**: Authoritative list of speaker names defined at the episode level
- **Track_Entity**: Video track record that references speakers from the episode's speaker list
- **Transcript_Entity**: Transcript record containing speaker names that need validation
- **Speaker_Validation_Service**: API validation that ensures track speakers exist in episode
- **Speaker_Matching_Agent**: AI agent using Amazon Nova Lite to match transcript speakers to episode speakers
- **Segment_Entity**: Clip segment that references a speaker from the episode list
- **Quote_Entity**: Quote record that references a speaker from the episode list
- **Speaker_Normalization**: Process of matching and standardizing speaker names across entities

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to define speakers at the episode level during episode creation, so that I have a single source of truth for all speakers in that episode.

#### Acceptance Criteria

1. WHEN creating an episode, THE Episode_Entity SHALL accept an optional speakers array parameter
2. WHEN validating episode creation, THE Episode_Entity SHALL ensure each speaker name is a non-empty string
3. WHEN storing episode data, THE Episode_Entity SHALL include a speakers field containing an array of unique speaker names
4. WHEN speakers array is not provided, THE Episode_Entity SHALL initialize it as an empty array
5. WHILE processing speaker names, THE Episode_Entity SHALL normalize speakers by trimming whitespace and removing duplicates

### Requirement 2

**User Story:** As a content creator, I want to update the episode's speaker list after creation, so that I can add or modify speakers as I learn more about the episode content.

#### Acceptance Criteria

1. WHEN updating an episode, THE Episode_Entity SHALL allow modification of the speakers array
2. WHEN speakers are updated, THE Episode_Entity SHALL validate each speaker name is non-empty
3. WHEN duplicate speakers are provided, THE Episode_Entity SHALL deduplicate the array
4. WHEN speakers array is set to empty, THE Episode_Entity SHALL accept the empty array
5. WHILE updating speakers, THE Episode_Entity SHALL preserve all other episode properties

### Requirement 3

**User Story:** As a content creator, I want to select speakers from the episode's speaker list when uploading a track, so that track speakers are validated against the canonical list.

#### Acceptance Criteria

1. WHEN creating a track upload, THE Speaker_Validation_Service SHALL validate that all track speakers exist in the episode's speakers array
2. WHEN a track speaker is not in the episode list, THE Speaker_Validation_Service SHALL return a 400 error with the invalid speaker name
3. WHEN track speakers are valid, THE Speaker_Validation_Service SHALL allow the track creation to proceed
4. WHEN no speakers are provided for a track, THE Speaker_Validation_Service SHALL accept the empty array
5. WHILE validating speakers, THE Speaker_Validation_Service SHALL perform case-insensitive matching

### Requirement 4

**User Story:** As a content creator, I want to update track speakers by selecting from the episode's speaker list, so that I can correct speaker associations while maintaining data integrity.

#### Acceptance Criteria

1. WHEN updating track speakers, THE Speaker_Validation_Service SHALL validate all speakers exist in the episode's speakers array
2. WHEN invalid speakers are provided, THE Speaker_Validation_Service SHALL return a 400 error listing the invalid speakers
3. WHEN speakers are valid, THE Speaker_Validation_Service SHALL update the track record
4. WHEN speakers array is empty, THE Speaker_Validation_Service SHALL accept the update
5. WHILE updating track speakers, THE Speaker_Validation_Service SHALL preserve other track metadata

### Requirement 5

**User Story:** As a system administrator, I want the system to automatically extract speaker names from uploaded transcripts, so that I can identify speakers present in the content.

#### Acceptance Criteria

1. WHEN a transcript is uploaded, THE Speaker_Matching_Agent SHALL parse the transcript file for speaker names
2. WHEN speaker names are found, THE Speaker_Matching_Agent SHALL extract unique speaker identifiers
3. WHEN no speakers are found, THE Speaker_Matching_Agent SHALL return an empty list
4. WHEN transcript format is invalid, THE Speaker_Matching_Agent SHALL log an error and return empty list
5. WHILE parsing transcripts, THE Speaker_Matching_Agent SHALL support SRT format with speaker annotations

### Requirement 6

**User Story:** As a system administrator, I want the system to use AI to match transcript speakers to episode speakers, so that speaker names are normalized and consistent across the system.

#### Acceptance Criteria

1. WHEN transcript speakers are extracted, THE Speaker_Matching_Agent SHALL invoke Amazon Nova Lite model
2. WHEN comparing speakers, THE Speaker_Matching_Agent SHALL provide both transcript speakers and episode speakers to the AI
3. WHEN the AI identifies matches, THE Speaker_Matching_Agent SHALL return a mapping of transcript names to episode names
4. WHEN the AI cannot match a speaker, THE Speaker_Matching_Agent SHALL return the transcript name unchanged
5. WHILE processing matches, THE Speaker_Matching_Agent SHALL handle variations in spelling, capitalization, and nicknames

### Requirement 7

**User Story:** As a content creator, I want unmatched transcript speakers to be suggested as additions to the episode speaker list, so that I can easily expand the speaker list based on actual content.

#### Acceptance Criteria

1. WHEN transcript speakers don't match episode speakers, THE Speaker_Matching_Agent SHALL identify unmatched speakers
2. WHEN unmatched speakers are found, THE Speaker_Matching_Agent SHALL return them in a separate list
3. WHEN all speakers match, THE Speaker_Matching_Agent SHALL return an empty unmatched list
4. WHEN processing results, THE Speaker_Matching_Agent SHALL provide confidence scores for matches
5. WHILE identifying unmatched speakers, THE Speaker_Matching_Agent SHALL exclude empty or invalid names

### Requirement 8

**User Story:** As an AI agent, I want to reference episode speakers when creating clips, so that clip segments use the canonical speaker names.

#### Acceptance Criteria

1. WHEN creating clip segments, THE Segment_Entity SHALL validate that segment speakers exist in the episode's speakers array
2. WHEN an invalid speaker is provided, THE Segment_Entity SHALL reject the segment with an error
3. WHEN speakers are valid, THE Segment_Entity SHALL store the segment with the normalized speaker name
4. WHEN processing multiple segments, THE Segment_Entity SHALL validate each segment's speaker independently
5. WHILE creating segments, THE Segment_Entity SHALL use case-insensitive speaker matching

### Requirement 9

**User Story:** As an AI agent, I want to reference episode speakers when creating quotes, so that quotes are attributed to the correct speaker from the canonical list.

#### Acceptance Criteria

1. WHEN creating a quote, THE Quote_Entity SHALL validate that the quote speaker exists in the episode's speakers array
2. WHEN an invalid speaker is provided, THE Quote_Entity SHALL reject the quote with an error
3. WHEN the speaker is valid, THE Quote_Entity SHALL store the quote with the normalized speaker name
4. WHEN no speaker is provided, THE Quote_Entity SHALL accept quotes without speaker attribution
5. WHILE validating speakers, THE Quote_Entity SHALL perform case-insensitive matching

### Requirement 10

**User Story:** As a developer, I want comprehensive error messages when speaker validation fails, so that I can quickly identify and fix speaker-related issues.

#### Acceptance Criteria

1. WHEN speaker validation fails, THE Speaker_Validation_Service SHALL return the list of invalid speakers
2. WHEN validation fails, THE Speaker_Validation_Service SHALL include the episode's valid speakers in the error response
3. WHEN multiple validation errors occur, THE Speaker_Validation_Service SHALL return all errors together
4. WHEN logging errors, THE Speaker_Validation_Service SHALL include episode ID and entity type context
5. WHILE handling errors, THE Speaker_Validation_Service SHALL use consistent error message formats
