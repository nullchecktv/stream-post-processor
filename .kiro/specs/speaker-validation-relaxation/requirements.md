# Requirements Document

## Introduction

The current speaker validation system is too strict and causes silent failures when AI agents create clips or quotes with speaker names that don't exactly match the episode's speaker list. This creates a poor user experience where content generation appears to succeed but actually fails silently. We need to relax validation and implement intelligent speaker matching with fallbacks during actual video processing.

## Glossary

- **Speaker Validation**: The process of verifying that speaker names in clips/quotes match the episode's speaker list
- **LLM Matching**: Using an AI model to intelligently match speaker names even when they don't match exactly
- **Fallback Track**: The default video track to use when a speaker-specific track cannot be determined
- **Silent Failure**: When an operation fails without providing clear feedback to the user
- **Tool Handler**: The AI agent tool that creates clips or quotes from transcript analysis

## Requirements

### Requirement 1

**User Story:** As a content creator, I want the AI to successfully create clips even when speaker names don't exactly match, so that I don't experience silent failures in content generation.

#### Acceptance Criteria

1. WHEN the createClip tool is invoked with speaker names THEN the system SHALL accept any speaker name without validation
2. WHEN clips are created with unrecognized speakers THEN the system SHALL store the clips successfully in the database
3. WHEN the AI provides speaker variations (e.g., "Bob" vs "Robert Smith") THEN the system SHALL not reject the clip creation
4. WHEN multiple clips are created in a batch THEN the system SHALL not fail the entire batch due to speaker validation errors
5. WHEN a clip is created THEN the system SHALL log the provided speaker names for later matching

### Requirement 2

**User Story:** As a system, I want to intelligently match speaker names to video tracks during clip generation, so that the correct video source is used even with name variations.

#### Acceptance Criteria

1. WHEN a clip enters the generation workflow THEN the system SHALL attempt to match segment speakers to available tracks using LLM-based matching
2. WHEN an exact speaker match is found THEN the system SHALL use the corresponding video track
3. WHEN a fuzzy match is found with high confidence THEN the system SHALL use the matched track and log the mapping
4. WHEN no match is found for a speaker THEN the system SHALL fall back to the default 'main' track
5. WHEN LLM matching fails or times out THEN the system SHALL fall back to the default track without failing the clip generation

### Requirement 3

**User Story:** As a developer, I want clear logging of speaker matching decisions, so that I can debug issues and understand which tracks were used for each segment.

#### Acceptance Criteria

1. WHEN speaker matching occurs THEN the system SHALL log the original speaker name, matched track, and confidence level
2. WHEN a fallback track is used THEN the system SHALL log the reason for the fallback
3. WHEN LLM matching is attempted THEN the system SHALL log the matching request and response
4. WHEN multiple segments use different tracks THEN the system SHALL log the track selection for each segment
5. WHEN speaker matching completes THEN the system SHALL include a summary of all track selections in the workflow metadata

### Requirement 4

**User Story:** As a content creator, I want quotes to be created successfully regardless of speaker name variations, so that quote generation doesn't fail silently.

#### Acceptance Criteria

1. WHEN the createQuote tool is invoked with a speaker name THEN the system SHALL accept any speaker name without strict validation
2. WHEN a quote is created with an unrecognized speaker THEN the system SHALL store the quote with the provided speaker name
3. WHEN quotes are displayed THEN the system SHALL show the speaker name as provided by the AI
4. WHEN a user manually edits a quote THEN the system SHALL allow any speaker name to be entered
5. WHEN quote graphics are generated THEN the system SHALL use the speaker name as stored without validation

### Requirement 5

**User Story:** As a system administrator, I want to remove unnecessary speaker validation from API endpoints, so that the system is more flexible and resilient.

#### Acceptance Criteria

1. WHEN the update-quote endpoint is called THEN the system SHALL not validate the speaker against the episode speaker list
2. WHEN the create-quote endpoint is called THEN the system SHALL not validate the speaker against the episode speaker list
3. WHEN the update-track endpoint is called THEN the system SHALL not validate speakers against the episode speaker list
4. WHEN the create-track-upload endpoint is called THEN the system SHALL not validate speakers against the episode speaker list
5. WHEN speaker validation is removed THEN the system SHALL maintain backward compatibility with existing data

### Requirement 6

**User Story:** As a system, I want to preserve the speaker matching utility for future use, so that it can be optionally used in specific contexts where strict matching is beneficial.

#### Acceptance Criteria

1. WHEN the matchSpeakers function exists THEN the system SHALL keep it available for optional use
2. WHEN the validateSpeakers function is removed from tool handlers THEN the function SHALL remain in the speakers utility module
3. WHEN future features need speaker matching THEN the system SHALL have the LLM-based matching capability available
4. WHEN the speaker utility is updated THEN the system SHALL maintain the existing function signatures for compatibility
5. WHEN speaker matching is used THEN the system SHALL provide both exact and fuzzy matching capabilities
