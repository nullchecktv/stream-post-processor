# Workflow Step State Tracking - Requirements

## Overview

Add explicit state tracking for workflow steps (Generate Plan, Upload Transcript, Upload Tracks) and individual content generation items (clips, quotes, blogs) in the database to enable real-time UI updates with spinners and completion states. This replaces the current implicit state derivation with explicit status fields that can be updated independently.

## Problem Statement

Currently, workflow step states are derived implicitly from episode data:
- Plan completion is inferred from the existence of plan data
- Transcript completion is inferred from transcript metadata
- Track completion is inferred from track count and status

This approach has limitations:
1. Cannot show "in progress" states with spinners
2. Cannot distinguish between "not started" and "in progress"
3. Requires full page refresh to detect state changes
4. No way to track when processing begins vs. when it completes

## Goals

1. Add explicit workflow step status fields to episode entity
2. Add explicit processing status fields to individual content items (clips, quotes, blogs)
3. Track "Not Started", "In Progress", "Completed", "Failed", "Skipped" states for workflow steps
4. Track "Proposed", "Processing", "Created", "Failed" states for content items
5. Enable real-time UI updates via Momento notifications
6. Show spinners during processing states for both workflow steps and content items
7. Enforce workflow dependencies (Upload steps blocked until Plan is done/skipped)
8. Allow skipping the Generate Plan step

## Non-Goals

- Changing the overall episode status workflow
- Adding undo/redo functionality for workflow steps or content items
- Creating a workflow engine or state machine
- Batch operations for content generation (each item processed independently)

## User Stories

### US-1: View Workflow Step Status
**As a** content creator  
**I want to** see the current status of each workflow step  
**So that** I know what's in progress and what's completed

**Acceptance Criteria:**
- Each workflow step shows one of: Not Started, In Progress, Completed, Failed, Skipped
- In Progress steps display a spinner animation
- Completed steps display a checkmark
- Failed steps display an error indicator
- Status updates appear in real-time without page refresh

### US-2: Track Plan Generation Progress
**As a** content creator  
**I want to** see when plan generation is in progress  
**So that** I know the system is working and don't trigger it multiple times

**Acceptance Criteria:**
- Status changes to "In Progress" when plan generation starts
- Spinner appears on the Generate Plan step
- Status changes to "Completed" when plan is successfully generated
- Status changes to "Failed" if plan generation fails
- Notification appears when plan generation completes

### US-3: Skip Plan Generation
**As a** content creator  
**I want to** skip the plan generation step  
**So that** I can proceed directly to uploading content

**Acceptance Criteria:**
- Skip button available on Generate Plan step when status is "Not Started"
- Clicking skip changes status to "Skipped"
- Upload Transcript and Upload Tracks become available after skip
- Skipped status persists across page refreshes
- Can still generate plan later even after skipping

### US-4: Enforce Upload Dependencies
**As a** content creator  
**I want** upload steps to be blocked until plan is done or skipped  
**So that** I follow the intended workflow

**Acceptance Criteria:**
- Upload Transcript is disabled when Plan status is "Not Started" or "In Progress"
- Upload Tracks is disabled when Plan status is "Not Started" or "In Progress"
- Upload steps become enabled when Plan status is "Completed" or "Skipped"
- Clear messaging explains why upload steps are disabled
- Upload steps remain enabled if Plan status is "Failed"

### US-5: Track Upload Progress
**As a** content creator  
**I want to** see when uploads are in progress  
**So that** I know the system is processing my files

**Acceptance Criteria:**
- Upload Transcript status changes to "In Progress" when upload starts
- Upload Tracks status changes to "In Progress" when first track upload starts
- Spinners appear during upload processing
- Status changes to "Completed" when processing finishes
- Status changes to "Failed" if processing fails
- Notifications appear when processing completes

### US-6: Receive Real-Time Updates
**As a** content creator  
**I want** workflow step status updates to appear immediately  
**So that** I don't need to refresh the page

**Acceptance Criteria:**
- Status changes trigger Momento notifications
- UI updates immediately when notification received
- Only affected workflow step updates, not entire page
- Notifications include step name and new status
- Multiple users see updates simultaneously

### US-7: Track Individual Content Item Processing
**As a** content creator  
**I want to** see the processing status of each clip, quote, and blog post  
**So that** I know which items are being generated and when they're ready

**Acceptance Criteria:**
- Each clip shows status: Proposed, Processing, Created, or Failed
- Each quote shows status: Proposed, Processing, Created, or Failed
- Each blog post shows status: Proposed, Processing, Created, or Failed
- Processing items display a spinner animation
- Created items display a checkmark
- Failed items display an error indicator with message
- Status updates appear in real-time without page refresh

### US-8: Monitor Content Generation Progress
**As a** content creator  
**I want to** see which content items are currently being processed  
**So that** I can track progress and know when to check back

**Acceptance Criteria:**
- Content list shows processing status for each item
- Processing count displayed (e.g., "Processing 3 clips")
- Spinner appears next to each processing item
- Notifications appear when individual items complete
- Can view error details for failed items
- Processing items sorted to top of list

## Functional Requirements

### FR-1: Workflow Step Status Schema
Add workflow step status fields to episode entity:
- `workflowSteps.generatePlan.status`: Enum of workflow step statuses
- `workflowSteps.generatePlan.startedAt`: ISO timestamp when step started
- `workflowSteps.generatePlan.completedAt`: ISO timestamp when step completed
- `workflowSteps.uploadTranscript.status`: Enum of workflow step statuses
- `workflowSteps.uploadTranscript.startedAt`: ISO timestamp
- `workflowSteps.uploadTranscript.completedAt`: ISO timestamp
- `workflowSteps.uploadTracks.status`: Enum of workflow step statuses
- `workflowSteps.uploadTracks.startedAt`: ISO timestamp
- `workflowSteps.uploadTracks.completedAt`: ISO timestamp

### FR-2: Status Values
Workflow step status enum:
- `Not Started`: Initial state, no action taken
- `In Progress`: Processing currently happening
- `Completed`: Successfully finished
- `Failed`: Processing failed with error
- `Skipped`: User chose to skip this step

### FR-3: Status Transitions
Valid transitions for each step:
- `Not Started` → `In Progress`, `Skipped`
- `In Progress` → `Completed`, `Failed`
- `Failed` → `In Progress` (retry)
- `Skipped` → `In Progress` (can still do it later)
- `Completed` → (terminal state)

### FR-4: Backend Status Updates
Functions that update workflow step status:
- Plan generation: Set to "In Progress" at start, "Completed"/"Failed" at end
- Transcript upload: Set to "In Progress" when S3 event received, "Completed" when clip detection finishes
- Track upload: Set to "In Progress" when first track upload completes, "Completed" when all tracks processed

### FR-5: Momento Notifications
Publish notifications for workflow step changes:
- Topic: `{tenantId}:task`
- Event type: `workflow_step_updated`
- Payload: `{ episodeId, step, status, timestamp }`

### FR-6: API Endpoints
Add endpoint to update workflow step status:
- `PATCH /episodes/{episodeId}/workflow/{step}` - Update specific step status
- Request body: `{ status: 'In Progress' | 'Completed' | 'Failed' | 'Skipped' }`
- Response: Updated episode with workflow steps

### FR-7: Frontend State Management
- Subscribe to workflow step notifications
- Update only affected step component, not entire page
- Show spinner for "In Progress" status
- Show checkmark for "Completed" status
- Show error icon for "Failed" status
- Show skip icon for "Skipped" status

### FR-8: Dependency Enforcement
- Check Plan step status before allowing Upload steps
- Disable Upload buttons when Plan is "Not Started" or "In Progress"
- Enable Upload buttons when Plan is "Completed", "Skipped", or "Failed"
- Show tooltip explaining why Upload is disabled

### FR-9: Content Item Status Tracking
- Each clip, quote, and blog entity has explicit `status` field
- Status values: "Proposed", "Processing", "Created", "Failed"
- Status transitions: Proposed → Processing → Created/Failed
- Failed items can be retried (Failed → Processing)
- Status updates trigger Momento notifications

### FR-10: Content Item Notifications
- Publish notifications when content item status changes
- Topic: `{tenantId}:task`
- Event types: `clip_status_updated`, `quote_status_updated`, `blog_status_updated`
- Payload: `{ episodeId, itemId, itemType, status, timestamp, error? }`

### FR-11: Content Processing Integration
- Clip generation: Set to "Processing" when Step Functions starts, "Created"/"Failed" when complete
- Quote generation: Set to "Processing" when generation starts, "Created"/"Failed" when complete
- Blog generation: Set to "Processing" when generation starts, "Created"/"Failed" when complete
- Error messages stored in `error` field for failed items

### FR-12: Frontend Content Item Display
- Show status badge for each content item
- Display spinner for "Processing" items
- Display checkmark for "Created" items
- Display error icon for "Failed" items with error tooltip
- Sort processing items to top of list
- Show processing count summary

## Non-Functional Requirements

### NFR-1: Performance
- Workflow step updates complete within 100ms
- Notifications delivered within 500ms
- UI updates render within 100ms of notification

### NFR-2: Reliability
- Status updates are atomic (all or nothing)
- Failed status updates don't leave inconsistent state
- Notifications are best-effort (UI can poll as fallback)

### NFR-3: Graceful Degradation
- Frontend handles missing workflow steps gracefully
- Missing workflow steps default to "Not Started"
- Missing content item status defaults to "Proposed"



## Success Metrics

1. Users can see workflow progress without refreshing
2. Average time to detect completion reduces from 5s (polling) to <500ms (notifications)
3. Duplicate plan generation requests reduce by 80%
4. User confusion about workflow state reduces (measured by support tickets)

## Open Questions

1. Should we track error messages in workflow step status?
2. Should we allow manual status overrides for recovery?
3. Should we add a "Cancelled" status for interrupted operations?
4. Should we track duration metrics for each step?

## Dependencies

- Momento Topics for real-time notifications
- DynamoDB for workflow step storage
- Existing episode status system
- Frontend notification context

## Risks

1. **Notification reliability**: Momento outages could prevent real-time updates
2. **State synchronization**: Multiple tabs could show different states temporarily
3. **Processing failures**: Need clear error messages and retry mechanisms
