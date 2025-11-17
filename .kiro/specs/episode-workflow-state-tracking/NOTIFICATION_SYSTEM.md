# Notification System Integration

## Overview

The Momento Topics notification system is **already fully implemented and operational** in the codebase. For workflow state tracking, we are **leveraging the existing infrastructure** rather than building new notification capabilities.

## Existing Infrastructure

### Backend Components (Already Implemented)

1. **publishNotificationEvent utility** (`functions/utils/notifications.mjs`)
   - Helper function for publishing notifications to EventBridge
   - Used throughout the codebase for various notification types
   - Supports both persistent (stored in DynamoDB) and transient notifications

2. **Notification Handler Lambda** (`functions/events/notification-handler.mjs`)
   - Listens to EventBridge notification events
   - Persists notifications to DynamoDB (if `persist: true`)
   - Publishes messages to Momento Topics
   - Already deployed and operational

3. **EventBridge Integration**
   - Notification events flow through EventBridge
   - Decouples notification publishing from delivery
   - Enables multiple consumers of notification events

### Frontend Components (Already Implemented)

1. **NotificationContext** (`frontend/src/contexts/NotificationContext.tsx`)
   - Manages Momento client initialization
   - Handles topic subscriptions (tenant and tasks topics)
   - Processes incoming messages
   - Dispatches custom events for page-specific updates
   - Handles token refresh and reconnection
   - Already subscribed to tenant topic for all team members

2. **Message Handling**
   - Tenant topic: Triggers activity refresh (unread count)
   - Tasks topic: Shows toast notifications or dispatches page refresh events
   - Custom event system: `refreshPageContent` event for component updates

## Integration for Workflow State

### What We're Adding

We are **extending the existing notification types** to include workflow state updates:

```javascript
// New notification types (added to existing system)
- 'workflow_step_updated'
- 'content_generation_updated'
```

### Backend Usage

```javascript
// In any Lambda function that updates workflow state
import { publishNotificationEvent } from '../utils/notifications.mjs';
import { getWorkflowState } from '../utils/workflow-state.mjs';

// After updating workflow state
const workflowState = await getWorkflowState(tenantId, episodeId);

await publishNotificationEvent({
  type: 'workflow_step_updated',
  tenantId,                    // Required: team ID
  userId: null,                // null = broadcast to all team members
  title: 'Workflow Updated',
  message: 'Transcript uploaded, content generation started',
  url: `/episodes/${episodeId}`,
  persist: false,              // Don't store in notifications table
  topic: 'tenant',             // Publish to tenant topic (not tasks)
  metadata: {
    episodeId,
    stepName: 'upload-transcript',
    status: 'In Progress',
    workflowState: {           // Include complete state for frontend
      steps: [...],
      contentGeneration: [...]
    }
  }
});
```

### Frontend Usage

```typescript
// In useWorkflowState hook
export const useWorkflowState = (episodeId: string) => {
  const [state, setState] = useState<WorkflowState>({...});

  useEffect(() => {
    // Listen for custom events from NotificationContext
    const handleWorkflowUpdate = (event: CustomEvent) => {
      const message = event.detail.message;
      
      // Check if this is a workflow update for our episode
      if ((message.type === 'workflow_step_updated' || 
           message.type === 'content_generation_updated') &&
          message.metadata?.episodeId === episodeId &&
          message.metadata?.workflowState) {
        
        // Update state with complete workflow state from message
        setState(prev => ({
          ...prev,
          steps: message.metadata.workflowState.steps,
          contentGeneration: message.metadata.workflowState.contentGeneration
        }));
      }
    };

    window.addEventListener('refreshPageContent', handleWorkflowUpdate as EventListener);

    return () => {
      window.removeEventListener('refreshPageContent', handleWorkflowUpdate as EventListener);
    };
  }, [episodeId]);

  return state;
};
```

## Message Flow

```
Backend Lambda Function
      │
      ├─ Update DynamoDB workflow state
      ├─ Get complete workflow state
      │
      ▼
publishNotificationEvent()
      │
      ▼
EventBridge Event
      │
      ▼
Notification Handler Lambda (already deployed)
      │
      ├─────────────────┬─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
Skip DynamoDB     Momento Publish   Frontend Receives
(persist=false)   (tenant topic)    (NotificationContext)
                  ← Already working  ← Already subscribed
                        │
                        ▼
                  Custom Event Dispatch
                  (refreshPageContent)
                        │
                        ▼
                  useWorkflowState Hook
                  Updates Component State
```

## Key Benefits

1. **No New Infrastructure**: Reuses existing Momento client, subscriptions, and event handlers
2. **Consistent Pattern**: Follows the same notification pattern used elsewhere in the app
3. **Real-Time Updates**: Leverages existing real-time capabilities
4. **No Polling**: Frontend receives updates immediately via Momento Topics
5. **Reliable Delivery**: EventBridge ensures notification delivery
6. **Automatic Reconnection**: NotificationContext handles connection issues

## Configuration

No new configuration needed! The system uses:
- Existing Momento API key (environment variable)
- Existing cache name (environment variable)
- Existing tenant topic subscriptions
- Existing EventBridge event bus

## Testing

The notification system is already tested and operational. For workflow state:

1. **Backend**: Verify `publishNotificationEvent` is called with correct parameters
2. **Frontend**: Verify `refreshPageContent` event handler updates state correctly
3. **Integration**: Verify end-to-end message flow from Lambda to UI update

## Migration Notes

- No migration needed for existing notification infrastructure
- Only need to add new notification types to message handlers
- Frontend components already listen for custom events
- Backend already publishes to EventBridge

## Summary

**We are NOT building a new notification system.** We are simply:
1. Adding new notification types (`workflow_step_updated`, `content_generation_updated`)
2. Including workflow state in notification metadata
3. Handling these new types in the frontend event listener

The entire notification infrastructure (Momento client, subscriptions, event handlers, reconnection logic) is already implemented and working.
