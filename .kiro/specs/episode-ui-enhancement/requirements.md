# Requirements Document

## Introduction

This feature enhances the episode management user interface to provide a comprehensive, intuitive exience for managing episodes, uploads, clips, and processing status. The system will support background upload management, real-time status tracking, clip playback, and activity notifications for asynchronous operations.

## Glossary

- **Episode UI**: The user interface components for managing episodes
- **Upload Manager**: Background service handling file uploads with progress tracking
- **Status Chip**: Visual indicator displaying episode processing state
- **Clip Player**: Component for playing back generated video clips
- **Activity Feed**: Notification system for asynchronous task updates
- **Episode Editor**: Dedicated page for editing episode details and managing content
- **Status History Component**: Timeline view of episode state changes
- **Transcript Upload**: Process of uploading SRT transcript files to episodes
- **Track Upload**: Process of uploading video track files using multipart upload
- **Episode Status Endpoint**: API endpoint returning only episode status information

## Requirements

### Requirement 1: Episode Status Display

**User Story:** As a content creator, I want to see the current status of my episodes at a glance, so that I can quickly understand which episodes are ready for processing.

#### Acceptance Criteria

1. WHEN an episode is displayed in the UI, THE Episode UI SHALL render a status chip adjacent to the episode name
2. THE Episode UI SHALL display status values including "draft", "processing", "published", and "archived"
3. THE Episode UI SHALL apply distinct visual styling to each status value for immediate recognition
4. THE Episode UI SHALL update the status chip in real-time when episode status changes
5. WHERE an episode has multiple processing stages, THE Episode UI SHALL display the most current status value

### Requirement 2: Transcript Upload Management

**User Story:** As a content creator, I want to upload transcript files to my episodes, so that the AI can analyze the content and detect clips.

#### Acceptance Criteria

1. THE Episode Editor SHALL provide a transcript upload interface within the episode detail view
2. WHEN a user selects a transcript file, THE Upload Manager SHALL validate the file format is SRT
3. WHEN a user initiates transcript upload, THE Upload Manager SHALL request a presigned URL from the backend
4. THE Upload Manager SHALL upload the transcript file to S3 using the presigned URL
5. WHILE the transcript is uploading, THE Episode Editor SHALL display upload progress percentage
6. WHEN the transcript upload completes, THE Episode Editor SHALL display confirmation and update episode metadata
7. IF the transcript upload fails, THEN THE Episode Editor SHALL display an error message with retry option

### Requirement 3: Video Track Upload Management

**User Story:** As a content creator, I want to upload multiple video tracks for my episodes, so that I can process multi-camera livestream content.

#### Acceptance Criteria

1. THE Episode Editor SHALL provide a track upload interface supporting multiple track types
2. WHEN a user selects a video file, THE Upload Manager SHALL initiate multipart upload for files larger than 100MB
3. THE Upload Manager SHALL request part signing URLs from the backend for each upload chunk
4. WHILE tracks are uploading, THE Episode Editor SHALL display individual progress for each track
5. THE Upload Manager SHALL support concurrent upload of multiple tracks
6. WHEN a track upload completes, THE Episode Editor SHALL trigger video preprocessing workflow
7. IF a track upload fails, THEN THE Upload Manager SHALL support resumable upload from the last successful part

### Requirement 4: Background Upload Management

**User Story:** As a content creator, I want uploads to continue in the background, so that I can navigate to other pages while files are uploading.

#### Acceptance Criteria

1. THE Upload Manager SHALL maintain upload state across page navigation
2. THE Episode UI SHALL display a persistent upload status indicator in the application layout
3. WHEN a user navigates away from the episode page, THE Upload Manager SHALL continue processing active uploads
4. THE Episode UI SHALL allow users to view detailed upload progress from any page
5. WHEN all uploads complete, THE Episode UI SHALL display a notification with completion status
6. THE Upload Manager SHALL persist upload state to browser storage for recovery after page refresh

### Requirement 5: Upload Status Display

**User Story:** As a content creator, I want to see the status of all my uploads, so that I can monitor progress and identify any issues.

#### Acceptance Criteria

1. THE Episode Editor SHALL display upload status for transcripts and tracks within the episode view
2. THE Episode UI SHALL show upload states including "pending", "uploading", "processing", "completed", and "failed"
3. WHILE uploads are in progress, THE Episode Editor SHALL display real-time progress percentage
4. THE Episode Editor SHALL display upload metadata including filename, size, and upload time
5. WHERE multiple tracks exist, THE Episode Editor SHALL display status for each track individually

### Requirement 6: Episode Clips Display

**User Story:** As a content creator, I want to see all clips detected for my episode, so that I can review and approve them for publication.

#### Acceptance Criteria

1. THE Episode Editor SHALL display a clips section listing all clips associated with the episode
2. THE Episode Editor SHALL show clip metadata including title, duration, and segments
3. THE Episode Editor SHALL display clip status including "detected", "processing", "processed", "approved", and "rejected"
4. THE Episode Editor SHALL apply visual indicators to distinguish clip statuses
5. THE Episode Editor SHALL support filtering clips by status value

### Requirement 7: Clip Playback

**User Story:** As a content creator, I want to play back generated clips, so that I can review content quality before approving for publication.

#### Acceptance Criteria

1. WHERE a clip status is "processed", THE Clip Player SHALL display a playback button
2. WHEN a user clicks the playback button, THE Clip Player SHALL load the clip video from S3
3. THE Clip Player SHALL provide standard video controls including play, pause, seek, and volume
4. THE Clip Player SHALL display clip duration and current playback position
5. THE Clip Player SHALL support fullscreen playback mode
6. IF the clip video fails to load, THEN THE Clip Player SHALL display an error message

### Requirement 8: Activity Notifications

**User Story:** As a content creator, I want to receive notifications for asynchronous tasks, so that I know when clips are ready for review.

#### Acceptance Criteria

1. WHEN a clip generation completes, THE Activity Feed SHALL create a notification for the user
2. WHEN a video preprocessing completes, THE Activity Feed SHALL create a notification for the user
3. THE Episode UI SHALL display an activity indicator showing unread notification count
4. WHEN a user views the activity feed, THE Episode UI SHALL mark notifications as read
5. THE Activity Feed SHALL display notification timestamp and relevant episode context
6. THE Activity Feed SHALL provide direct links to related episodes or clips

### Requirement 9: Episode Status History

**User Story:** As a content creator, I want to see the history of status changes for my episode, so that I can understand the processing timeline.

#### Acceptance Criteria

1. THE Episode Editor SHALL display a status history component showing chronological state changes
2. THE Status History Component SHALL display each status transition with timestamp
3. THE Status History Component SHALL show the duration spent in each status state
4. THE Episode Status Endpoint SHALL return status history data for the requested episode
5. THE Status History Component SHALL update in real-time when new status changes occur

### Requirement 10: Episode Status Endpoint

**User Story:** As a developer, I want a dedicated endpoint for fetching episode status, so that I can efficiently update status displays without fetching full episode data.

#### Acceptance Criteria

1. THE Episode Status Endpoint SHALL accept episode ID as a path parameter
2. THE Episode Status Endpoint SHALL return current status and status history array
3. THE Episode Status Endpoint SHALL include timestamps for each status transition
4. THE Episode Status Endpoint SHALL validate user authorization to access the episode
5. THE Episode Status Endpoint SHALL return 404 status code when episode does not exist

### Requirement 11: Intuitive User Experience

**User Story:** As a content creator, I want the interface to be intuitive and helpful, so that I can accomplish tasks without confusion.

#### Acceptance Criteria

1. THE Episode UI SHALL provide contextual help text for complex operations
2. THE Episode UI SHALL display dismissible help tooltips for first-time users
3. THE Episode UI SHALL use consistent visual language across all episode management features
4. THE Episode UI SHALL provide clear call-to-action buttons with descriptive labels
5. THE Episode UI SHALL display loading states during asynchronous operations
6. WHERE user input is required, THE Episode UI SHALL provide inline validation feedback

### Requirement 12: Dedicated Episode Pages

**User Story:** As a content creator, I want dedicated pages for different episode management tasks, so that I can focus on specific workflows without distraction.

#### Acceptance Criteria

1. THE Episode UI SHALL provide an episode list page displaying all episodes
2. THE Episode UI SHALL provide an episode detail page for viewing episode information
3. THE Episode UI SHALL provide an episode editor page for modifying episode content
4. THE Episode UI SHALL implement client-side routing between episode pages
5. THE Episode UI SHALL maintain navigation state when moving between pages

