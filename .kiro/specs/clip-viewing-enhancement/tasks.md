# Implementation Plan

- [x] 1. Update create-clips tool to include transcript field in segments





  - Add transcript field to segment schema with validation (required, min 1 character)
  - Update segment storage to persist transcript text in DynamoDB
  - Update tool description to document transcript field requirement
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Enhance get-clip endpoint to return transcript with speaker labels







  - [ ] 2.1 Add transcript concatenation logic with speaker labels
    - Iterate through segments in order
    - Format each segment as `[speaker]: transcript text`

    - Join segments with double newlines
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  - [x] 2.2 Add segmentCount field to response

    - Calculate count from segments array length
    - Include in response object
    - _Requirements: 3.1, 3.5_
  - [ ] 2.3 Remove segments array from response
    - Keep segments for internal processing only
    - Return only transcript and segmentCount
    - _Requirements: 3.1, 3.5_

- [x] 3. Create generate-clip endpoint





  - [x] 3.1 Create new Lambda function for clip generation


    - Extract tenantId from authorizer context
    - Parse episodeId and clipId from path parameters
    - Parse orientation from request body
    - _Requirements: 2.1, 2.2, 2.3_
  - [x] 3.2 Implement orientation validation

    - Validate orientation is "landscape" or "portrait"
    - Return 400 error for invalid values
    - _Requirements: 2.3_
  - [x] 3.3 Implement clip validation logic

    - Query DynamoDB to get clip
    - Verify clip exists and belongs to episode
    - Check clip status is "detected" or "failed"
    - Return appropriate errors for invalid states
    - _Requirements: 2.2, 2.4, 2.5_
  - [x] 3.4 Implement Step Functions execution

    - Start execution with clip data and orientation
    - Pass tenantId, episodeId, clipId, segments, orientation
    - Return execution ARN and status
    - _Requirements: 2.4, 2.5_
  - [x] 3.5 Add Lambda function to SAM template


    - Define GenerateClipFunction resource
    - Configure environment variables (STATE_MACHINE_ARN)
    - Grant Step Functions start execution permission
    - Set appropriate timeout and memory
    - _Requirements: 2.1, 2.4_
  - [x] 3.6 Add API Gateway integration to OpenAPI spec


    - Define POST /episodes/{episodeId}/clips/{clipId}/generate endpoint
    - Add request body schema with orientation field
    - Define response schemas for 202, 400, 404 status codes
    - Add x-amazon-apigateway-integration configuration
    - _Requirements: 2.1, 2.3, 2.5_

- [x] 4. Create clip detail page component





  - [x] 4.1 Create ClipDetailPage component with routing


    - Set up route /episodes/:episodeId/clips/:clipId
    - Extract episodeId and clipId from URL parameters
    - Add route to frontend router configuration
    - _Requirements: 4.1, 4.2_
  - [x] 4.2 Implement breadcrumb navigation

    - Create breadcrumb component showing Episodes > Episode Title > Clip Title
    - Fetch episode data for breadcrumb display
    - Add navigation links to parent pages
    - _Requirements: 4.1, 4.4_
  - [x] 4.3 Implement clip data fetching

    - Fetch clip data using clipsApi.get()
    - Fetch episode data using episodesApi.get()
    - Handle loading states
    - Handle error states
    - _Requirements: 4.2, 4.5_
  - [x] 4.4 Implement video player for processed clips


    - Check if clip status is "processed"
    - Fetch playback URL using clipsApi.getPlaybackUrl()
    - Render HTML5 video element with controls
    - Handle playback URL expiration
    - _Requirements: 5.1, 5.2, 5.3_
  - [x] 4.5 Implement status display for non-processed clips

    - Show status message for clips not yet processed
    - Display error message for failed clips
    - Show processing indicator for clips in progress
    - _Requirements: 5.4, 5.5_
  - [x] 4.6 Implement generate button for detected clips

    - Show generate button when status is "detected"
    - Call clipsApi.generate() with landscape orientation
    - Handle success and error responses
    - Refresh clip data after generation starts
    - _Requirements: 4.2_
  - [x] 4.7 Display clip metadata and transcript

    - Show clip title, status badge, duration, and type
    - Display clip summary/description
    - Show transcript with segment count
    - Preserve line breaks in transcript display
    - _Requirements: 4.2, 4.3_

- [x] 5. Create clip modal component for list view





  - [x] 5.1 Create ClipModal component


    - Accept clipId, episodeId, isOpen, onClose props
    - Fetch playback URL when modal opens
    - Render video player in modal
    - _Requirements: 6.2, 6.3_
  - [x] 5.2 Implement modal overlay and backdrop

    - Create fixed full-screen overlay
    - Add semi-transparent backdrop
    - Center modal content in viewport
    - _Requirements: 6.3_
  - [x] 5.3 Implement modal close functionality

    - Add close button (X icon)
    - Handle escape key press
    - Handle backdrop click
    - Prevent body scroll when modal is open
    - _Requirements: 6.4, 6.5_
  - [x] 5.4 Update ClipsList component to show view buttons


    - Add "View Clip" button for processed clips
    - Disable/hide button for non-processed clips
    - Show processing indicator for clips in progress
    - Open ClipModal on button click
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 6. Add clips API client methods





  - [x] 6.1 Add generate method to clips API client


    - Create POST request to /episodes/{episodeId}/clips/{clipId}/generate
    - Accept episodeId, clipId, and orientation parameters
    - Return execution ARN and status
    - _Requirements: 2.1_
  - [x] 6.2 Update get method to handle new response fields


    - Add transcript field to Clip type
    - Add segmentCount field to Clip type
    - Remove segments array from Clip type
    - _Requirements: 3.1_
  - [x] 6.3 Add getPlaybackUrl method (if not exists)


    - Create GET request to /episodes/{episodeId}/clips/{clipId}/play
    - Return playback URL and metadata
    - Handle 404 for non-processed clips
    - _Requirements: 5.2, 8.1, 8.2, 8.3_

- [x] 7. Update TypeScript types for clips





  - Add transcript field to Clip interface
  - Add segmentCount field to Clip interface
  - Remove segments array from Clip interface
  - Add orientation type for generate requests
  - _Requirements: 3.1, 3.2_
