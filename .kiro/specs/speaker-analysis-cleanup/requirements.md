# Requirements Document

## Introduction

The `speakerAnalysis` property was introduced as part of the speaker-optional-workflow feature to provide real-time feedback during transcript upload about speaker matching. However, analysis shows this property is stored in DynamoDB but never retrieved or used after the initial upload response. This creates unnecessary complexity and storage overhead.

## Glossary

- **speakerAnalysis**: A property stored on episode records containing matched/unmatched speaker information from transcript processing
- **transcript-added handler**: EventBridge-triggered Lambda function that processes transcript uploads
- **upload-transcript handler**: API Gateway Lambda function that generates presigned URLs for transcript uploads
- **Episode Record**: DynamoDB item containing episode metadata

## Requirements

### Requirement 1

**User Story:** As a developer, I want to remove unused data storage, so that the system is simpler and more maintainable.

#### Acceptance Criteria

1. WHEN the transcript-added handler processes a transcript THEN the system SHALL NOT store speakerAnalysis in the episode record
2. WHEN the transcript-added handler processes a transcript THEN the system SHALL continue to detect speakers and update hasSpeakers and speakers fields
3. WHEN the transcript-added handler publishes the SpeakersAdded event THEN the system SHALL NOT include speakerAnalysis in the event detail
4. WHEN the upload-transcript handler returns a response THEN the system SHALL NOT include speakerAnalysis in the response body

### Requirement 2

**User Story:** As a developer, I want to remove frontend code that handles unused data, so that the codebase is simpler.

#### Acceptance Criteria

1. WHEN the TranscriptUploader component receives an upload response THEN the system SHALL NOT attempt to extract or display speakerAnalysis
2. WHEN the SpeakerAnalysisDisplay component is referenced THEN the system SHALL remove the component entirely
3. WHEN the API types are defined THEN the system SHALL NOT include speakerAnalysis in the UploadTranscriptResponse type

### Requirement 3

**User Story:** As a developer, I want to remove API documentation for unused fields, so that the API contract is accurate.

#### Acceptance Criteria

1. WHEN the OpenAPI specification defines the Episode schema THEN the system SHALL NOT include speakerAnalysis as a property
2. WHEN the OpenAPI specification defines response schemas THEN the system SHALL NOT include speakerAnalysis in any response definitions

### Requirement 4

**User Story:** As a developer, I want to remove unused speaker matching logic, so that the codebase is simpler.

#### Acceptance Criteria

1. WHEN the transcript-added handler processes a transcript THEN the system SHALL extract speakers without calling matchSpeakers
2. WHEN the speakers utility module is defined THEN the system SHALL NOT include the matchSpeakers function
3. WHEN speakers are extracted from a transcript THEN the system SHALL store them directly without matching analysis

### Requirement 5

**User Story:** As a developer, I want to remove automatic clip reprocessing, so that the system behavior is simpler and more predictable.

#### Acceptance Criteria

1. WHEN a transcript is uploaded THEN the system SHALL NOT set needsClipReprocessing flag on the episode
2. WHEN the SpeakersAdded event is published THEN the system SHALL NOT trigger the speakers-added handler
3. WHEN the speakers-added handler function exists THEN the system SHALL remove it entirely
4. WHEN the template.yaml defines Lambda functions THEN the system SHALL NOT include SpeakersAddedHandler
