# Schema Usage Patterns

This steering file documents the patterns for using centralized schemas in the codebase.

## Schema Location

All schemas are centralized in the `schemas/` directory at the repository root:

```
schemas/
├── index.mjs          # Barrel export
├── common.mjs         # Shared schemas
├── episodes.mjs       # Episode schemas
├── clips.mjs          # Clip schemas
├── quotes.mjs         # Quote schemas
├── tracks.mjs         # Track schemas
├── blogs.mjs          # Blog schemas
├── teams.mjs          # Team schemas
├── users.mjs          # User schemas
├── invitations.mjs    # Invitation schemas
├── notifications.mjs  # Notification schemas
└── plans.mjs          # Plan schemas
```

## Backend Usage

### Importing Schemas

Always import from the centralized schemas directory:

```javascript
// Import specific schemas
import { EpisodeCreateSchema, EPISODE_STATUS } from '../../schemas/episodes.mjs';

// Or import from barrel export
import { EpisodeCreateSchema, EPISODE_STATUS } from '../../schemas/index.mjs';
```

### Validation Pattern

Use Zod schemas for request validation:

```javascript
import { EpisodeCreateSchema } from '../../schemas/episodes.mjs';

export const handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const validated = EpisodeCreateSchema.parse(body);

    // Use validated data
    const episode = {
      ...validated,
      id: generateEpisodeId(),
      status: EPISODE_STATUS.DRAFT
    };

    return formatResponse(201, episode);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return formatResponse(400, {
        error: 'ValidationError',
        message: 'Invalid request data',
        details: error.errors
      });
    }
    throw error;
  }
};
```

### Status Constants

Always use status constants instead of string literals:

```javascript
// Good
import { CLIP_STATUS } from '../../schemas/clips.mjs';
const clip = {
  status: CLIP_STATUS.PROPOSED
};

// Bad
const clip = {
  status: 'Proposed'
};
```

### Status Transitions

Validate status transitions using the transition maps:

```javascript
import { EPISODE_STATUS_TRANSITIONS } from '../../schemas/episodes.mjs';

const validateStatusTransition = (currentStatus, newStatus) => {
  if (!currentStatus) {
    return true; // Allow any initial status
  }

  const allowedTransitions = EPISODE_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  return true;
};
```

## Frontend Usage

### Importing Types

Import TypeScript types from schema declaration files:

```typescript
// Import types for TypeScript
import type { EpisodeCreate, EpisodeStatusType } from '@schemas/episodes';

// Use in component props
interface EpisodeFormProps {
  onSubmit: (episode: EpisodeCreate) => void;
}
```

### Status Display

Display Title Case statuses directly:

```typescript
// Status is already in Title Case
<span className="status-badge">{episode.status}</span>
```

### Status Badges

Create status badge components that handle Title Case:

```typescript
const StatusBadge = ({ status }: { status: string }) => {
  const colorMap: Record<string, string> = {
    'Draft': 'gray',
    'Planning': 'blue',
    'Ready': 'green',
    'Processing': 'yellow',
    'Published': 'purple',
    'Archived': 'red'
  };

  return (
    <span className={`badge badge-${colorMap[status] || 'gray'}`}>
      {status}
    </span>
  );
};
```

## Common Patterns

### Creating Entities

```javascript
import { EpisodeCreateSchema, EPISODE_STATUS } from '../../schemas/episodes.mjs';

const createEpisode = async (data) => {
  const validated = EpisodeCreateSchema.parse(data);

  const episode = {
    pk: episodeId,
    sk: 'metadata',
    ...validated,
    status: EPISODE_STATUS.DRAFT,
    statusHistory: [{
      status: EPISODE_STATUS.DRAFT,
      timestamp: new Date().toISOString()
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  await docClient.send(new PutCommand({
    TableName: TABLE_NAME,
    Item: episode
  }));

  return episode;
};
```

### Updating Status

```javascript
import { CLIP_STATUS, CLIP_STATUS_TRANSITIONS } from '../../schemas/clips.mjs';

const updateClipStatus = async (clipId, newStatus) => {
  const clip = await getClip(clipId);

  // Validate transition
  const allowedTransitions = CLIP_STATUS_TRANSITIONS[clip.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(`Cannot transition from ${clip.status} to ${newStatus}`);
  }

  // Update status
  await docClient.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { pk: clipId, sk: 'metadata' },
    UpdateExpression: 'SET #status = :status, #updatedAt = :updatedAt',
    ExpressionAttributeNames: {
      '#status': 'status',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':status': newStatus,
      ':updatedAt': new Date().toISOString()
    }
  }));
};
```

### Listing with Status Filter

```javascript
import { EPISODE_STATUS } from '../../schemas/episodes.mjs';

const listPublishedEpisodes = async () => {
  const result = await docClient.send(new QueryCommand({
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    FilterExpression: '#status = :status',
    ExpressionAttributeNames: {
      '#status': 'status'
    },
    ExpressionAttributeValues: {
      ':pk': 'episodes',
      ':status': EPISODE_STATUS.PUBLISHED
    }
  }));

  return result.Items;
};
```

## Anti-Patterns to Avoid

### Don't Use String Literals

```javascript
// Bad
if (episode.status === 'draft') { }

// Good
import { EPISODE_STATUS } from '../../schemas/episodes.mjs';
if (episode.status === EPISODE_STATUS.DRAFT) { }
```

### Don't Create Duplicate Schemas

```javascript
// Bad - duplicate schema definition
const EpisodeSchema = z.object({
  title: z.string(),
  // ...
});

// Good - import from centralized location
import { EpisodeCreateSchema } from '../../schemas/episodes.mjs';
```

### Don't Skip Validation

```javascript
// Bad - no validation
const episode = JSON.parse(event.body);

// Good - validate with schema
import { EpisodeCreateSchema } from '../../schemas/episodes.mjs';
const episode = EpisodeCreateSchema.parse(JSON.parse(event.body));
```

### Don't Bypass Status Transitions

```javascript
// Bad - direct status update without validation
await updateStatus(clipId, 'Created');

// Good - validate transition first
import { CLIP_STATUS_TRANSITIONS } from '../../schemas/clips.mjs';
validateStatusTransition(currentStatus, newStatus);
await updateStatus(clipId, newStatus);
```

## Schema File Structure

Each schema file follows this pattern:

```javascript
import { z } from 'zod';

// Status enum
export const ResourceStatus = z.enum(['Status One', 'Status Two']);

// Status constants
export const RESOURCE_STATUS = {
  STATUS_ONE: 'Status One',
  STATUS_TWO: 'Status Two'
};

// Status transitions
export const RESOURCE_STATUS_TRANSITIONS = {
  [RESOURCE_STATUS.STATUS_ONE]: [RESOURCE_STATUS.STATUS_TWO],
  [RESOURCE_STATUS.STATUS_TWO]: []
};

// Validation schemas
export const ResourceCreateSchema = z.object({
  // fields
});

export const ResourceUpdateSchema = ResourceCreateSchema.partial();
```

## Testing with Schemas

```javascript
import { CLIP_STATUS } from '../../schemas/clips.mjs';

describe('Clip creation', () => {
  it('should create clip with Proposed status', async () => {
    const clip = await createClip(clipData);
    expect(clip.status).toBe(CLIP_STATUS.PROPOSED);
  });

  it('should validate status transitions', () => {
    expect(() => {
      validateStatusTransition(
        CLIP_STATUS.CREATED,
        CLIP_STATUS.PROCESSING
      );
    }).toThrow('Invalid status transition');
  });
});
```

## Migration Notes

- All status values are now Title Case (e.g., "Proposed" not "proposed")
- Status constants are exported from schema files
- Status transition maps enforce valid state changes
- Frontend and backend share the same type definitions
- Old status values have been migrated to new format
