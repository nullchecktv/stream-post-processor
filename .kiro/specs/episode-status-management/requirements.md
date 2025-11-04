# Requirements Document

## Introduction

This feature adds manual status management capabilities to episodes, enabling users to trigger specific workflow states like "Ready for Clip Gen" through API endpoints. The system will validate prerequisites, maintain status history, and trigger appropriate events for downstream processing.

## Glossary

- **Episode_Status_System**: The system component that manages episode status transitions and validation
- **Status_History**: An ordered array of status entries with timestamps for tracking episode state changes
- **Track_Processing_System**: The system component that processes uploaded video tracks
- **Event_Publishing_System**: The system component that publishes events to EventBridge
- **Clip_Generation_System**: The downstream system that processes clips based on episode readiness

## Requirements

### Requirement 1

**User Story:** As a content manager, I want to manually trigger the "Ready for Clip Gen" status for an episode, so that I can control when clip generation begins.

#### Acceptance Criteria

1. WHEN a POST request is made to `/episodes/{episodeId}/statuses` with status "Ready for Clip Gen", THE Episode_Status_System SHALL validate the episode exists
2. WHEN the episode status is being updated to "Ready for Clip Gen", THE Episode_Status_System SHALL verify the episode has "tracks uploaded" status
3. WHEN the episode status is being updated to "Ready for Clip Gen", THE Episode_Status_System SHALL verify all tracks have "processed" status
4. IF the prerequisites are not met, THEN THE Episode_Status_System SHALL return HTTP 409 with specific failure reasons
5. WHEN all prerequisites are met, THE Episode_Status_System SHALL add the new status to the status history with current timestamp

### Requirement 2

**User Story:** As a content manager, I want episodes to maintain a complete status history, so that I can track the progression of episode processing.

#### Acceptance Criteria

1. WHEN an episode status is updated, THE Episode_Status_System SHALL append the new status entry to the status history array
2. WHEN an episode status is updated, THE Episode_Status_System SHALL include the current ISO 8601 timestamp in the status entry
3. WHEN retrieving episode data, THE Episode_Status_System SHALL return only the most recent status as the current status
4. WHEN storing status history, THE Episode_Status_System SHALL preserve all previous status entries in chronological order
5. THE Episode_Status_System SHALL maintain the status history array with status and timestamp fields for each entry

### Requirement 3

**User Story:** As a downstream system, I want to receive "Begin Clip Generation" events when episodes become ready, so that I can automatically start clip processing.

#### Acceptance Criteria

1. WHEN an episode status is successfully updated to "Ready for Clip Gen", THE Event_Publishing_System SHALL publish a "Begin Clip Generation" event to EventBridge
2. WHEN publishing the event, THE Event_Publishing_System SHALL include the episode ID in the event detail
3. WHEN publishing the event, THE Event_Publishing_System SHALL use the source "nullcheck" for the event
4. WHEN publishing the event, THE Event_Publishing_System SHALL use the detail type "Begin Clip Generation"
5. THE Event_Publishing_System SHALL include the episode metadata in the event detail for downstream processing

### Requirement 4

**User Story:** As a content manager, I want clips to also maintain status history, so that I can track clip processing progression consistently with episodes.

#### Acceptance Criteria

1. WHEN a clip status is updated, THE Episode_Status_System SHALL append the new status entry to the clip's status history array
2. WHEN a clip status is updated, THE Episode_Status_System SHALL include the current ISO 8601 timestamp in the status entry
3. WHEN retrieving clip data, THE Episode_Status_System SHALL return only the most recent status as the current status
4. WHEN storing clip status history, THE Episode_Status_System SHALL preserve all previous status entries in chronological order
5. THE Episode_Status_System SHALL maintain the clip status history array with status and timestamp fields for each entry

### Requirement 5

**User Story:** As an API consumer, I want consistent status representation across all endpoints, so that I can reliably process episode and clip status information.

#### Acceptance Criteria

1. WHEN returning episode data from GET `/episodes/{episodeId}`, THE Episode_Status_System SHALL include the current status derived from the most recent status history entry
2. WHEN returning episode data from GET `/episodes`, THE Episode_Status_System SHALL include the current status for each episode
3. WHEN returning clip data, THE Episode_Status_System SHALL include the current status derived from the most recent status history entry
4. THE Episode_Status_System SHALL maintain backward compatibility by continuing to provide the status field in responses
5. THE Episode_Status_System SHALL store the complete status history in the database while exposing only current status in API responses
