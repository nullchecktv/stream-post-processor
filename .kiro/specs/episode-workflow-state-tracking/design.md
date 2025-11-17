# Design Document

## Overview

This design implements a comprehensive workflow state tracking system for episode processing. The system tracks both workflow steps (Generate Plan, Upload Transcript, Upload Tracks) and content generation processes (Blog Posts, Quotes, Clips) with granular state management persisted in DynamoDB and displayed in real-time in the React frontend.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         React Frontend                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌───────────────┐ │
│  │ WorkflowProgress │  │ ContentCards     │  │ Upload Pages  │ │
│  │ Component        │  │ Grid             │  │               │ │
│  └──────────────────┘  └──────────────────┘  └───────────────┘ │
│           │                     │                     │          │
│           └─────────────────────┴─────────────────────┘          │
│                              │                                   │
│                    ┌─────────▼──────────┐                       │
│                    │ useWorkflowState   │                       │
│                    │ Custom Hook        │                       │
│                    └─────────┬──────────┘                       │
└──────────────────────────────┼───────────────────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │   API Gateway       │
                    └──────────┬──────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
┌───────▼────────┐  ┌─────────▼────────┐  ┌─────────▼────────┐
│ Get Workflow   │  │ Update Workflow  │  │ Episode Event    │
│ State Lambda   │  │ State Lambda     │  │ Handlers         │
└───────┬────────┘  └─────────┬────────┘  └─────────┬────────┘
        │                     │                      │
        └─────────────────────┴──────────────────────┘
                              │
                   ┌──────────▼──────────┐
                   │     DynamoDB        │
                   │  Workflow State     │
                   │  Records            │
                   └─────────────────────┘
```

### State Flow Diagram

```
Episode Created
      │
      ▼
Generate Plan: Ready
Upload Transcript: Locked
Upload Tracks: Locked
      │
      ├─────────────────┬─────────────────┐
      │                 │                 │
Generate Plan      Generate Plan     Generate Plan
Started            Completed         Skipped
      │                 │                 │
      ▼                 ▼                 ▼
In Progress ──────▶ Complete ◀───────── (Skip)
                        │
                        ▼
              Upload Transcript: Ready
              Upload Tracks: Ready
                        │
                        ▼
              Transcript Uploaded
                        │
                        ├─────────────┬─────────────┐
                        │             │             │
                  Blog: Pending  Quotes: Pending  Clips: Pending
                        │             │             │
                        ▼             ▼             ▼
                  Processing    Processing    Processing
                        │             │             │
                        ▼             ▼             ▼
                  Complete      Complete      Complete
```

## Data Models

### Workflow Step State Schema


```javascript
// schemas/workflow.mjs
import { z } from 'zod';

export const WorkflowStepStatus = z.enum([
  'Locked',
  'Ready', 
  'In Progress',
  'Complete',
  'Skipped',
  'Failed'
]);

export const WORKFLOW_STEP_STATUS = {
  LOCKED: 'Locked',
  READY: 'Ready',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  SKIPPED: 'Skipped',
  FAILED: 'Failed'
};

export const WorkflowStepSchema = z.object({
  stepName: z.enum(['generate-plan', 'upload-transcript', 'upload-tracks']),
  status: WorkflowStepStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  errorMessage: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const ContentGenerationStatus = z.enum([
  'Pending',
  'Processing',
  'Complete',
  'Failed'
]);

export const CONTENT_GENERATION_STATUS = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETE: 'Complete',
  FAILED: 'Failed'
};

export const ContentGenerationSchema = z.object({
  contentType: z.enum(['blog', 'quotes', 'clips']),
  status: ContentGenerationStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  itemCount: z.number().int().nonnegative().optional(),
  errorMessage: z.string().optional()
});
```

### DynamoDB Records

#### Workflow Step Record
```json
{
  "pk": "team123#episode-uuid",
  "sk": "workflow#step#generate-plan",
  "stepName": "generate-plan",
  "status": "Complete",
  "startedAt": "2025-01-15T10:30:00Z",
  "completedAt": "2025-01-15T10:32:00Z",
  "statusHistory": [
    {
      "status": "Ready",
      "timestamp": "2025-01-15T10:30:00Z"
    },
    {
      "status": "In Progress",
      "timestamp": "2025-01-15T10:30:15Z"
    },
    {
      "status": "Complete",
      "timestamp": "2025-01-15T10:32:00Z"
    }
  ],
  "updatedAt": "2025-01-15T10:32:00Z"
}
```

#### Content Generation Record
```json
{
  "pk": "team123#episode-uuid",
  "sk": "workflow#content#blog",
  "contentType": "blog",
  "status": "Complete",
  "startedAt": "2025-01-15T10:35:00Z",
  "completedAt": "2025-01-15T10:37:00Z",
  "itemCount": 1,
  "statusHistory": [
    {
      "status": "Pending",
      "timestamp": "2025-01-15T10:35:00Z"
    },
    {
      "status": "Processing",
      "timestamp": "2025-01-15T10:35:10Z"
    },
    {
      "status": "Complete",
      "timestamp": "2025-01-15T10:37:00Z",
      "itemCount": 1
    }
  ],
  "updatedAt": "2025-01-15T10:37:00Z"
}
```

## Components and Interfaces

### Backend Components

#### 1. Workflow State Manager (functions/utils/workflow-state.mjs)

Utility module for managing workflow state transitions.

```javascript
export const initializeWorkflowSteps = async (tenantId, episodeId) => {
  // Create initial workflow step records
  // Generate Plan: Ready
  // Upload Transcript: Locked
  // Upload Tracks: Locked
};

export const updateWorkflowStep = async (tenantId, episodeId, stepName, status, metadata = {}) => {
  // Update workflow step status
  // Add to status history
  // Handle dependent step unlocking
};

export const getWorkflowState = async (tenantId, episodeId) => {
  // Query all workflow steps and content generation states
  // Return aggregated state
};

export const initializeContentGeneration = async (tenantId, episodeId) => {
  // Create content generation records for blog, quotes, clips
  // All start in Pending status
};

export const updateContentGeneration = async (tenantId, episodeId, contentType, status, metadata = {}) => {
  // Update content generation status
  // Add to status history
  // Update parent workflow step if needed
};
```

#### 2. Lambda Functions

**Get Workflow State (functions/episodes/get-workflow-state.mjs)**
- GET /episodes/{episodeId}/workflow
- Returns all workflow steps and content generation states
- Used by frontend for initial load and polling

**Update Workflow Step (functions/episodes/update-workflow-step.mjs)**
- PUT /episodes/{episodeId}/workflow/steps/{stepName}
- Updates workflow step status
- Handles dependent step unlocking
- Publishes EventBridge events

**Update Content Generation (functions/episodes/update-content-generation.mjs)**
- PUT /episodes/{episodeId}/workflow/content/{contentType}
- Updates content generation status
- Updates parent workflow step status
- Publishes EventBridge events

#### 3. Event Handlers

Existing Lambda functions will be updated to manage workflow state:

**create-episode.mjs**
- Initialize workflow steps when episode is created

**add-plan.mjs**
- Update generate-plan step to "In Progress" when started
- Update to "Complete" when plan is saved
- Unlock upload-transcript and upload-tracks steps

**upload-transcript.mjs**
- Update upload-transcript step to "In Progress"
- Initialize content generation records (blog, quotes, clips)

**transcript-added.mjs (S3 event handler)**
- Update upload-transcript step to "Processing"
- Trigger content generation processes

**blog-generator.mjs, clip-detector.mjs, quote-generator.mjs**
- Update respective content generation status to "Processing" when started
- Update to "Complete" when finished
- Update to "Failed" on error

### Frontend Components

#### 1. useWorkflowState Hook (frontend/src/hooks/useWorkflowState.ts)

Custom hook for managing workflow state in React components.

```typescript
interface WorkflowStep {
  stepName: string;
  status: 'Locked' | 'Ready' | 'In Progress' | 'Complete' | 'Skipped' | 'Failed';
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
}

interface ContentGeneration {
  contentType: 'blog' | 'quotes' | 'clips';
  status: 'Pending' | 'Processing' | 'Complete' | 'Failed';
  startedAt?: string;
  completedAt?: string;
  itemCount?: number;
  errorMessage?: string;
}

interface WorkflowState {
  steps: WorkflowStep[];
  contentGeneration: ContentGeneration[];
  isLoading: boolean;
  error: string | null;
}

export const useWorkflowState = (episodeId: string) => {
  const [state, setState] = useState<WorkflowState>({
    steps: [],
    contentGeneration: [],
    isLoading: true,
    error: null
  });

  // Fetch initial state
  // Poll for updates when processing
  // Return state and helper functions
  
  return {
    ...state,
    refetch: () => { /* ... */ },
    isProcessing: () => { /* ... */ }
  };
};
```

#### 2. WorkflowProgress Component (frontend/src/components/episodes/WorkflowProgress.tsx)

Enhanced to display granular step states.

```typescript
interface WorkflowProgressProps {
  episodeId: string;
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({ episodeId }) => {
  const { steps, contentGeneration, isLoading } = useWorkflowState(episodeId);
  
  // Calculate completion percentage
  // Render pre-stream and post-stream sections
  // Display step status badges
  // Show processing indicators
  
  return (
    <div className="workflow-progress">
      <div className="progress-header">
        <h3>Progress</h3>
        <span>{completedCount} of {totalCount} complete</span>
      </div>
      
      <div className="pre-stream-section">
        <StepCard step={generatePlanStep} />
      </div>
      
      <div className="post-stream-section">
        <StepCard step={uploadTranscriptStep} />
        <StepCard step={uploadTracksStep} />
      </div>
    </div>
  );
};
```

#### 3. ContentCardsGrid Component (frontend/src/components/episodes/ContentCardsGrid.tsx)

Enhanced to show content generation status.

```typescript
export const ContentCardsGrid: React.FC<{ episodeId: string }> = ({ episodeId }) => {
  const { contentGeneration } = useWorkflowState(episodeId);
  
  const blogState = contentGeneration.find(c => c.contentType === 'blog');
  const quotesState = contentGeneration.find(c => c.contentType === 'quotes');
  const clipsState = contentGeneration.find(c => c.contentType === 'clips');
  
  return (
    <div className="content-cards-grid">
      <BlogPostCard episodeId={episodeId} generationState={blogState} />
      <QuotesCard episodeId={episodeId} generationState={quotesState} />
      <ClipsCard episodeId={episodeId} generationState={clipsState} />
    </div>
  );
};
```

#### 4. Upload Pages

**TranscriptUploadPage (frontend/src/pages/TranscriptUploadPage.tsx)**
- Dedicated page for transcript upload
- Shows workflow progress for context
- Handles file upload and status updates

**TracksUploadPage (frontend/src/pages/TracksUploadPage.tsx)**
- Dedicated page for track uploads
- Shows workflow progress for context
- Handles multipart upload flow

## API Endpoints

### GET /episodes/{episodeId}/workflow

Returns complete workflow state.

**Response:**
```json
{
  "steps": [
    {
      "stepName": "generate-plan",
      "status": "Complete",
      "startedAt": "2025-01-15T10:30:00Z",
      "completedAt": "2025-01-15T10:32:00Z"
    },
    {
      "stepName": "upload-transcript",
      "status": "Ready",
      "startedAt": null,
      "completedAt": null
    },
    {
      "stepName": "upload-tracks",
      "status": "Ready",
      "startedAt": null,
      "completedAt": null
    }
  ],
  "contentGeneration": [
    {
      "contentType": "blog",
      "status": "Pending",
      "itemCount": 0
    },
    {
      "contentType": "quotes",
      "status": "Pending",
      "itemCount": 0
    },
    {
      "contentType": "clips",
      "status": "Pending",
      "itemCount": 0
    }
  ]
}
```

### PUT /episodes/{episodeId}/workflow/steps/{stepName}

Updates workflow step status.

**Request:**
```json
{
  "status": "In Progress",
  "metadata": {
    "reason": "User initiated plan generation"
  }
}
```

**Response:**
```json
{
  "stepName": "generate-plan",
  "status": "In Progress",
  "startedAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### PUT /episodes/{episodeId}/workflow/content/{contentType}

Updates content generation status.

**Request:**
```json
{
  "status": "Processing",
  "metadata": {
    "agentSessionId": "session-123"
  }
}
```

**Response:**
```json
{
  "contentType": "blog",
  "status": "Processing",
  "startedAt": "2025-01-15T10:35:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

## Real-Time Communication with Momento Topics

### Existing Momento Infrastructure

**The Momento Topics notification system is already fully implemented and operational.** The system includes:

- **NotificationContext** (frontend/src/contexts/NotificationContext.tsx): Manages Momento subscriptions and message handling
- **Notification Handler Lambda** (functions/events/notification-handler.mjs): Processes EventBridge notification events and publishes to Momento
- **publishNotificationEvent utility** (functions/utils/notifications.mjs): Helper function for publishing notifications

### Integration Approach

For workflow state tracking, we will **leverage the existing notification infrastructure** by:

1. Using the existing `publishNotificationEvent()` utility function
2. Publishing workflow state updates to the existing tenant topic
3. Including complete workflow state in the notification metadata
4. Frontend will receive updates through the existing NotificationContext subscription

### Notification Flow (Already Implemented)

```
Workflow State Change
      │
      ▼
publishNotificationEvent() ← Existing utility
      │
      ▼
EventBridge Event ← Existing event bus
      │
      ▼
Notification Handler Lambda ← Already deployed
      │
      ├─────────────────┬─────────────────┐
      │                 │                 │
      ▼                 ▼                 ▼
DynamoDB Persist   Momento Publish   Frontend Subscribe
(if persist=true)  (tenant topic)    (NotificationContext)
                   ← Already working  ← Already working
```

### Workflow State Notification Events

```javascript
// Workflow step state change
await publishNotificationEvent({
  type: 'workflow_step_updated',
  tenantId: teamId,
  userId: null, // Broadcast to all team members
  title: 'Workflow Updated',
  message: `${stepName} is now ${status}`,
  url: `/episodes/${episodeId}`,
  persist: false, // Don't store in notifications table
  topic: 'tenant', // Publish to tenant topic
  subscriptionId: `${episodeId}_workflow`,
  metadata: {
    episodeId,
    stepName,
    status,
    workflowState: {
      steps: [...],
      contentGeneration: [...]
    }
  }
});

// Content generation state change
await publishNotificationEvent({
  type: 'content_generation_updated',
  tenantId: teamId,
  userId: null,
  title: 'Content Generation Updated',
  message: `${contentType} generation is ${status}`,
  url: `/episodes/${episodeId}`,
  persist: false,
  topic: 'tenant',
  subscriptionId: `${episodeId}_content_${contentType}`,
  metadata: {
    episodeId,
    contentType,
    status,
    itemCount,
    workflowState: {
      steps: [...],
      contentGeneration: [...]
    }
  }
});
```

### Frontend Momento Subscription (Already Implemented)

The frontend already subscribes to the tenant's Momento topic through **NotificationContext**. We will extend the existing message handling to process workflow state updates:

```typescript
// In useWorkflowState hook - leverage existing NotificationContext
export const useWorkflowState = (episodeId: string) => {
  const [state, setState] = useState<WorkflowState>({...});

  useEffect(() => {
    // Listen for custom events dispatched by NotificationContext
    const handleWorkflowUpdate = (event: CustomEvent) => {
      const message = event.detail.message;
      
      if (message.type === 'workflow_step_updated' || 
          message.type === 'content_generation_updated') {
        
        const { episodeId: msgEpisodeId, workflowState } = message.metadata;
        
        // Update local state if this is for the current episode
        if (msgEpisodeId === episodeId && workflowState) {
          setState(prev => ({
            ...prev,
            steps: workflowState.steps,
            contentGeneration: workflowState.contentGeneration
          }));
        }
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

**Note:** The NotificationContext already handles:
- Momento client initialization
- Topic subscription management
- Token refresh and reconnection
- Message parsing and validation
- Custom event dispatching for page-specific updates

## State Transition Logic

### Workflow Step Transitions

**Generate Plan:**
- Ready → In Progress (user clicks "Generate Plan")
- In Progress → Complete (plan saved successfully)
- In Progress → Failed (error during generation)
- Ready → Skipped (user clicks "Skip")
- Failed → Ready (user clicks "Retry")

**Upload Transcript:**
- Locked → Ready (when Generate Plan is Complete or Skipped)
- Ready → In Progress (user initiates upload)
- In Progress → Processing (upload complete, content generation started)
- Processing → Complete (all content generation complete)
- Processing → Failed (content generation failed)
- Failed → Ready (user clicks "Retry")

**Upload Tracks:**
- Locked → Ready (when Generate Plan is Complete or Skipped)
- Ready → In Progress (user initiates upload)
- In Progress → Complete (upload complete)
- In Progress → Failed (upload failed)
- Failed → Ready (user clicks "Retry")

### Content Generation Transitions

**Blog, Quotes, Clips:**
- Pending → Processing (generation started)
- Processing → Complete (generation finished successfully)
- Processing → Failed (generation error)
- Failed → Pending (user clicks "Retry")

### Dependent Step Logic

```javascript
const unlockDependentSteps = async (tenantId, episodeId, completedStep) => {
  if (completedStep === 'generate-plan') {
    await updateWorkflowStep(tenantId, episodeId, 'upload-transcript', 'Ready');
    await updateWorkflowStep(tenantId, episodeId, 'upload-tracks', 'Ready');
  }
};

const checkUploadTranscriptCompletion = async (tenantId, episodeId) => {
  const contentStates = await getContentGenerationStates(tenantId, episodeId);
  
  const allComplete = contentStates.every(
    state => state.status === 'Complete' || state.status === 'Failed'
  );
  
  if (allComplete) {
    await updateWorkflowStep(tenantId, episodeId, 'upload-transcript', 'Complete');
  }
};
```

## Error Handling

### Backend Error Handling

```javascript
export const updateWorkflowStep = async (tenantId, episodeId, stepName, status, metadata = {}) => {
  try {
    // Validate status transition
    const currentStep = await getWorkflowStep(tenantId, episodeId, stepName);
    if (!isValidTransition(currentStep.status, status)) {
      throw new Error(`Invalid transition from ${currentStep.status} to ${status}`);
    }
    
    // Update DynamoDB
    await docClient.send(new UpdateCommand({
      TableName: TABLE_NAME,
      Key: {
        pk: `${tenantId}#${episodeId}`,
        sk: `workflow#step#${stepName}`
      },
      UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt, #statusHistory = list_append(#statusHistory, :newHistory)',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#updatedAt': 'updatedAt',
        '#statusHistory': 'statusHistory'
      },
      ExpressionAttributeValues: {
        ':status': status,
        ':updatedAt': new Date().toISOString(),
        ':newHistory': [{
          status,
          timestamp: new Date().toISOString(),
          ...metadata
        }]
      }
    }));
    
    // Publish event
    await publishWorkflowEvent(tenantId, episodeId, stepName, status);
    
  } catch (error) {
    logger.error('Failed to update workflow step', {
      error: error.message,
      tenantId,
      episodeId,
      stepName,
      status
    });
    throw error;
  }
};
```

### Frontend Error Handling

```typescript
export const useWorkflowState = (episodeId: string) => {
  const [state, setState] = useState<WorkflowState>({
    steps: [],
    contentGeneration: [],
    isLoading: true,
    error: null
  });

  const fetchWorkflowState = async () => {
    try {
      const response = await api.get(`/episodes/${episodeId}/workflow`);
      setState({
        steps: response.steps,
        contentGeneration: response.contentGeneration,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: 'Failed to load workflow state'
      }));
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchWorkflowState();
    
    // Subscribe to real-time updates via existing NotificationContext
    const handleWorkflowUpdate = (event: CustomEvent) => {
      const message = event.detail.message;
      
      if ((message.type === 'workflow_step_updated' || 
           message.type === 'content_generation_updated') &&
          message.metadata?.episodeId === episodeId &&
          message.metadata?.workflowState) {
        
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

## Testing Strategy

### Unit Tests

**Backend:**
- Test workflow state initialization
- Test status transition validation
- Test dependent step unlocking
- Test content generation state updates
- Test error handling for invalid transitions

**Frontend:**
- Test useWorkflowState hook state management
- Test polling logic
- Test component rendering for different states
- Test error display and retry functionality

### Integration Tests

- Test complete workflow from episode creation to content generation
- Test state persistence across Lambda invocations
- Test EventBridge event publishing and handling
- Test API endpoint responses
- Test frontend polling and real-time updates

### Example Test Cases

```javascript
// Backend test
describe('Workflow State Manager', () => {
  it('should initialize workflow steps on episode creation', async () => {
    await initializeWorkflowSteps(tenantId, episodeId);
    
    const state = await getWorkflowState(tenantId, episodeId);
    
    expect(state.steps).toHaveLength(3);
    expect(state.steps.find(s => s.stepName === 'generate-plan').status).toBe('Ready');
    expect(state.steps.find(s => s.stepName === 'upload-transcript').status).toBe('Locked');
    expect(state.steps.find(s => s.stepName === 'upload-tracks').status).toBe('Locked');
  });

  it('should unlock dependent steps when generate-plan completes', async () => {
    await updateWorkflowStep(tenantId, episodeId, 'generate-plan', 'Complete');
    
    const state = await getWorkflowState(tenantId, episodeId);
    
    expect(state.steps.find(s => s.stepName === 'upload-transcript').status).toBe('Ready');
    expect(state.steps.find(s => s.stepName === 'upload-tracks').status).toBe('Ready');
  });
});
```

## Performance Considerations

### Database Optimization

- Use batch operations when querying multiple workflow records
- Implement caching for frequently accessed workflow states
- Use DynamoDB TTL for old status history entries

### Frontend Optimization

- Use React.memo for workflow components
- Debounce status updates to prevent excessive re-renders
- Cache workflow state in React Context to avoid prop drilling
- Leverage Momento Topics for real-time updates (no polling overhead)

### API Optimization

- Return only necessary fields in API responses
- Implement pagination for status history if needed
- Use conditional updates in DynamoDB to prevent race conditions

### Momento Optimization

- **Reuse existing Momento infrastructure** - No new clients or subscriptions needed
- **Leverage existing NotificationContext** - Already handles connection management, token refresh, and reconnection
- Batch workflow state updates when multiple changes occur simultaneously
- Include complete workflow state in Momento messages to avoid additional API calls
- Use `persist: false` for workflow updates to avoid cluttering the notifications table

## Security Considerations

- Validate tenant ownership before updating workflow state
- Sanitize error messages to prevent information leakage
- Implement rate limiting on workflow state update endpoints
- Log all workflow state changes for audit trail

## Migration Strategy

1. Add workflow state schema to schemas/workflow.mjs
2. Create workflow state utility functions
3. Update create-episode to initialize workflow steps
4. Update existing Lambda functions to manage workflow state
5. Create new API endpoints for workflow state
6. Update frontend components to use workflow state
7. Create new upload pages
8. Test end-to-end workflow
9. Deploy incrementally with feature flags
