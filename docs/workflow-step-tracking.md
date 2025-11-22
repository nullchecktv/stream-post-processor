# Workflow Step Tracking Feature

## Overview

The Workflow Step Tracking feature provides explicit state tracking for episode workflow steps and content generation items (clips, quotes, blogs). This enables real-time UI updates with spinners, completion states, and error handling through Momento notifications.

## Workflow Step Statuses

### Status Values

Episodes track three main workflow steps, each with the following possible statuses:

- **Not Started**: Initial state, no action taken
- **In Progress**: Processing currently happening (shows spinner in UI)
- **Completed**: Successfully finished (shows checkmark in UI)
- **Failed**: Processing failed with error (shows error icon in UI)
- **Skipped**: User chose to skip this step (shows skip icon in UI)

### Workflow Steps

1. **Generate Plan**: AI-powered episode planning and recommendations
2. **Upload Transcript**: Transcript upload and clip detection
3. **Upload Tracks**: Video track upload and preprocessing

### Status Transitions

Valid transitions for each step:

```
Not Started → In Progress, Skipped
In Progress → Completed, Failed
Failed → In Progress (retry)
Skipped → In Progress (can still do it later)
Completed → (terminal state)
```

## Content Item Statuses

### Status Values

Individual content items (clips, quotes, blogs) track their processing state:

- **Proposed**: Initial state when AI detects or user creates the item
- **Processing**: Item is currently being generated (shows spinner in UI)
- **Created**: Successfully generated and available (shows checkmark in UI)
- **Failed**: Generation failed with error message (shows error icon with tooltip)

### Status Transitions

```
Proposed → Processing → Created/Failed
Failed → Processing (retry)
```

## Data Model

### Episode Workflow Steps

Episodes include a `workflowSteps` object in their metadata:

```json
{
  "pk": "tenant123#episode-uuid",
  "sk": "metadata",
  "workflowSteps": {
    "generatePlan": {
      "status": "Completed",
      "startedAt": "2025-01-15T10:30:00Z",
      "completedAt": "2025-01-15T10:31:00Z"
    },
    "uploadTranscript": {
      "status": "In Progress",
      "startedAt": "2025-01-15T10:32:00Z"
    },
    "uploadTracks": {
      "status": "Not Started"
    }
  }
}
```

### Content Item Status

Clips, quotes, and blogs include status fields:

```json
{
  "pk": "tenant123#episode-uuid",
  "sk": "data#clip#clip-uuid",
  "status": "Processing",
  "processingStartedAt": "2025-01-15T10:35:00Z",
  "error": null
}
```

## Backend Implementation

### Workflow Step Updates

Functions update workflow step status using the `updateWorkflowStepStatus` helper:

```javascript
import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';

// Set to In Progress at start
await updateWorkflowStepStatus(
  ddb,
  tenantId,
  episodeId,
  WORKFLOW_STEPS.GENERATE_PLAN,
  WORKFLOW_STEP_STATUS.IN_PROGRESS
);

// Set to Completed on success
await updateWorkflowStepStatus(
  ddb,
  tenantId,
  episodeId,
  WORKFLOW_STEPS.GENERATE_PLAN,
  WORKFLOW_STEP_STATUS.COMPLETED
);

// Set to Failed on error
await updateWorkflowStepStatus(
  ddb,
  tenantId,
  episodeId,
  WORKFLOW_STEPS.GENERATE_PLAN,
  WORKFLOW_STEP_STATUS.FAILED,
  error.message
);
```

### Content Item Status Updates

Functions update content item status directly in DynamoDB:

```javascript
// Set to Processing
await ddb.send(new UpdateItemCommand({
  TableName: process.env.TABLE_NAME,
  Key: marshall({
    pk: `${tenantId}#${episodeId}`,
    sk: `data#clip#${clipId}`
  }),
  UpdateExpression: 'SET #status = :status, processingStartedAt = :startedAt',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: marshall({
    ':status': CLIP_STATUS.PROCESSING,
    ':startedAt': new Date().toISOString()
  })
}));

// Publish notification
await publishNotificationEvent({
  type: 'clip_status_updated',
  tenantId,
  title: 'Clip Processing',
  message: `Clip "${title}" is being processed`,
  url: `/episodes/${episodeId}`,
  persist: false,
  metadata: {
    episodeId,
    clipId,
    status: CLIP_STATUS.PROCESSING
  }
});
```

## Momento Notifications

### Workflow Step Notifications

Published when workflow step status changes:

```json
{
  "type": "workflow_step_updated",
  "tenantId": "tenant123",
  "title": "Workflow Step Updated",
  "message": "Generate Plan is now In Progress",
  "url": "/episodes/episode-uuid",
  "persist": false,
  "metadata": {
    "episodeId": "episode-uuid",
    "step": "generatePlan",
    "status": "In Progress"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Content Item Notifications

Published when content item status changes:

```json
{
  "type": "clip_status_updated",
  "tenantId": "tenant123",
  "title": "Clip Processing",
  "message": "Clip 'Discussion about AI' is now Processing",
  "url": "/episodes/episode-uuid",
  "persist": false,
  "metadata": {
    "episodeId": "episode-uuid",
    "clipId": "clip-uuid",
    "status": "Processing",
    "title": "Discussion about AI"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

Event types:
- `workflow_step_updated`: Workflow step status changed
- `clip_status_updated`: Clip status changed
- `quote_status_updated`: Quote status changed
- `blog_status_updated`: Blog post status changed

## Frontend Implementation

### Workflow Progress Component

The `WorkflowProgress` component displays workflow step status:

```typescript
<WorkflowProgress
  episodeId={episode.id}
  workflowSteps={episode.workflowSteps}
  onSkipPlan={handleSkipPlan}
/>
```

Features:
- Displays current status for each step
- Shows spinner for "In Progress" status
- Shows checkmark for "Completed" status
- Shows error icon for "Failed" status
- Shows skip icon for "Skipped" status
- Enforces dependencies (uploads blocked until plan done/skipped)
- Provides skip button for plan generation

### Content Item Display

Content lists show processing status for each item:

```typescript
<ClipCard clip={clip} />
```

Features:
- Status badge with appropriate icon
- Spinner for "Processing" items
- Checkmark for "Created" items
- Error icon with tooltip for "Failed" items
- Processing items sorted to top of list
- Processing count summary

### Real-Time Updates

The `NotificationContext` handles real-time status updates:

```typescript
// Workflow step updates
if (notification.type === 'workflow_step_updated') {
  const { episodeId, step, status } = notification.data;
  // Update episode state with new workflow step status
}

// Content item updates
if (['clip_status_updated', 'quote_status_updated', 'blog_status_updated'].includes(notification.type)) {
  const { episodeId, clipId, quoteId, blogId, status, error } = notification.data;
  // Update content item state
}
```

## API Endpoints

### Skip Plan Generation

```
POST /episodes/{episodeId}/plan/skip
```

Allows users to skip the plan generation step and proceed directly to uploads.

Response:
```json
{
  "message": "Plan generation skipped"
}
```

## Dependency Enforcement

Upload steps are blocked until the plan step is completed or skipped:

- Upload Transcript is disabled when Plan status is "Not Started" or "In Progress"
- Upload Tracks is disabled when Plan status is "Not Started" or "In Progress"
- Upload steps become enabled when Plan status is "Completed", "Skipped", or "Failed"
- Clear messaging explains why upload steps are disabled

## Error Handling

### Workflow Step Errors

When a workflow step fails:
1. Status is set to "Failed"
2. Error message is stored in the step data
3. Notification is published with error details
4. User can retry the step (transitions back to "In Progress")

### Content Item Errors

When content generation fails:
1. Status is set to "Failed"
2. Error message is stored in the `error` field
3. Notification is published with error details
4. Error icon with tooltip displays the error message
5. User can retry generation

## Troubleshooting

### Real-Time Updates Not Working

1. **Check Momento Token**: Verify token is valid and not expired
   - Token automatically refreshes every 30 minutes
   - Check browser console for token refresh errors

2. **Check Notification Subscription**: Verify subscription to correct topic
   - Topic format: `{tenantId}:task`
   - Check browser console for subscription errors

3. **Check Network Connection**: Verify network connectivity
   - Momento uses HTTP for notifications
   - Check browser network tab for failed requests

4. **Fallback to Polling**: If real-time fails, UI can poll for updates
   - Refresh the page to see latest status
   - Check CloudWatch logs for notification publishing errors

### Status Not Updating

1. **Check DynamoDB Updates**: Verify status updates are being written
   - Check CloudWatch logs for DynamoDB errors
   - Verify IAM permissions for UpdateItem

2. **Check Notification Publishing**: Verify notifications are being published
   - Check CloudWatch logs for notification errors
   - Verify Momento credentials are configured

3. **Check Frontend State**: Verify frontend is receiving and processing updates
   - Check browser console for notification handling errors
   - Verify NotificationContext is properly configured

### Processing Stuck "In Progress"

1. **Check Lambda Execution**: Verify Lambda function completed
   - Check CloudWatch logs for function errors
   - Check Lambda metrics for timeouts or failures

2. **Check Step Functions**: For clip generation, verify Step Functions execution
   - Check Step Functions console for execution status
   - Review execution history for failed states

3. **Manual Status Update**: If needed, manually update status in DynamoDB
   - Use AWS Console or CLI to update status field
   - Publish notification manually if needed

## Performance Considerations

### Notification Delivery

- Notifications delivered within 500ms typically
- Best-effort delivery (not guaranteed)
- UI can poll as fallback if notifications fail

### Status Update Latency

- Workflow step updates complete within 100ms
- UI updates render within 100ms of notification
- Total latency from status change to UI update: <600ms

### Database Operations

- Status updates are atomic (all or nothing)
- Failed updates don't leave inconsistent state
- Optimistic locking can be added if needed

## Testing

### Unit Tests

Test workflow step utilities:
```bash
npm test tests/unit/utils/workflow-steps.test.mjs
```

### Integration Tests

Test complete workflow:
```bash
npm test tests/integration/workflow-steps.test.mjs
```

### Manual Testing

1. Create a new episode
2. Observe "Generate Plan" step status
3. Generate plan and watch status change to "In Progress" then "Completed"
4. Upload transcript and watch status updates
5. Upload tracks and watch status updates
6. Approve clips and watch processing status
7. Generate quotes and watch processing status
8. Generate blog and watch processing status

## Future Enhancements

- Add workflow step duration metrics
- Add retry count tracking
- Add manual status override for recovery
- Add "Cancelled" status for interrupted operations
- Add batch status updates for multiple items
- Add status history timeline view
