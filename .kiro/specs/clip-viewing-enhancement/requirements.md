# Requirements Document

## Introduction

This feature enhances the clip generation and viewing experience by adding transcript text to clip segments, creating an endpoint to generate individual clips on-demand, returning full clip transcripts in API responses, and building a comprehensive clip detail page with video playback and modal viewing capabilities in the
# Glossary

- **Clip_Segment**: A time-bounded portion of video with associated transcript text
- **Clip_Transcript**: The complete transcript text for all segments in a clip
- **Clip_Generation_Endpoint**: API endpoint that triggers processing for a single clip
- **Clip_Detail_Page**: UI page displaying comprehensive clip information and video playback
- **Clip_Modal**: Overlay component for viewing clips without navigation
- **Clip_Playback_URL**: Presigned S3 URL for streaming clip video content
- **Create_Clips_Tool**: Bedrock agent tool for creating clip recommendations

## Requirements

### Requirement 1

**User Story:** As an AI agent, I want to include transcript text with each segment when creating clips, so that the system knows exactly what spoken content should be included in each clip.

#### Acceptance Criteria

1. WHEN creating a clip segment, THE Create_Clips_Tool SHALL accept a transcript field containing the spoken text for that segment
2. WHEN storing a clip, THE Create_Clips_Tool SHALL persist the transcript text for each segment in DynamoDB
3. WHEN validating segments, THE Create_Clips_Tool SHALL require transcript text to be present and non-empty
4. WHEN multiple segments exist, THE Create_Clips_Tool SHALL store transcript text independently for each segment
5. WHILE processing clips, THE Create_Clips_Tool SHALL maintain the association between timestamps and transcript text

### Requirement 2

**User Story:** As a content creator, I want to trigger clip generation for a single clip on-demand, so that I can process specific clips without waiting for batch processing.

#### Acceptance Criteria

1. WHEN I request clip generation, THE Clip_Generation_Endpoint SHALL accept an episode ID and clip ID as parameters
2. WHEN the endpoint is invoked, THE Clip_Generation_Endpoint SHALL validate that the clip exists and belongs to the specified episode
3. WHEN validation passes, THE Clip_Generation_Endpoint SHALL start a Step Functions execution for the specified clip
4. WHEN the execution starts, THE Clip_Generation_Endpoint SHALL return the execution ARN and initial status
5. IF the clip does not exist or is already processing, THEN THE Clip_Generation_Endpoint SHALL return an appropriate error response

### Requirement 3

**User Story:** As a frontend developer, I want the get clip API to return the full transcript text, so that I can display what was said in the clip without additional API calls.

#### Acceptance Criteria

1. WHEN retrieving a clip, THE Get_Clip_Endpoint SHALL include a transcript field in the response
2. WHEN assembling the transcript, THE Get_Clip_Endpoint SHALL concatenate transcript text from all segments in order
3. WHEN segments have no transcript, THE Get_Clip_Endpoint SHALL return an empty string for the transcript field
4. WHEN the clip has multiple segments, THE Get_Clip_Endpoint SHALL preserve segment order when building the transcript
5. WHILE returning clip data, THE Get_Clip_Endpoint SHALL include both individual segment transcripts and the combined transcript

### Requirement 4

**User Story:** As a content creator, I want a dedicated clip detail page with breadcrumb navigation, so that I can view comprehensive information about a specific clip and navigate back to the episode.

#### Acceptance Criteria

1. WHEN I navigate to a clip detail page, THE Clip_Detail_Page SHALL display breadcrumbs showing Episodes > Episode Title > Clip Title
2. WHEN viewing clip details, THE Clip_Detail_Page SHALL display the clip hook, summary, type, duration, and status
3. WHEN the clip has segments, THE Clip_Detail_Page SHALL display each segment with its timestamp range, speaker, and transcript text
4. WHEN breadcrumbs are clicked, THE Clip_Detail_Page SHALL navigate to the appropriate parent page
5. WHILE loading clip data, THE Clip_Detail_Page SHALL show a loading state until data is available

### Requirement 5

**User Story:** As a content creator, I want to watch generated clips directly on the clip detail page, so that I can review the video content before publishing.

#### Acceptance Criteria

1. WHEN a clip status is "processed", THE Clip_Detail_Page SHALL display a video player component
2. WHEN the video player loads, THE Clip_Detail_Page SHALL request a presigned playback URL from the API
3. WHEN the playback URL is received, THE Clip_Detail_Page SHALL load the video in an HTML5 video player
4. WHEN the clip is not yet processed, THE Clip_Detail_Page SHALL display the current processing status instead of a player
5. IF the clip generation failed, THEN THE Clip_Detail_Page SHALL display an error message with failure details

### Requirement 6

**User Story:** As a content creator, I want to view clips in a modal overlay from the clips list page, so that I can quickly preview clips without losing my place in the list.

#### Acceptance Criteria

1. WHEN a clip status is "processed" in the list view, THE Clips_List_Page SHALL display a "View Clip" action button
2. WHEN I click the view button, THE Clips_List_Page SHALL open a modal overlay displaying the clip video player
3. WHEN the modal is open, THE Clips_List_Page SHALL dim the background and prevent scrolling of the underlying page
4. WHEN I close the modal, THE Clips_List_Page SHALL return focus to the clips list without navigation
5. WHILE the modal is open, THE Clips_List_Page SHALL allow closing via an X button, escape key, or clicking outside the modal

### Requirement 7

**User Story:** As a content creator, I want the clips list to show which clips have been generated, so that I can quickly identify which clips are ready to view.

#### Acceptance Criteria

1. WHEN displaying clips in the list, THE Clips_List_Page SHALL show a visual indicator for clips with "processed" status
2. WHEN a clip is processed, THE Clips_List_Page SHALL enable the "View Clip" button
3. WHEN a clip is not processed, THE Clips_List_Page SHALL disable or hide the "View Clip" button
4. WHEN clips are in "processing" status, THE Clips_List_Page SHALL display a processing indicator
5. WHILE loading clip data, THE Clips_List_Page SHALL show loading states for individual clip items

### Requirement 8

**User Story:** As a system administrator, I want the clip playback endpoint to generate secure presigned URLs, so that clip videos can be streamed without exposing permanent S3 URLs.

#### Acceptance Criteria

1. WHEN requesting clip playback, THE Clip_Playback_Endpoint SHALL validate that the clip exists and is processed
2. WHEN generating the URL, THE Clip_Playback_Endpoint SHALL create a presigned S3 URL with 1-hour expiration
3. WHEN the clip file exists, THE Clip_Playback_Endpoint SHALL return the presigned URL with appropriate headers
4. WHEN the clip is not processed, THE Clip_Playback_Endpoint SHALL return a 404 error with descriptive message
5. IF the S3 object does not exist, THEN THE Clip_Playback_Endpoint SHALL return an error indicating the clip file is missing
