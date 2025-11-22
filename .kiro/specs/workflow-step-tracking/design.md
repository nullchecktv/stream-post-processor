# Workflow Step State Tracking - Design

## Architecture Overview

This design adds explicit workflow step tracking to episodes and individual status tracking to content items (clips, quotes, blogs) using simple status fields in DynamoDB. Status updates trigger Momento notifications for real-time UI updates.

```
Episode Entity (DynamoDB)
├── pk: tenant#episodeId
├── sk: metadata
├── workflowSteps: {
│   ├── generatePlan: { status, startedAt, completedAt, error }
│   ├── uploadTranscript: { status, startedAt, completedAt, error }
│   └── uploadTracks: { status, startedAt, completedAt, error }
└── ... (existing fields)

Content Item Entities (DynamoDB)
├── Clip: { pk, sk, status, error, processingStartedAt, processingCompletedAt, ... }
├── Quote: { pk, sk, status, error, processingStartedAt, processingCompletedAt, ... }
└── Blog: { pk, sk, status, error, processingStartedAt, processingCompletedAt, ... }

Backend Functions
├── Update workflow status
├── Update content item status
├── Publish Momento notifications
└── Validate status transitions

Frontend Components
├── Subscribe to workflow and content notifications
├── Update step UI independently
├── Update content item UI independently
└── Enforce dependency rules
```

## Data Model

### Episode Entity Schema Addition

```javascript
// schemas/episodes.mjs

export const WorkflowStepStatus = z.enum([
  'Not Started',
  'In Progress',
  'Completed',
  'Failed',
  'Skipped'
]);

export const WORKFLOW_STEP_STATUS = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  SKIPPED: 'Skipped'
};

export const WorkflowStepSchema = z.object({
  status: WorkflowStepStatus,
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional()
});

export const WorkflowStepsSchema = z.object({
  generatePlan: WorkflowStepSchema,
  uploadTranscript: WorkflowStepSchema,
  uploadTracks: WorkflowStepSchema
});

// Add to EpisodeCreateSchema
export const EpisodeCreateSchema = z.object({
  // ... existing fields
  workflowSteps: WorkflowStepsSchema.optional()
});
```

### DynamoDB Structure

```json
{
  "pk": "tenant123#episode-uuid",
  "sk": "metadata",
  "title": "Episode Title",
  "status": "Draft",
  "workflowSteps": {
    "generatePlan": {
      "status": "In Progress",
      "startedAt": "2025-01-15T10:30:00Z"
    },
    "uploadTranscript": {
      "status": "Not Started"
    },
    "uploadTracks": {
      "status": "Not Started"
    }
  }
}
```

### Status Transition Rules

```javascript
// schemas/episodes.mjs

export const WORKFLOW_STEP_TRANSITIONS = {
  [WORKFLOW_STEP_STATUS.NOT_STARTED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS,
    WORKFLOW_STEP_STATUS.SKIPPED
  ],
  [WORKFLOW_STEP_STATUS.IN_PROGRESS]: [
    WORKFLOW_STEP_STATUS.COMPLETED,
    WORKFLOW_STEP_STATUS.FAILED
  ],
  [WORKFLOW_STEP_STATUS.FAILED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS
  ],
  [WORKFLOW_STEP_STATUS.SKIPPED]: [
    WORKFLOW_STEP_STATUS.IN_PROGRESS
  ],
  [WORKFLOW_STEP_STATUS.COMPLETED]: []
};
```

## Backend Implementation

### Utility Functions

```javascript
// functions/utils/workflow-steps.mjs

import { WORKFLOW_STEP_STATUS, WORKFLOW_STEP_TRANSITIONS } from '../../schemas/episodes.mjs';

export const WORKFLOW_STEPS = {
  GENERATE_PLAN: 'generatePlan',
  UPLOAD_TRANSCRIPT: 'uploadTranscript',
  UPLOAD_TRACKS: 'uploadTracks'
};

export const validateWorkflowStepTransition = (currentStatus, newStatus) => {
  if (!currentStatus) {
    return true;
  }

  const allowedTransitions = WORKFLOW_STEP_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid workflow step transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  return true;
};

export const createWorkflowStepUpdate = (step, status, error = null) => {
  const now = new Date().toISOString();
  const update = {
    status
  };

  if (status === WORKFLOW_STEP_STATUS.IN_PROGRESS) {
    update.startedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.COMPLETED || status === WORKFLOW_STEP_STATUS.FAILED) {
    update.completedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.FAILED && error) {
    update.error = error;
  }

  return {
    UpdateExpression: `SET workflowSteps.#step = :stepData, updatedAt = :updatedAt`,
    ExpressionAttributeNames: {
      '#step': step
    },
    ExpressionAttributeValues: {
      ':stepData': update,
      ':updatedAt': now
    }
  };
};

export const initializeWorkflowSteps = () => ({
  generatePlan: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  },
  uploadTranscript: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  },
  uploadTracks: {
    status: WORKFLOW_STEP_STATUS.NOT_STARTED
  }
});

export const canProceedToUploads = (workflowSteps) => {
  if (!workflowSteps?.generatePlan) {
    return false;
  }

  const planStatus = workflowSteps.generatePlan.status;
  return [
    WORKFLOW_STEP_STATUS.COMPLETED,
    WORKFLOW_STEP_STATUS.SKIPPED,
    WORKFLOW_STEP_STATUS.FAILED
  ].includes(planStatus);
};
```

### Workflow Step Update Helper

The workflow step updates are handled directly by the functions doing the work. A shared helper function provides consistent update logic:

```javascript
// functions/utils/workflow-steps.mjs (additional function)

export const updateWorkflowStepStatus = async (
  ddb,
  tenantId,
  episodeId,
  step,
  status,
  error = null
) => {
  const now = new Date().toISOString();
  const stepData = { status };

  if (status === WORKFLOW_STEP_STATUS.IN_PROGRESS) {
    stepData.startedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.COMPLETED || status === WORKFLOW_STEP_STATUS.FAILED) {
    stepData.completedAt = now;
  }

  if (status === WORKFLOW_STEP_STATUS.FAILED && error) {
    stepData.error = error;
  }

  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: 'metadata'
    }),
    UpdateExpression: `SET workflowSteps.#step = :stepData, updatedAt = :updatedAt`,
    ExpressionAttributeNames: {
      '#step': step
    },
    ExpressionAttributeValues: marshall({
      ':stepData': stepData,
      ':updatedAt': now
    })
  }));

  await publishNotificationEvent({
    type: 'workflow_step_updated',
    tenantId,
    title: 'Workflow Step Updated',
    message: `${getStepLabel(step)} is now ${status}`,
    url: `/episodes/${episodeId}`,
    persist: false,
    metadata: {
      episodeId,
      step,
      status
    }
  });
};

const getStepLabel = (step) => {
  const labels = {
    [WORKFLOW_STEPS.GENERATE_PLAN]: 'Generate Plan',
    [WORKFLOW_STEPS.UPLOAD_TRANSCRIPT]: 'Upload Transcript',
    [WORKFLOW_STEPS.UPLOAD_TRACKS]: 'Upload Tracks'
  };
  return labels[step] || step;
};
```

### Integration Points

#### 1. Episode Creation
```javascript
// functions/episodes/create-episode.mjs

import { initializeWorkflowSteps } from '../utils/workflow-steps.mjs';

// In handler:
const episode = {
  pk: `${tenantId}#${episodeId}`,
  sk: 'metadata',
  // ... other fields
  workflowSteps: initializeWorkflowSteps(),
  createdAt: now,
  updatedAt: now
};
```

#### 2. Plan Generation
```javascript
// functions/tools/set-plan-recommendations.mjs

import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';

export const handler = async (input) => {
  const { episodeId, tenantId } = input;
  
  try {
    // Set to In Progress at start
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.GENERATE_PLAN,
      WORKFLOW_STEP_STATUS.IN_PROGRESS
    );

    // Generate plan recommendations
    const recommendations = await generatePlanRecommendations(episodeId);

    // Save plan to DynamoDB
    await savePlan(tenantId, episodeId, recommendations);

    // Set to Completed on success
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.GENERATE_PLAN,
      WORKFLOW_STEP_STATUS.COMPLETED
    );

    return recommendations;

  } catch (error) {
    // Set to Failed on error
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.GENERATE_PLAN,
      WORKFLOW_STEP_STATUS.FAILED,
      error.message
    );
    throw error;
  }
};
```

#### 3. Transcript Upload Processing
```javascript
// functions/agents/clip-detector.mjs

import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';

export const handler = async (event) => {
  try {
    const { tenantId, episodeId } = parseEpisodeIdFromKey(event.detail.object.key);

    // Set to In Progress at start
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
      WORKFLOW_STEP_STATUS.IN_PROGRESS
    );

    // Load and process transcript
    const transcript = await loadAndPreprocessTranscript(transcriptKey);
    
    // Run AI agent for clip detection
    const response = await converse(modelId, systemPrompt, userPrompt, tools, { tenantId, userId });

    // Update episode with summary and status
    await updateEpisodeWithSummary(tenantId, episodeId, response);

    // Set to Completed on success
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
      WORKFLOW_STEP_STATUS.COMPLETED
    );

    return { message: response };

  } catch (error) {
    // Set to Failed on error
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRANSCRIPT,
      WORKFLOW_STEP_STATUS.FAILED,
      error.message
    );
    throw error;
  }
};
```

#### 4. Track Upload Processing
```javascript
// functions/episodes/complete-track-upload.mjs

import { updateWorkflowStepStatus, WORKFLOW_STEPS } from '../utils/workflow-steps.mjs';
import { WORKFLOW_STEP_STATUS } from '../../schemas/episodes.mjs';

export const handler = async (event) => {
  const { tenantId, episodeId, trackName } = parseEvent(event);

  // Get current episode to check workflow step status
  const episode = await getEpisode(tenantId, episodeId);

  // Set to In Progress on first track upload
  if (episode.workflowSteps?.uploadTracks?.status === WORKFLOW_STEP_STATUS.NOT_STARTED) {
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRACKS,
      WORKFLOW_STEP_STATUS.IN_PROGRESS
    );
  }

  // Complete the multipart upload
  await completeMultipartUpload(uploadId, parts);

  // Trigger MediaConvert preprocessing
  await startMediaConvertJob(tenantId, episodeId, trackName);

  return { statusCode: 200 };
};

// functions/events/preprocessing-completed.mjs

export const handler = async (event) => {
  const { tenantId, episodeId, trackName } = parseMediaConvertEvent(event);

  // Update track status to Processed
  await updateTrackStatus(tenantId, episodeId, trackName, 'Processed');

  // Check if all tracks are now processed
  const allTracks = await getAllTracks(tenantId, episodeId);
  const allProcessed = allTracks.every(t => t.status === 'Processed');

  if (allProcessed) {
    // Set workflow step to Completed when all tracks done
    await updateWorkflowStepStatus(
      ddb,
      tenantId,
      episodeId,
      WORKFLOW_STEPS.UPLOAD_TRACKS,
      WORKFLOW_STEP_STATUS.COMPLETED
    );
  }

  return { statusCode: 200 };
};
```

## Content Item Status Tracking

### Status Updates in Processing Functions

#### Clip Generation (Step Functions)

```javascript
// functions/workflows/start-clip-generation.mjs

export const handler = async (event) => {
  const { tenantId, episodeId, clipId } = event;

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

  await publishNotificationEvent({
    type: 'clip_status_updated',
    tenantId,
    title: 'Clip Processing',
    message: `Clip "${event.title}" is being processed`,
    url: `/episodes/${episodeId}`,
    persist: false,
    metadata: {
      episodeId,
      clipId,
      status: CLIP_STATUS.PROCESSING,
      title: event.title
    }
  });

  return event;
};

// functions/workflows/complete-clip-generation.mjs

export const handler = async (event) => {
  const { tenantId, episodeId, clipId, s3Key, error } = event;
  const status = error ? CLIP_STATUS.FAILED : CLIP_STATUS.CREATED;

  await ddb.send(new UpdateItemCommand({
    TableName: process.env.TABLE_NAME,
    Key: marshall({
      pk: `${tenantId}#${episodeId}`,
      sk: `data#clip#${clipId}`
    }),
    UpdateExpression: 'SET #status = :status, processingCompletedAt = :completedAt, s3Key = :s3Key, #error = :error',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#error': 'error'
    },
    ExpressionAttributeValues: marshall({
      ':status': status,
      ':completedAt': new Date().toISOString(),
      ':s3Key': s3Key || null,
      ':error': error || null
    })
  }));

  await publishNotificationEvent({
    type: 'clip_status_updated',
    tenantId,
    title: error ? 'Clip Processing Failed' : 'Clip Created',
    message: error || `Clip "${event.title}" is ready`,
    url: `/episodes/${episodeId}`,
    persist: true,
    metadata: {
      episodeId,
      clipId,
      status,
      error
    }
  });

  return event;
};
```

#### Quote Generation

```javascript
// functions/events/generate-quote-graphic.mjs

export const handler = async (event) => {
  const { tenantId, episodeId, quoteId } = event.detail;

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      }),
      UpdateExpression: 'SET #status = :status, processingStartedAt = :startedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': QUOTE_STATUS.PROCESSING,
        ':startedAt': new Date().toISOString()
      })
    }));

    await publishNotificationEvent({
      type: 'quote_status_updated',
      tenantId,
      title: 'Quote Processing',
      message: 'Generating quote graphic',
      url: `/episodes/${episodeId}`,
      persist: false,
      metadata: { episodeId, quoteId, status: QUOTE_STATUS.PROCESSING }
    });

    const s3Key = await generateQuoteGraphic(quoteId);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      }),
      UpdateExpression: 'SET #status = :status, processingCompletedAt = :completedAt, s3Key = :s3Key',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': QUOTE_STATUS.CREATED,
        ':completedAt': new Date().toISOString(),
        ':s3Key': s3Key
      })
    }));

    await publishNotificationEvent({
      type: 'quote_status_updated',
      tenantId,
      title: 'Quote Graphic Created',
      message: 'Quote graphic is ready',
      url: `/episodes/${episodeId}`,
      persist: true,
      metadata: { episodeId, quoteId, status: QUOTE_STATUS.CREATED }
    });

  } catch (error) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#quote#${quoteId}`
      }),
      UpdateExpression: 'SET #status = :status, processingCompletedAt = :completedAt, #error = :error',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#error': 'error'
      },
      ExpressionAttributeValues: marshall({
        ':status': QUOTE_STATUS.FAILED,
        ':completedAt': new Date().toISOString(),
        ':error': error.message
      })
    }));

    await publishNotificationEvent({
      type: 'quote_status_updated',
      tenantId,
      title: 'Quote Processing Failed',
      message: error.message,
      url: `/episodes/${episodeId}`,
      persist: true,
      metadata: { episodeId, quoteId, status: QUOTE_STATUS.FAILED, error: error.message }
    });
  }
};
```

#### Blog Generation

```javascript
// functions/blogs/generate-blog.mjs

export const handler = async (event) => {
  const { tenantId, episodeId, blogId } = JSON.parse(event.body);

  try {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#blog#${blogId}`
      }),
      UpdateExpression: 'SET #status = :status, processingStartedAt = :startedAt',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': BLOG_STATUS.PROCESSING,
        ':startedAt': new Date().toISOString()
      })
    }));

    await publishNotificationEvent({
      type: 'blog_status_updated',
      tenantId,
      title: 'Blog Processing',
      message: 'Generating blog post',
      url: `/episodes/${episodeId}`,
      persist: false,
      metadata: { episodeId, blogId, status: BLOG_STATUS.PROCESSING }
    });

    const content = await generateBlogContent(episodeId);

    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#blog#${blogId}`
      }),
      UpdateExpression: 'SET #status = :status, processingCompletedAt = :completedAt, content = :content',
      ExpressionAttributeNames: {
        '#status': 'status'
      },
      ExpressionAttributeValues: marshall({
        ':status': BLOG_STATUS.CREATED,
        ':completedAt': new Date().toISOString(),
        ':content': content
      })
    }));

    await publishNotificationEvent({
      type: 'blog_status_updated',
      tenantId,
      title: 'Blog Post Created',
      message: 'Blog post is ready',
      url: `/episodes/${episodeId}`,
      persist: true,
      metadata: { episodeId, blogId, status: BLOG_STATUS.CREATED }
    });

    return formatResponse(200, { content });

  } catch (error) {
    await ddb.send(new UpdateItemCommand({
      TableName: process.env.TABLE_NAME,
      Key: marshall({
        pk: `${tenantId}#${episodeId}`,
        sk: `data#blog#${blogId}`
      }),
      UpdateExpression: 'SET #status = :status, processingCompletedAt = :completedAt, #error = :error',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#error': 'error'
      },
      ExpressionAttributeValues: marshall({
        ':status': BLOG_STATUS.FAILED,
        ':completedAt': new Date().toISOString(),
        ':error': error.message
      })
    }));

    await publishNotificationEvent({
      type: 'blog_status_updated',
      tenantId,
      title: 'Blog Processing Failed',
      message: error.message,
      url: `/episodes/${episodeId}`,
      persist: true,
      metadata: { episodeId, blogId, status: BLOG_STATUS.FAILED, error: error.message }
    });

    return formatResponse(500, { error: error.message });
  }
};
```

## Frontend Implementation

### Type Definitions

```typescript
// frontend/src/types/workflow.ts

export type WorkflowStepStatus = 
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Failed'
  | 'Skipped';

export interface WorkflowStep {
  status: WorkflowStepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface WorkflowSteps {
  generatePlan: WorkflowStep;
  uploadTranscript: WorkflowStep;
  uploadTracks: WorkflowStep;
}
```

### API Client

```typescript
// frontend/src/api/episodes.ts

export const episodesApi = {
  // ... existing methods

  skipPlanGeneration: async (episodeId: string) => {
    const response = await client.post(
      `/episodes/${episodeId}/plan/skip`
    );
    return response.data;
  }
};
```

### Workflow Progress Component Updates

```typescript
// frontend/src/components/episodes/WorkflowProgress.tsx

interface WorkflowProgressProps {
  readonly episodeId: string;
  readonly workflowSteps: WorkflowSteps;
  readonly onSkipPlan?: () => void;
}

function WorkflowProgressComponent({ episodeId, workflowSteps, onSkipPlan }: WorkflowProgressProps) {
  const getStepState = (step: keyof WorkflowSteps) => {
    const stepData = workflowSteps[step];
    
    switch (stepData.status) {
      case 'Completed':
        return 'complete';
      case 'In Progress':
        return 'in-progress';
      case 'Skipped':
        return 'skipped';
      case 'Failed':
        return 'failed';
      default:
        return 'not-started';
    }
  };

  const canAccessUploads = () => {
    const planStatus = workflowSteps.generatePlan.status;
    return ['Completed', 'Skipped', 'Failed'].includes(planStatus);
  };

  const getStepIcon = (step: keyof WorkflowSteps) => {
    const state = getStepState(step);
    
    if (state === 'complete') {
      return <CheckIcon />;
    }
    if (state === 'in-progress') {
      return <SpinnerIcon />;
    }
    if (state === 'failed') {
      return <ErrorIcon />;
    }
    if (state === 'skipped') {
      return <SkipIcon />;
    }
    
    return <DefaultIcon />;
  };

  // ... rest of component
}
```

### Notification Handler

```typescript
// frontend/src/contexts/NotificationContext.tsx

const handleWorkflowStepUpdate = (notification: Notification) => {
  const { episodeId, step, status } = notification.data;
  
  setEpisode(prev => {
    if (!prev || prev.id !== episodeId) return prev;
    
    return {
      ...prev,
      workflowSteps: {
        ...prev.workflowSteps,
        [step]: {
          ...prev.workflowSteps[step],
          status,
          ...(status === 'In Progress' && { startedAt: new Date().toISOString() }),
          ...((['Completed', 'Failed'].includes(status)) && { 
            completedAt: new Date().toISOString() 
          })
        }
      }
    };
  });
};

const handleContentItemUpdate = (notification: Notification) => {
  const { episodeId, clipId, quoteId, blogId, status, error } = notification.data;
  
  if (clipId) {
    setClips(prev => prev.map(clip => 
      clip.id === clipId 
        ? { ...clip, status, error, updatedAt: new Date().toISOString() }
        : clip
    ));
  } else if (quoteId) {
    setQuotes(prev => prev.map(quote => 
      quote.id === quoteId 
        ? { ...quote, status, error, updatedAt: new Date().toISOString() }
        : quote
    ));
  } else if (blogId) {
    setBlogs(prev => prev.map(blog => 
      blog.id === blogId 
        ? { ...blog, status, error, updatedAt: new Date().toISOString() }
        : blog
    ));
  }
};

// In notification subscription:
if (notification.type === 'workflow_step_updated') {
  handleWorkflowStepUpdate(notification);
} else if (['clip_status_updated', 'quote_status_updated', 'blog_status_updated'].includes(notification.type)) {
  handleContentItemUpdate(notification);
}
```

### Episode Overview Page Updates

```typescript
// frontend/src/pages/EpisodeOverviewPage.tsx

// Remove full page refresh - all updates handled by NotificationContext
useEffect(() => {
  const handleNotification = (notification: Notification) => {
    if (notification.type === 'workflow_step_updated') {
      // Handled by NotificationContext - no action needed
      return;
    }
    
    if (['clip_status_updated', 'quote_status_updated', 'blog_status_updated'].includes(notification.type)) {
      // Handled by NotificationContext - no action needed
      return;
    }
  };

  // Subscribe to notifications
  return () => {
    // Cleanup
  };
}, []);
```

### Content Item Display Components

```typescript
// frontend/src/components/episodes/ClipList.tsx

interface ClipListProps {
  clips: Clip[];
}

function ClipList({ clips }: ClipListProps) {
  const sortedClips = useMemo(() => {
    return [...clips].sort((a, b) => {
      if (a.status === 'Processing' && b.status !== 'Processing') return -1;
      if (a.status !== 'Processing' && b.status === 'Processing') return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [clips]);

  const processingCount = clips.filter(c => c.status === 'Processing').length;

  return (
    <div>
      {processingCount > 0 && (
        <div className="processing-banner">
          <SpinnerIcon />
          Processing {processingCount} {processingCount === 1 ? 'clip' : 'clips'}
        </div>
      )}
      
      {sortedClips.map(clip => (
        <ClipCard key={clip.id} clip={clip} />
      ))}
    </div>
  );
}

// frontend/src/components/episodes/ClipCard.tsx

interface ClipCardProps {
  clip: Clip;
}

function ClipCard({ clip }: ClipCardProps) {
  const getStatusBadge = () => {
    switch (clip.status) {
      case 'Processing':
        return (
          <span className="badge badge-processing">
            <SpinnerIcon className="animate-spin" />
            Processing
          </span>
        );
      case 'Created':
        return (
          <span className="badge badge-success">
            <CheckIcon />
            Created
          </span>
        );
      case 'Failed':
        return (
          <span className="badge badge-error" title={clip.error}>
            <ErrorIcon />
            Failed
          </span>
        );
      default:
        return (
          <span className="badge badge-default">
            Proposed
          </span>
        );
    }
  };

  return (
    <div className="clip-card">
      <div className="clip-header">
        <h3>{clip.title}</h3>
        {getStatusBadge()}
      </div>
      {/* Rest of clip card */}
    </div>
  );
}
```

## API Specification

### Skip Plan Generation

```yaml
/episodes/{episodeId}/plan/skip:
  post:
    summary: Skip plan generation step
    parameters:
      - name: episodeId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    responses:
      200:
        description: Plan generation skipped successfully
        content:
          application/json:
            schema:
              type: object
              properties:
                message:
                  type: string
                  example: Plan generation skipped
      404:
        description: Episode not found
      409:
        description: Plan already generated or in progress
      500:
        description: Internal server error
```

## Momento Notification Schema

### Workflow Step Notifications

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

```json
{
  "type": "quote_status_updated",
  "tenantId": "tenant123",
  "title": "Quote Generated",
  "message": "Quote graphic created successfully",
  "url": "/episodes/episode-uuid",
  "persist": false,
  "metadata": {
    "episodeId": "episode-uuid",
    "quoteId": "quote-uuid",
    "status": "Created"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```

```json
{
  "type": "blog_status_updated",
  "tenantId": "tenant123",
  "title": "Blog Post Generated",
  "message": "Blog post created successfully",
  "url": "/episodes/episode-uuid",
  "persist": false,
  "metadata": {
    "episodeId": "episode-uuid",
    "blogId": "blog-uuid",
    "status": "Created"
  },
  "timestamp": "2025-01-15T10:30:00Z"
}
```



## Testing Strategy

### Unit Tests

```javascript
// tests/unit/workflow-steps.test.mjs

describe('Workflow Step Utilities', () => {
  describe('validateWorkflowStepTransition', () => {
    it('allows Not Started -> In Progress', () => {
      expect(() => {
        validateWorkflowStepTransition('Not Started', 'In Progress');
      }).not.toThrow();
    });

    it('rejects Completed -> In Progress', () => {
      expect(() => {
        validateWorkflowStepTransition('Completed', 'In Progress');
      }).toThrow('Invalid workflow step transition');
    });
  });

  describe('canProceedToUploads', () => {
    it('returns false when plan is Not Started', () => {
      const steps = {
        generatePlan: { status: 'Not Started' }
      };
      expect(canProceedToUploads(steps)).toBe(false);
    });

    it('returns true when plan is Completed', () => {
      const steps = {
        generatePlan: { status: 'Completed' }
      };
      expect(canProceedToUploads(steps)).toBe(true);
    });

    it('returns true when plan is Skipped', () => {
      const steps = {
        generatePlan: { status: 'Skipped' }
      };
      expect(canProceedToUploads(steps)).toBe(true);
    });
  });
});
```

### Integration Tests

```javascript
// tests/integration/workflow-steps.test.mjs

describe('Workflow Step Integration', () => {
  it('updates workflow step status', async () => {
    const episode = await createTestEpisode();
    
    const response = await request(app)
      .patch(`/episodes/${episode.id}/workflow/generatePlan`)
      .send({ status: 'In Progress' })
      .expect(200);

    expect(response.body.status).toBe('In Progress');
  });

  it('publishes notification on status update', async () => {
    const episode = await createTestEpisode();
    const notifications = [];
    
    subscribeToNotifications((n) => notifications.push(n));
    
    await request(app)
      .patch(`/episodes/${episode.id}/workflow/generatePlan`)
      .send({ status: 'Completed' });

    await waitFor(() => notifications.length > 0);
    
    expect(notifications[0].type).toBe('workflow_step_updated');
    expect(notifications[0].metadata.step).toBe('generatePlan');
  });
});
```

## Performance Considerations

1. **DynamoDB Updates**: Single item update, no scan required
2. **Notification Delivery**: Momento Topics handle pub/sub efficiently
3. **Frontend Updates**: Only affected component re-renders
4. **Polling Elimination**: Real-time notifications replace 5-second polling

## Security Considerations

1. **Authorization**: Verify tenant membership before workflow step updates
2. **Validation**: Enforce status transition rules
3. **Rate Limiting**: Prevent rapid status toggle abuse
4. **Audit Trail**: Log all workflow step changes

## Rollback Plan

If issues arise:
1. Deploy backend without frontend changes (backward compatible)
2. Frontend gracefully handles missing workflowSteps field
3. Can revert to implicit state derivation
