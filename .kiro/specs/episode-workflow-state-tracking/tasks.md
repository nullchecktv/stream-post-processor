# Implementation Plan

- [ ] 1. Create Workflow State Schema and Utilities

- [x] 1.1 Create workflow state schema definitions
  - Create schemas/workflow.mjs with Zod schemas
  - Define WorkflowStepStatus enum (Locked, Ready, In Progress, Complete, Skipped, Failed)
  - Define ContentGenerationStatus enum (Pending, Processing, Complete, Failed)
  - Define WorkflowStepSchema and ContentGenerationSchema
  - Export status constants and transition maps
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.2 Create workflow state utility functions
  - Create functions/utils/workflow-state.mjs
  - Implement initializeWorkflowSteps() to create initial workflow records
  - Implement updateWorkflowStep() to update step status and history
  - Implement getWorkflowState() to query all workflow and content generation states
  - Implement initializeContentGeneration() to create content generation records
  - Implement updateContentGeneration() to update content generation status
  - Implement unlockDependentSteps() to handle step dependencies
  - Implement checkUploadTranscriptCompletion() to check if all content is complete
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [x] 2. Update Episode Creation to Initialize Workflow

- [x] 2.1 Update create-episode Lambda to initialize workflow steps
  - Import initializeWorkflowSteps from workflow-state utility
  - Call initializeWorkflowSteps after episode creation
  - Set generate-plan to Ready, upload-transcript and upload-tracks to Locked
  - Handle errors gracefully
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 3. Implement Workflow State API Endpoints

- [x] 3.1 Create get-workflow-state Lambda function
  - Create functions/episodes/get-workflow-state.mjs
  - Implement GET /episodes/{episodeId}/workflow endpoint
  - Query all workflow steps and content generation states
  - Return aggregated workflow state
  - Add error handling and logging
  - _Requirements: 8.1, 8.5_

- [x] 3.2 Add get-workflow-state endpoint to OpenAPI spec
  - Add GET /episodes/{episodeId}/workflow to openapi.yaml
  - Define request parameters and response schema
  - Add authentication requirements
  - _Requirements: 8.1_

- [x] 3.3 Add get-workflow-state function to SAM template
  - Add GetWorkflowStateFunction to template.yaml
  - Configure API Gateway integration
  - Set appropriate IAM permissions (dynamodb:Query)
  - Add environment variables
  - _Requirements: 8.1_

- [ ] 4. Update Plan Generation to Manage Workflow State

- [ ] 4.1 Update add-plan Lambda to manage workflow state
  - Import updateWorkflowStep and unlockDependentSteps utilities
  - Update generate-plan step to "In Progress" when plan generation starts
  - Update generate-plan step to "Complete" when plan is saved
  - Unlock upload-transcript and upload-tracks steps on completion
  - Publish Momento notification for workflow state change
  - Handle errors and update to "Failed" status if needed
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 9.1, 9.3_

- [ ] 4.2 Add skip plan functionality
  - Add skip parameter to add-plan endpoint
  - Update generate-plan step to "Skipped" when skip is true
  - Unlock dependent steps when skipped
  - Publish Momento notification
  - _Requirements: 1.7_

- [ ] 5. Update Transcript Upload to Manage Workflow State

- [ ] 5.1 Update upload-transcript Lambda to manage workflow state
  - Import updateWorkflowStep utility
  - Update upload-transcript step to "In Progress" when upload starts
  - Handle status updates appropriately
  - _Requirements: 1.8_

- [ ] 5.2 Update transcript-added event handler to initialize content generation
  - Import initializeContentGeneration and updateWorkflowStep utilities
  - Update upload-transcript step to "Processing" when transcript is uploaded
  - Initialize content generation records (blog, quotes, clips) with "Pending" status
  - Publish Momento notification for workflow state change
  - _Requirements: 2.1, 2.2, 2.3, 9.2, 9.3_

- [ ] 6. Update Content Generation Processes to Manage State

- [ ] 6.1 Update blog-generator to manage content generation state
  - Import updateContentGeneration utility
  - Update blog content generation to "Processing" when generation starts
  - Update to "Complete" when blog is generated with itemCount
  - Update to "Failed" on error with error message
  - Publish Momento notification for content generation state change
  - Check if all content generation is complete and update upload-transcript step
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 9.2, 9.3_

- [ ] 6.2 Update clip-detector to manage content generation state
  - Import updateContentGeneration utility
  - Update clips content generation to "Processing" when detection starts
  - Update to "Complete" when clips are detected with itemCount
  - Update to "Failed" on error with error message
  - Publish Momento notification for content generation state change
  - Check if all content generation is complete and update upload-transcript step
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 9.2, 9.3_

- [ ] 6.3 Create quote-generator Lambda (if not exists) and manage state
  - Create functions/agents/quote-generator.mjs if needed
  - Import updateContentGeneration utility
  - Update quotes content generation to "Processing" when generation starts
  - Update to "Complete" when quotes are generated with itemCount
  - Update to "Failed" on error with error message
  - Publish Momento notification for content generation state change
  - Check if all content generation is complete and update upload-transcript step
  - _Requirements: 2.4, 2.5, 2.6, 2.7, 2.8, 9.2, 9.3_

- [ ] 7. Update Track Upload to Manage Workflow State

- [ ] 7.1 Update create-track-upload Lambda to manage workflow state
  - Import updateWorkflowStep utility
  - Update upload-tracks step to "In Progress" when upload starts
  - _Requirements: 1.8_

- [ ] 7.2 Update complete-track-upload Lambda to manage workflow state
  - Import updateWorkflowStep utility
  - Update upload-tracks step to "Complete" when upload completes successfully
  - Update to "Failed" on error with error message
  - Publish Momento notification for workflow state change
  - _Requirements: 1.9, 9.1, 9.3_

- [ ] 8. Enhance Momento Notification Publishing

- [ ] 8.1 Update publishNotificationEvent utility for workflow notifications
  - Ensure publishNotificationEvent supports workflow state updates
  - Add workflowState to metadata for real-time updates
  - Support subscriptionId pattern for episode-specific updates
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 9. Create Frontend Workflow State Hook

- [ ] 9.1 Create useWorkflowState custom hook
  - Create frontend/src/hooks/useWorkflowState.ts
  - Define WorkflowStep and ContentGeneration TypeScript interfaces
  - Implement initial state fetch from API
  - Subscribe to Momento Topics for real-time updates
  - Handle workflow_step_updated and content_generation_updated messages
  - Update local state when Momento messages received
  - Implement fallback polling if Momento connection fails
  - Return workflow state and helper functions
  - _Requirements: 9.4, 9.5, 9.6_

- [ ] 10. Update WorkflowProgress Component

- [ ] 10.1 Enhance WorkflowProgress component to use workflow state
  - Update frontend/src/components/episodes/WorkflowProgress.tsx
  - Use useWorkflowState hook to get workflow state
  - Display Pre-Stream section with Generate Plan step
  - Display Post-Stream section with Upload Transcript and Upload Tracks steps
  - Show step status badges (Locked, Ready, In Progress, Complete, Skipped, Failed)
  - Display "Processing" indicator for In Progress and Processing states
  - Calculate and display completion percentage
  - Update in real-time when workflow state changes
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [ ] 10.2 Add step action buttons to WorkflowProgress
  - Add "Generate Plan" button when generate-plan is Ready
  - Add "Skip" button for generate-plan step
  - Add "Upload Transcript" button/link when upload-transcript is Ready
  - Add "Upload Tracks" button/link when upload-tracks is Ready
  - Add "Retry" button for Failed steps
  - Handle button clicks appropriately
  - _Requirements: 10.5, 10.6, 10.7_

- [ ] 11. Update ContentCardsGrid Component

- [ ] 11.1 Enhance ContentCardsGrid to show content generation state
  - Update frontend/src/components/episodes/ContentCardsGrid.tsx
  - Use useWorkflowState hook to get content generation state
  - Pass generationState prop to BlogPostCard, QuotesCard, ClipsCard
  - _Requirements: 6.1, 6.2_

- [ ] 11.2 Update content cards to display generation state
  - Update BlogPostCard, QuotesCard, ClipsCard components
  - Show "Processing" indicator when status is Pending or Processing
  - Show generated content when status is Complete
  - Show error message and retry button when status is Failed
  - Display item count when available
  - Update in real-time when content generation state changes
  - _Requirements: 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 12. Create Separate Upload Pages

- [ ] 12.1 Create TranscriptUploadPage
  - Create frontend/src/pages/TranscriptUploadPage.tsx
  - Display WorkflowProgress component for context
  - Implement transcript file upload UI
  - Show upload progress
  - Handle upload completion and redirect to episode overview
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12.2 Create TracksUploadPage
  - Create frontend/src/pages/TracksUploadPage.tsx
  - Display WorkflowProgress component for context
  - Implement track upload UI (reuse TrackUploader component)
  - Show upload progress for multipart uploads
  - Handle upload completion and redirect to episode overview
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12.3 Add routes for upload pages
  - Add /episodes/:episodeId/transcript route to React Router
  - Add /episodes/:episodeId/tracks route to React Router
  - Update navigation links in episode overview to point to new pages
  - _Requirements: 7.1, 7.2, 7.3_

- [ ] 13. Add Error Handling and Retry Functionality

- [ ] 13.1 Implement error display in workflow components
  - Show error messages in WorkflowProgress for failed steps
  - Show error messages in ContentCardsGrid for failed content generation
  - Display user-friendly error messages
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [ ] 13.2 Implement retry functionality
  - Add "Retry" button for failed workflow steps
  - Add "Retry" button for failed content generation
  - Reset state to Ready/Pending when retry is clicked
  - Re-trigger the failed operation
  - _Requirements: 10.5, 10.6, 10.7_

- [ ] 14. Update API Client

- [ ] 14.1 Add workflow state API methods to frontend API client
  - Add getWorkflowState(episodeId) method to frontend/src/api/episodes.ts
  - Add TypeScript types for workflow state responses
  - Handle errors appropriately
  - _Requirements: 8.1_

- [ ] 15. Testing and Validation

- [ ] 15.1 Test workflow initialization on episode creation
  - Create new episode and verify workflow steps are initialized
  - Verify generate-plan is Ready, others are Locked
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 15.2 Test plan generation workflow
  - Start plan generation and verify status changes to In Progress
  - Complete plan generation and verify status changes to Complete
  - Verify upload-transcript and upload-tracks unlock
  - Verify Momento notifications are published
  - _Requirements: 1.4, 1.5, 1.6, 1.7_

- [ ] 15.3 Test transcript upload and content generation workflow
  - Upload transcript and verify upload-transcript changes to Processing
  - Verify content generation records are created with Pending status
  - Verify blog, quotes, clips generation updates to Processing then Complete
  - Verify upload-transcript changes to Complete when all content is done
  - Verify Momento notifications are published
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8_

- [ ] 15.4 Test track upload workflow
  - Upload track and verify upload-tracks changes to In Progress
  - Complete upload and verify status changes to Complete
  - Verify Momento notifications are published
  - _Requirements: 1.8, 1.9_

- [ ] 15.5 Test real-time updates in frontend
  - Verify WorkflowProgress updates in real-time via Momento
  - Verify ContentCardsGrid updates in real-time via Momento
  - Test fallback polling if Momento connection fails
  - _Requirements: 9.4, 9.5, 9.6_

- [ ] 15.6 Test error handling and retry
  - Trigger errors in workflow steps and verify Failed status
  - Verify error messages display correctly
  - Test retry functionality for failed steps
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [ ] 15.7 Test separate upload pages
  - Navigate to transcript upload page and verify UI
  - Navigate to tracks upload page and verify UI
  - Test upload functionality on both pages
  - Verify redirects after successful uploads
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
