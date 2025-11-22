# Workflow Step State Tracking Implementation Plan

- [x] 1. Implement schema and data model

- [x] 1.1 Add workflow step schema definitions
  - Add `WorkflowStepStatus` enum to `schemas/episodes.mjs`
  - Add `WORKFLOW_STEP_STATUS` constants
  - Add `WorkflowStepSchema` and `WorkflowStepsSchema` Zod schemas
  - Add `WORKFLOW_STEP_TRANSITIONS` map for valid state changes
  - Update `EpisodeCreateSchema` to include optional `workflowSteps`
  - _Requirements: FR-1, FR-2, FR-3_

- [x] 1.2 Create workflow step utility functions
  - Create `functions/utils/workflow-steps.mjs`
  - Implement `WORKFLOW_STEPS` constants
  - Implement `validateWorkflowStepTransition()` for state validation
  - Implement `initializeWorkflowSteps()` for new episodes
  - Implement `canProceedToUploads()` for dependency checking
  - Implement `updateWorkflowStepStatus()` helper with DynamoDB and notification logic
  - _Requirements: FR-3, FR-4, FR-5, FR-8_

- [x] 1.3 Write unit tests for workflow utilities
  - Create `tests/unit/workflow-steps.test.mjs`
  - Test status transition validation for all valid and invalid transitions
  - Test workflow step initialization
  - Test upload dependency logic
  - Test error cases and edge conditions
  - _Requirements: NFR-2_

- [x] 2. Implement backend API and integrations

- [x] 2.1 Create skip plan generation endpoint
  - Create `functions/episodes/skip-plan-generation.mjs`
  - Validate episode exists and plan not already generated
  - Update workflow step to "Skipped" using helper
  - Add to `template.yaml` with API Gateway integration
  - Add to `openapi.yaml` with proper schemas
  - _Requirements: FR-6, US-3_

- [x] 2.2 Update episode creation with workflow steps
  - Update `functions/episodes/create-episode.mjs`
  - Initialize `workflowSteps` with `initializeWorkflowSteps()`
  - Ensure all new episodes have workflow steps initialized
  - Update existing tests
  - _Requirements: FR-1_

- [x] 2.3 Integrate plan generation status tracking
  - Update `functions/tools/set-plan-recommendations.mjs`
  - Set status to "In Progress" at start of generation
  - Set status to "Completed" on successful completion
  - Set status to "Failed" on error with error message
  - Update tests
  - _Requirements: FR-4, FR-5, US-2_

- [x] 2.4 Integrate transcript upload status tracking
  - Update `functions/agents/clip-detector.mjs`
  - Set status to "In Progress" at start of transcript processing
  - Set status to "Completed" when clip detection finishes
  - Set status to "Failed" on error
  - Update tests
  - _Requirements: FR-4, FR-5, US-5_

- [x] 2.5 Integrate track upload status tracking
  - Update `functions/episodes/complete-track-upload.mjs` to set "In Progress" on first track
  - Update `functions/events/preprocessing-completed.mjs` to check all tracks
  - Set status to "Completed" when all tracks processed
  - Handle partial failures appropriately
  - Update tests
  - _Requirements: FR-4, FR-5, US-5_

- [x] 3. Implement frontend updates

- [x] 3.1 Add TypeScript type definitions
  - Create `frontend/src/types/workflow.ts`
  - Define `WorkflowStepStatus`, `WorkflowStep`, and `WorkflowSteps` types
  - Update `Episode` type to include `workflowSteps`
  - _Requirements: FR-7_

- [x] 3.2 Update API client for skip functionality
  - Update `frontend/src/api/episodes.ts`
  - Add `skipPlanGeneration()` method
  - Add proper TypeScript types and error handling
  - _Requirements: FR-6, US-3_

- [x] 3.3 Update workflow progress component
  - Update `frontend/src/components/episodes/WorkflowProgress.tsx`
  - Accept `workflowSteps` prop instead of deriving state
  - Add spinner icon for "In Progress" status
  - Add error icon for "Failed" status
  - Add skip icon for "Skipped" status
  - Implement dependency enforcement (disable uploads when plan not ready)
  - Add tooltips explaining disabled states
  - Add skip button for plan generation
  - _Requirements: FR-7, FR-8, US-1, US-3, US-4_

- [x] 3.4 Update episode overview page
  - Update `frontend/src/pages/EpisodeOverviewPage.tsx`
  - Pass `workflowSteps` to WorkflowProgress component
  - Remove full page refresh on task notifications
  - Add focused content updates for specific notifications
  - Handle workflow step update notifications
  - _Requirements: FR-7, US-6_

- [x] 3.5 Update notification context
  - Update `frontend/src/contexts/NotificationContext.tsx`
  - Add handler for `workflow_step_updated` notifications
  - Update episode state with new workflow step status
  - Prevent full page refresh on workflow updates
  - _Requirements: FR-5, FR-7, US-6_

- [x] 3.6 Update useWorkflowState hook
  - Update `frontend/src/hooks/useWorkflowState.ts`
  - Use explicit `workflowSteps` instead of deriving state
  - Update `currentStep`, `completedSteps`, and `nextAction` logic
  - Handle all five status values
  - _Requirements: FR-7, US-1_

- [x] 4. Integration and end-to-end testing

- [x] 4.1 Write integration tests
  - Create `tests/integration/workflow-steps.test.mjs`
  - Test complete workflow: create → plan → upload → tracks
  - Test skip plan workflow
  - Test status transitions during actual processing
  - Test notification publishing
  - Test dependency enforcement
  - Test error scenarios and concurrent updates
  - _Requirements: NFR-2_

- [x] 4.2 Write end-to-end tests
  - Add E2E tests for workflow progress UI
  - Test plan generation with spinner display
  - Test skip plan functionality
  - Test upload dependency enforcement
  - Test real-time status updates
  - Test error states and multiple browser tabs
  - _Requirements: NFR-1, US-6_

- [x] 5. Implement content item status tracking

- [x] 5.1 Update clip generation workflow
  - Update Step Functions state machine to set status to "Processing" at start
  - Update state machine to set status to "Created"/"Failed" at completion
  - Add status update steps with DynamoDB UpdateItem
  - Publish notifications for status changes
  - Update tests
  - _Requirements: FR-9, FR-10, FR-11, US-7_

- [x] 5.2 Update quote generation
  - Update `functions/events/generate-quote-graphic.mjs`
  - Set status to "Processing" at start
  - Set status to "Created"/"Failed" at completion
  - Store error message on failure
  - Publish notifications for status changes
  - Update tests
  - _Requirements: FR-9, FR-10, FR-11, US-7_

- [x] 5.3 Update blog generation
  - Update `functions/blogs/generate-blog.mjs`
  - Set status to "Processing" at start
  - Set status to "Created"/"Failed" at completion
  - Store error message on failure
  - Publish notifications for status changes
  - Update tests
  - _Requirements: FR-9, FR-10, FR-11, US-7_

- [x] 5.4 Update frontend content item display
  - Create `ClipCard`, `QuoteCard`, `BlogCard` components with status badges
  - Add spinner for "Processing" status
  - Add checkmark for "Created" status
  - Add error icon with tooltip for "Failed" status
  - Sort processing items to top of lists
  - Show processing count summary
  - _Requirements: FR-12, US-7, US-8_

- [x] 5.5 Update notification context for content items
  - Add handlers for `clip_status_updated`, `quote_status_updated`, `blog_status_updated`
  - Update content item state on notification
  - Prevent full page refresh
  - Update only affected item in list
  - _Requirements: FR-10, US-7_

- [x] 6. Deploy and monitor

- [x] 6.1 Commit and push changes
  - Review all changes made for content item status tracking
  - Commit changes with descriptive message
  - Push to GitHub repository
  - CI/CD pipeline will automatically deploy to dev environment
  - _Requirements: NFR-1, NFR-2_

- [x] 6.2 Monitor dev deployment
  - Wait for GitHub Actions workflow to complete
  - Check deployment logs for any errors
  - Run smoke tests in dev environment
  - Monitor CloudWatch logs and metrics
  - Test real-time status updates for clips, quotes, and blog posts
  - _Requirements: NFR-1, NFR-2_

- [x] 6.3 Deploy to production
  - Create pull request from dev branch to main
  - Review and approve PR
  - Merge to main branch
  - CI/CD pipeline will automatically deploy to production
  - Monitor CloudWatch logs and metrics
  - Verify real-time update functionality in production
  - _Requirements: NFR-1_

- [x] 6.4 Update documentation
  - Document content item status tracking feature
  - Document workflow step statuses and transitions
  - Document content item statuses and transitions (Proposed, Processing, Created, Failed)
  - Document notification schemas for clip_status_updated, quote_status_updated, blog_status_updated
  - Add troubleshooting section for real-time updates
  - _Requirements: All_
