# Implementation Plan

- [x] 1. Set up core infrastructure and utilities




- [x] 1.1 Create Upload Context for background upload management


  - Implement upload state interface with id, episodeId, type, status, progress
  - Add localStorage persistence for upload state recovery
  - Implement addUpload, updateUpload, removeUpload, getEpisodeUploads methods
  - Add activeUploadsCount computed property
  - _Requirements: 1.4, 1.6_

- [x] 1.2 Create Activity Context for notifications management


  - Implement activity interface with id, type, title, message, episodeId, isRead
  - Add localStorage persistence for activities
  - Implement addActivity, markAsRead, markAllAsRead, clearActivity methods
  - Add unreadCount computed property
  - _Requirements: 1.8_

- [x] 1.3 Create episode API client functions


  - Add getEpisodeStatus function for status history endpoint
  - Add listEpisodes, getEpisode, createEpisode functions
  - Add uploadTranscript, initiateTrackUpload, signTrackParts, completeTrackUpload functions
  - Add listClips, getClip, updateClipStatus, playClip functions
  - _Requirements: 1.10, 1.12_

- [x] 1.4 Create episode TypeScript types


  - Define EpisodeListView, EpisodeDetail, StatusHistoryEntry interfaces
  - Define TrackInfo, TranscriptInfo, ClipListView, ClipSegment interfaces
  - Define UploadState, Activity interfaces
  - Export all types from types/index.ts
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 1.6, 1.7, 1.9_

- [x] 2. Build episode status and display components




- [x] 2.1 Create EpisodeStatusChip component


  - Implement status chip with color mapping for draft, processing, published, archived
  - Add size variants (sm, md, lg)
  - Add optional icon display
  - Apply Tailwind CSS styling with status-specific colors
  - _Requirements: 1.1_

- [x] 2.2 Create StatusHistoryTimeline component


  - Implement vertical timeline layout with status entries
  - Display status, timestamp, and duration for each entry
  - Add relative timestamp formatting (2 hours ago)
  - Apply visual styling with status icons and connecting lines
  - _Requirements: 1.9_

- [x] 2.3 Create EpisodeCard component for list view


  - Display episode title, number, air date, platforms
  - Include EpisodeStatusChip component
  - Show quick stats (tracks, transcript, clips count)
  - Add click handler to navigate to episode overview
  - _Requirements: 1.1, 1.12_

- [x] 3. Build upload management components




- [x] 3.1 Create TranscriptUploader component


  - Implement file input for .srt files
  - Add file validation (format, size limits)
  - Request presigned URL from API
  - Upload file to S3 with progress tracking
  - Update Upload Context with upload state
  - Display upload progress and completion status
  - _Requirements: 1.2, 1.5_

- [x] 3.2 Create TrackUploader component


  - Implement file input for video files
  - Add track name input (main, guest, screenshare)
  - Initiate multipart upload for large files (>100MB)
  - Split file into 10MB chunks
  - Request signed URLs for each part
  - Upload parts concurrently (max 3 at a time)
  - Complete multipart upload
  - Update Upload Context with upload state
  - _Requirements: 1.3, 1.5_

- [x] 3.3 Create UploadProgress component


  - Display upload filename and progress percentage
  - Show estimated time remaining
  - Add pause/resume/cancel controls
  - Display error messages with retry option
  - _Requirements: 1.5_

- [x] 3.4 Create UploadManager widget


  - Display active uploads count badge
  - Implement collapsible panel with upload list
  - Position widget in bottom-right corner
  - Show individual UploadProgress components
  - Add minimize/expand functionality
  - _Requirements: 1.4, 1.5_

- [x] 4. Build clip management components




- [x] 4.1 Create ClipCard component


  - Display clip title, hook, duration, segments
  - Include status chip for clip status
  - Add action buttons (Play, Approve, Reject)
  - Show segment details with timestamps
  - _Requirements: 1.6_

- [x] 4.2 Create ClipPlayer component


  - Fetch presigned video URL from /play endpoint
  - Implement HTML5 video player with standard controls
  - Add fullscreen support
  -ding state while fetching URL
  - Handle playback errors with retry option
  - _Requirements: 1.7_

- [x] 4.3 Create ClipsList component


  - Display list of clips for episode
  - Add status filter (All, Detected, Processing, Processed)
  - Render ClipCard components for each clip
  - Handle empty state (no clips detected)
  - _Requirements: 1.6_

- [x] 5. Build activity notification components





- [x] 5.1 Enhance existing activity icon component


  - Add unread count badge to existing pulse icon
  - Add click handler to toggle dropdown
  - Show active state when dropdown is open
  - Maintain existing position in application header
  - _Requirements: 1.8_

- [x] 5.2 Create ActivityDropdown component


  - Display list of recent activities (limit to 5 most recent)
  - Show activity type, title, message, timestamp
  - Add "Mark all as read" button
  - Add "View all activities" link to navigate to full activity page
  - Implement click on activity to navigate to related episode/clip
  - Handle empty state (no activities)
  - _Requirements: 1.8_

- [x] 5.3 Create ActivityItem component


  - Display activity icon based on type
  - Show title, message, and relative timestamp
  - Apply visual styling for read/unread state
  - Add click handler to mark as read and navigate
  - _Requirements: 1.8_

- [x] 6. Build episode pages with nested routing





- [x] 6.1 Create EpisodesListPage


  - Fetch and display paginated episode list
  - Render EpisodeCard components
  - Implement cursor-based pagination with "Load More" button
  - Add loading skeleton while fetching
  - Handle empty state (no episodes)
  - _Requirements: 1.12_

- [x] 6.2 Create EpisodeOverviewPage (sub-page)


  - Display episode title, number, air date, platforms, themes
  - Show episode description
  - Include StatusHistoryTimeline component
  - Display quick stats (tracks, transcript, clips count)
  - Add "Edit Details" button to navigate to details page
  - _Requirements: 1.1, 1.9, 1.11, 1.12_

- [x] 6.3 Create EpisodeDetailsPage (sub-page)


  - Display form for editing episode metadata
  - Include inputs for title, episode number, air date, description
  - Add platform checkboxes (YouTube, Twitch, LinkedIn, X)
  - Add themes input (comma-separated or tags)
  - Implement form validation with Zod
  - Save changes to API on submit
  - _Requirements: 1.11, 1.12_

- [x] 6.4 Create EpisodeContentPage (sub-page)


  - Include TranscriptUploader component
  - Display current transcript status if uploaded
  - Include TrackUploader component
  - Display list of uploaded tracks with status
  - Show upload progress for active uploads
  - _Requirements: 1.2, 1.3, 1.5, 1.12_

- [x] 6.5 Create EpisodeClipsPage (sub-page)


  - Include ClipsList component
  - Display clips with status filters
  - Show clip count and status breakdown
  - Handle empty state (no clips detected)
  - _Requirements: 1.6, 1.7, 1.12_

- [x] 6.6 Implement nested routing for episode sub-pages


  - Configure React Router routes for /episodes/:id/overview, /details, /content, /clips
  - Add sidebar navigation with active sub-page indicator
  - Implement route guards to ensure episode exists
  - Add breadcrumb navigation
  - _Requirements: 1.12_

- [x] 7. Implement backend episode status endpoint




- [x] 7.1 Create GetEpisodeStatusFunction Lambda


  - Extract tenantId and episodeId from request
  - Query DynamoDB for episode metadata
  - Return 404 if episode not found
  - Extract statusHistory from episode item
  - Compute currentStatus from latest history entry
  - Return episodeId, currentStatus, statusHistory, updatedAt
  - _Requirements: 1.10_

- [x] 7.2 Add episode status endpoint to OpenAPI spec


  - Define GET /episodes/{episodeId}/status endpoint
  - Add path parameter for episodeId
  - Define response schema with episodeId, currentStatus, statusHistory
  - Add 404 error response for episode not found
  - _Requirements: 1.10_

- [x] 7.3 Add GetEpisodeStatusFunction to SAM template


  - Define Lambda function with Node.js 22.x runtime
  - Add DynamoDB read permissions
  - Configure API Gateway integration
  - Set environment variables (TABLE_NAME)
  - _Requirements: 1.10_

- [x] 8. Implement Momento Topics publishing infrastructure




- [x] 8.1 Add Momento SDK dependency to backend


  - Add @gomomento/sdk to package.json
  - Install dependency with npm install
  - _Requirements: 1.8_



- [x] 8.2 Create Momento Topics publishing utility

  - Create functions/utils/notifications.mjs
  - Initialize TopicClient with environment variable credentials
  - Implement publishNotification function accepting tenantId and notification
  - Publish to topic using tenantId as topic name


  - Include error handling for publish failures
  - _Requirements: 1.8_

- [x] 8.3 Add Momento environment variables to SAM template


  - Add MOMENTO_API_KEY to global environment variables
  - Add MOMENTO_CACHE_NAME to global environment variables
  - Configure as NoEcho parameters for security
  - _Requirements: 1.8_



- [x] 8.4 Integrate Momento publishing in clip detection Lambda

  - Import publishNotification utility
  - Publish clip_detected notification after clips are created


  - Include episodeId, clip count, and timestamp in message
  - _Requirements: 1.8_

- [x] 8.5 Integrate Momento publishing in preprocessing Lambda


  - Import publishNotification utility
  - Publish preprocessing_completed notification after MediaConvert job completes
  - Include episodeId, trackName, and timestamp in message
  - _Requirements: 1.8_

- [x] 8.6 Integrate Momento publishing in clip processing Lambda

  - Import publishNotification utility
  - Publish clip_processed notification after clip video is generated
  - Include episodeId, clipId, title, and timestamp in message
  - _Requirements: 1.8_

- [x] 8.7 Integrate Momento publishing in status update Lambda

  - Import publishNotification utility
  - Publish status_changed notification after episode status is updated
  - Include episodeId, new status, and timestamp in message
  - _Requirements: 1.8_

- [x] 9. Add user experience enhancements





- [x] 9.1 Add contextual help tooltips



  - Create dismissible help tooltip component
  - Add help for transcript upload (explain .srt format)
  - Add help for track upload (explain track naming)
  - Add help for status chip (explain status meanings)
  - Store dismissed state in localStorage
  - _Requirements: 1.11_

- [x] 9.2 Implement loading states


  - Add skeleton loaders for episode list
  - Add skeleton loaders for episode detail pages
  - Add loading spinner for clip player
  - Add loading indicator for upload operations
  - _Requirements: 1.11_

- [x] 9.3 Add empty states


  - Create empty state for no episodes
  - Create empty state for no clips
  - Create empty state for no uploads
  - Create empty state for no activities
  - Include helpful messaging and call-to-action buttons
  - _Requirements: 1.11_

- [x] 9.4 Implement error boundaries



  - Create error boundary component for episode pages
  - Add error boundary for clip player
  - Add error boundary for upload components
  - Display user-friendly error messages
  - _Requirements: 1.11_

- [x] 10. Integration and polish





- [x] 10.1 Integrate Upload Manager widget into app layout


  - Add UploadManager to main app layout
  - Position in bottom-right corner
  - Ensure visibility across all pages
  - _Requirements: 1.4_

- [x] 10.2 Integrate ActivityDropdown with existing activity icon


  - Connect ActivityDropdown to existing activity icon component
  - Ensure dropdown appears on icon click
  - Verify "View all activities" link navigates to activity page
  - _Requirements: 1.8_

- [x] 10.3 Add episode navigation to sidebar


  - Update sidebar to show active episode
  - Add sub-page navigation items
  - Highlight active sub-page
  - _Requirements: 1.12_

- [x] 10.4 Deploy and verify in staging environment


  - Deploy backend changes with SAM
  - Deploy frontend changes
  - Verify all endpoints are accessible
  - _Requirements: All_

