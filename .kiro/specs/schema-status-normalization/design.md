# Design Document

## Overview

This design document outlines the architecture for centralizing schema definitions and normalizing status enumerations across the livestream post-production platform. The solution creates a single source of truth for all data validation using Zod schemas, exports TypeScript types for frontend consumption, and establishes consistent Title Case status values across all entity types.

## Architecture

### Directory Structure

```
schemas/
├── index.mjs                 # Barrel export for all schemas
├── common.mjs                # Shared schemas (branding, platforms, etc.)
├── common.d.ts               # TypeScript declarations for common schemas
├── episodes.mjs              # Episode schemas and status enums
├── episodes.d.ts             # TypeScript declarations for episode schemas
├── clips.mjs                 # Clip schemas and status enums
├── clips.d.ts                # TypeScript declarations for clip schemas
├── quotes.mjs                # Quote schemas and status enums
├── quotes.d.ts               # TypeScript declarations for quote schemas
├── tracks.mjs                # Track schemas and status enums
├── tracks.d.ts               # TypeScript declarations for track schemas
├── transcripts.mjs           # Transcript schemas and status enums
├── transcripts.d.ts          # TypeScript declarations for transcript schemas
├── blogs.mjs                 # Blog schemas and status enums
├── blogs.d.ts                # TypeScript declarations for blog schemas
├── teams.mjs                 # Team schemas and status enums
├── teams.d.ts                # TypeScript declarations for team schemas
├── users.mjs                 # User schemas and status enums
├── users.d.ts                # TypeScript declarations for user schemas
├── invitations.mjs           # Invitation schemas and status enums
├── invitations.d.ts          # TypeScript declarations for invitation schemas
├── notifications.mjs         # Notification schemas and status enums
├── notifications.d.ts        # TypeScript declarations for notification schemas
├── plans.mjs                 # Plan schemas and status enums
└── plans.d.ts                # TypeScript declarations for plan schemas
```

### Schema Organization Pattern

Each resource has two files:

#### 1. Schema File (`.mjs`) - Runtime Validation

```javascript
import { z } from 'zod';

// Status enum definition
export const ResourceStatus = z.enum([
  'Status One',
  'Status Two',
  'Status Three'
]);

// Status constants for programmatic access
export const RESOURCE_STATUS = {
  STATUS_ONE: 'Status One',
  STATUS_TWO: 'Status Two',
  STATUS_THREE: 'Status Three'
};

// Status transition map
export const RESOURCE_STATUS_TRANSITIONS = {
  [RESOURCE_STATUS.STATUS_ONE]: [RESOURCE_STATUS.STATUS_TWO],
  [RESOURCE_STATUS.STATUS_TWO]: [RESOURCE_STATUS.STATUS_THREE],
  [RESOURCE_STATUS.STATUS_THREE]: []
};

// Validation schemas
export const ResourceCreateSchema = z.object({
  // fields
});

export const ResourceUpdateSchema = z.object({
  // fields
}).partial();

export const ResourcePathParamsSchema = z.object({
  resourceId: z.string().uuid()
});
```

#### 2. TypeScript Declaration File (`.d.ts`) - Type Definitions

```typescript
import { z } from 'zod';

// Re-export runtime schemas
export {
  ResourceStatus,
  RESOURCE_STATUS,
  RESOURCE_STATUS_TRANSITIONS,
  ResourceCreateSchema,
  ResourceUpdateSchema,
  ResourcePathParamsSchema
} from './resource.mjs';

// Import schemas for type inference
import type {
  ResourceStatus,
  ResourceCreateSchema,
  ResourceUpdateSchema,
  ResourcePathParamsSchema
} from './resource.mjs';

// Export inferred TypeScript types
export type ResourceStatusType = z.infer<typeof ResourceStatus>;
export type ResourceCreate = z.infer<typeof ResourceCreateSchema>;
export type ResourceUpdate = z.infer<typeof ResourceUpdateSchema>;
export type ResourcePathParams = z.infer<typeof ResourcePathParamsSchema>;
```

**Benefits of this pattern:**
- Single source of truth (schemas defined once in `.mjs`)
- No code duplication between JavaScript and TypeScript
- Runtime validation available via Zod schemas
- Full TypeScript support for type checking and IDE autocomplete
- Backend can import schemas for validation
- Frontend can import types for type safety

## Components and Interfaces

### 1. Common Schemas (`schemas/common.mjs`)

Shared schemas used across multiple resources:

```javascript
import { z } from 'zod';

export const Platform = z.enum([
  'linkedin live',
  'X',
  'twitch',
  'youtube'
]);

export const BrandingSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/)
  }),
  fontFamily: z.string().min(1).max(100),
  voice: z.object({
    tone: z.string().min(1).max(200),
    writingStyle: z.string().min(1).max(200),
    perspective: z.enum(['first_person', 'third_person']).default('first_person')
  }).optional()
});

export const TimestampSchema = z.string().regex(/^\d{2}:\d{2}:\d{2}$/);

export const StatusHistoryEntrySchema = z.object({
  status: z.string(),
  timestamp: z.string().datetime(),
  metadata: z.record(z.unknown()).optional()
});

export type PlatformType = z.infer<typeof Platform>;
export type BrandingConfig = z.infer<typeof BrandingSchema>;
export type Timestamp = z.infer<typeof TimestampSchema>;
export type StatusHistoryEntry = z.infer<typeof StatusHistoryEntrySchema>;
```

### 2. Episode Schemas (`schemas/episodes.mjs`)

```javascript
import { z } from 'zod';
import { Platform, StatusHistoryEntrySchema } from './common.mjs';

export const EpisodeStatus = z.enum([
  'Draft',
  'Planning',
  'Ready',
  'Processing',
  'Published',
  'Archived'
]);

export const EPISODE_STATUS = {
  DRAFT: 'Draft',
  PLANNING: 'Planning',
  READY: 'Ready',
  PROCESSING: 'Processing',
  PUBLISHED: 'Published',
  ARCHIVED: 'Archived'
};

export const EPISODE_STATUS_TRANSITIONS = {
  [EPISODE_STATUS.DRAFT]: [EPISODE_STATUS.PLANNING, EPISODE_STATUS.ARCHIVED],
  [EPISODE_STATUS.PLANNING]: [EPISODE_STATUS.READY, EPISODE_STATUS.DRAFT],
  [EPISODE_STATUS.READY]: [EPISODE_STATUS.PROCESSING, EPISODE_STATUS.PLANNING],
  [EPISODE_STATUS.PROCESSING]: [EPISODE_STATUS.PUBLISHED, EPISODE_STATUS.READY],
  [EPISODE_STATUS.PUBLISHED]: [EPISODE_STATUS.ARCHIVED],
  [EPISODE_STATUS.ARCHIVED]: []
};

export const EpisodeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  episodeNumber: z.number().int().positive(),
  description: z.string().max(1000).optional(),
  airDate: z.string().datetime().optional(),
  platforms: z.array(Platform).optional(),
  themes: z.array(z.string()).optional(),
  seriesName: z.string().max(100).optional()
});

export const EpisodeUpdateSchema = EpisodeCreateSchema.partial();

export const EpisodeStatusUpdateSchema = z.object({
  status: EpisodeStatus
});

export const EpisodePathParamsSchema = z.object({
  episodeId: z.string().uuid()
});

export type EpisodeStatusType = z.infer<typeof EpisodeStatus>;
export type EpisodeCreate = z.infer<typeof EpisodeCreateSchema>;
export type EpisodeUpdate = z.infer<typeof EpisodeUpdateSchema>;
export type EpisodeStatusUpdate = z.infer<typeof EpisodeStatusUpdateSchema>;
export type EpisodePathParams = z.infer<typeof EpisodePathParamsSchema>;
```

### 3. Clip Schemas (`schemas/clips.mjs`)

```javascript
import { z } from 'zod';
import { TimestampSchema } from './common.mjs';

export const ClipStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed'
]);

export const CLIP_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed'
};

export const CLIP_STATUS_TRANSITIONS = {
  [CLIP_STATUS.PROPOSED]: [CLIP_STATUS.PROCESSING],
  [CLIP_STATUS.PROCESSING]: [CLIP_STATUS.CREATED, CLIP_STATUS.FAILED],
  [CLIP_STATUS.CREATED]: [],
  [CLIP_STATUS.FAILED]: [CLIP_STATUS.PROCESSING]
};

export const ClipOrientation = z.enum(['landscape', 'portrait']);

export const ClipSegmentSchema = z.object({
  startTime: TimestampSchema,
  endTime: TimestampSchema,
  speaker: z.string().min(1).max(100),
  transcript: z.string().min(1),
  order: z.number().int().positive()
});

export const ClipStatusUpdateSchema = z.object({
  status: ClipStatus
});

export const ClipGenerateSchema = z.object({
  orientation: ClipOrientation
});

export const ClipPathParamsSchema = z.object({
  episodeId: z.string().uuid(),
  clipId: z.string().uuid()
});

export type ClipStatusType = z.infer<typeof ClipStatus>;
export type ClipOrientationType = z.infer<typeof ClipOrientation>;
export type ClipSegment = z.infer<typeof ClipSegmentSchema>;
export type ClipStatusUpdate = z.infer<typeof ClipStatusUpdateSchema>;
export type ClipGenerate = z.infer<typeof ClipGenerateSchema>;
export type ClipPathParams = z.infer<typeof ClipPathParamsSchema>;
```

### 4. Quote Schemas (`schemas/quotes.mjs`)

```javascript
import { z } from 'zod';
import { TimestampSchema } from './common.mjs';

export const QuoteStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed',
  'Edited'
]);

export const QUOTE_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed',
  EDITED: 'Edited'
};

export const QUOTE_STATUS_TRANSITIONS = {
  [QUOTE_STATUS.PROPOSED]: [QUOTE_STATUS.PROCESSING],
  [QUOTE_STATUS.PROCESSING]: [QUOTE_STATUS.CREATED, QUOTE_STATUS.FAILED],
  [QUOTE_STATUS.CREATED]: [QUOTE_STATUS.EDITED],
  [QUOTE_STATUS.FAILED]: [QUOTE_STATUS.PROCESSING],
  [QUOTE_STATUS.EDITED]: []
};

export const QuoteCreateSchema = z.object({
  text: z.string().min(5).max(280),
  speaker: z.string().min(1).max(100),
  timestamp: TimestampSchema,
  relevanceScore: z.number().min(0).max(100).optional(),
  context: z.string().max(500).optional(),
  showSpeaker: z.boolean().default(true),
  showEpisodeTitle: z.boolean().default(true)
});

export const QuoteUpdateSchema = z.object({
  text: z.string().min(5).max(280).optional(),
  speaker: z.string().min(1).max(100).optional(),
  showSpeaker: z.boolean().optional(),
  showEpisodeTitle: z.boolean().optional(),
  status: QuoteStatus.optional()
});

export const QuotePathParamsSchema = z.object({
  episodeId: z.string().uuid(),
  quoteId: z.string().uuid()
});

export type QuoteStatusType = z.infer<typeof QuoteStatus>;
export type QuoteCreate = z.infer<typeof QuoteCreateSchema>;
export type QuoteUpdate = z.infer<typeof QuoteUpdateSchema>;
export type QuotePathParams = z.infer<typeof QuotePathParamsSchema>;
```

### 5. Blog Schemas (`schemas/blogs.mjs`)

```javascript
import { z } from 'zod';

export const BlogStatus = z.enum([
  'Proposed',
  'Processing',
  'Created',
  'Failed',
  'Edited'
]);

export const BLOG_STATUS = {
  PROPOSED: 'Proposed',
  PROCESSING: 'Processing',
  CREATED: 'Created',
  FAILED: 'Failed',
  EDITED: 'Edited'
};

export const BLOG_STATUS_TRANSITIONS = {
  [BLOG_STATUS.PROPOSED]: [BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.PROCESSING]: [BLOG_STATUS.CREATED, BLOG_STATUS.FAILED],
  [BLOG_STATUS.CREATED]: [BLOG_STATUS.EDITED, BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.FAILED]: [BLOG_STATUS.PROCESSING],
  [BLOG_STATUS.EDITED]: [BLOG_STATUS.PROCESSING]
};

export const BlogUpdateSchema = z.object({
  outline: z.string().min(1).optional(),
  content: z.string().min(1).optional()
});

export const BlogRegenerateSchema = z.object({
  outline: z.string().min(1)
});

export type BlogStatusType = z.infer<typeof BlogStatus>;
export type BlogUpdate = z.infer<typeof BlogUpdateSchema>;
export type BlogRegenerate = z.infer<typeof BlogRegenerateSchema>;
```

### 6. Track Schemas (`schemas/tracks.mjs`)

```javascript
import { z } from 'zod';

export const TrackStatus = z.enum([
  'Uploading',
  'Uploaded',
  'Processing',
  'Processed',
  'Failed'
]);

export const TRACK_STATUS = {
  UPLOADING: 'Uploading',
  UPLOADED: 'Uploaded',
  PROCESSING: 'Processing',
  PROCESSED: 'Processed',
  FAILED: 'Failed'
};

export const TRACK_STATUS_TRANSITIONS = {
  [TRACK_STATUS.UPLOADING]: [TRACK_STATUS.UPLOADED, TRACK_STATUS.FAILED],
  [TRACK_STATUS.UPLOADED]: [TRACK_STATUS.PROCESSING],
  [TRACK_STATUS.PROCESSING]: [TRACK_STATUS.PROCESSED, TRACK_STATUS.FAILED],
  [TRACK_STATUS.PROCESSED]: [],
  [TRACK_STATUS.FAILED]: [TRACK_STATUS.UPLOADING]
};

export const TrackCreateSchema = z.object({
  filename: z.string().min(1).max(255),
  trackName: z.string().min(1).max(150).regex(/^[a-zA-Z0-9_-]+$/),
  speakers: z.array(z.string().min(1)).optional()
});

export const TrackUpdateSchema = z.object({
  speakers: z.array(z.string().min(1)).optional()
});

export const TrackPathParamsSchema = z.object({
  episodeId: z.string().uuid(),
  trackName: z.string().min(1).max(50)
});

export const TrackSignPartsSchema = z.object({
  uploadId: z.string().min(1),
  partNumbers: z.array(z.number().int().positive())
});

export const TrackCompleteSchema = z.object({
  uploadId: z.string().min(1),
  parts: z.array(z.object({
    ETag: z.string().min(1),
    PartNumber: z.number().int().positive()
  }))
});
```

#### TypeScript Declarations (`schemas/tracks.d.ts`)

```typescript
import { z } from 'zod';

export {
  TrackStatus,
  TRACK_STATUS,
  TRACK_STATUS_TRANSITIONS,
  TrackCreateSchema,
  TrackUpdateSchema,
  TrackPathParamsSchema,
  TrackSignPartsSchema,
  TrackCompleteSchema
} from './tracks.mjs';

import type {
  TrackStatus,
  TrackCreateSchema,
  TrackUpdateSchema,
  TrackPathParamsSchema,
  TrackSignPartsSchema,
  TrackCompleteSchema
} from './tracks.mjs';

export type TrackStatusType = z.infer<typeof TrackStatus>;
export type TrackCreate = z.infer<typeof TrackCreateSchema>;
export type TrackUpdate = z.infer<typeof TrackUpdateSchema>;
export type TrackPathParams = z.infer<typeof TrackPathParamsSchema>;
export type TrackSignParts = z.infer<typeof TrackSignPartsSchema>;
export type TrackComplete = z.infer<typeof TrackCompleteSchema>;
```

### 7. Team Schemas (`schemas/teams.mjs`)

```javascript
import { z } from 'zod';
import { Platform, BrandingSchema } from './common.mjs';

export const TeamStatus = z.enum(['Active', 'Archived']);

export const TEAM_STATUS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived'
};

export const MembershipStatus = z.enum(['Active', 'Pending', 'Removed']);

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  REMOVED: 'Removed'
};

export const MemberRole = z.enum(['owner', 'administrator', 'member']);

export const TeamCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: z.object({
    defaultPlatforms: z.array(Platform).optional(),
    timezone: z.string().optional()
  }).optional(),
  branding: BrandingSchema.optional()
});

export const TeamUpdateSchema = TeamCreateSchema.partial();

export const TeamAddMemberSchema = z.object({
  email: z.string().email(),
  role: MemberRole.exclude(['owner']).default('member')
});

export const TeamUpdateMemberRoleSchema = z.object({
  role: MemberRole.exclude(['owner'])
});

export const TeamPathParamsSchema = z.object({
  teamId: z.string().uuid()
});

export const TeamPathParamsWithUserSchema = z.object({
  teamId: z.string().uuid(),
  userId: z.string().uuid()
});

export type TeamStatusType = z.infer<typeof TeamStatus>;
export type MembershipStatusType = z.infer<typeof MembershipStatus>;
export type MemberRoleType = z.infer<typeof MemberRole>;
export type TeamCreate = z.infer<typeof TeamCreateSchema>;
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>;
export type TeamAddMember = z.infer<typeof TeamAddMemberSchema>;
export type TeamUpdateMemberRole = z.infer<typeof TeamUpdateMemberRoleSchema>;
export type TeamPathParams = z.infer<typeof TeamPathParamsSchema>;
export type TeamPathParamsWithUser = z.infer<typeof TeamPathParamsWithUserSchema>;
```

### 8. Invitation Schemas (`schemas/invitations.mjs`)

```javascript
import { z } from 'zod';

export const InvitationStatus = z.enum([
  'Pending',
  'Accepted',
  'Declined',
  'Cancelled',
  'Expired'
]);

export const INVITATION_STATUS = {
  PENDING: 'Pending',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
  CANCELLED: 'Cancelled',
  EXPIRED: 'Expired'
};

export const INVITATION_STATUS_TRANSITIONS = {
  [INVITATION_STATUS.PENDING]: [
    INVITATION_STATUS.ACCEPTED,
    INVITATION_STATUS.DECLINED,
    INVITATION_STATUS.CANCELLED,
    INVITATION_STATUS.EXPIRED
  ],
  [INVITATION_STATUS.ACCEPTED]: [],
  [INVITATION_STATUS.DECLINED]: [],
  [INVITATION_STATUS.CANCELLED]: [],
  [INVITATION_STATUS.EXPIRED]: []
};

export const InvitationDecisionSchema = z.object({
  action: z.enum(['accept', 'reject'])
});

export const InvitationPathParamsSchema = z.object({
  invitationId: z.string().uuid()
});

export type InvitationStatusType = z.infer<typeof InvitationStatus>;
export type InvitationDecision = z.infer<typeof InvitationDecisionSchema>;
export type InvitationPathParams = z.infer<typeof InvitationPathParamsSchema>;
```

### 9. Barrel Export (`schemas/index.mjs`)

```javascript
// Common schemas
export * from './common.mjs';

// Entity schemas
export * from './episodes.mjs';
export * from './clips.mjs';
export * from './quotes.mjs';
export * from './tracks.mjs';
export * from './transcripts.mjs';
export * from './blogs.mjs';
export * from './teams.mjs';
export * from './users.mjs';
export * from './invitations.mjs';
export * from './notifications.mjs';
export * from './plans.mjs';
```

## Data Models

### Status Migration Mapping

| Entity | Old Status | New Status |
|--------|-----------|------------|
| **Episodes** | draft | Draft |
| | plan_added | Planning |
| | Ready for Clip Gen | Ready |
| | processing | Processing |
| | published | Published |
| | archived | Archived |
| **Clips** | detected | Proposed |
| | processing | Processing |
| | created | Created |
| | failed | Failed |
| | reviewed | Created |
| | approved | Created |
| | rejected | Failed |
| | published | Created |
| **Quotes** | proposed | Proposed |
| | created | Created |
| | failed | Failed |
| | approved | Edited |
| | rejected | Failed |
| **Blogs** | outline_created | Proposed |
| | content_generating | Processing |
| | content_generated | Created |
| | outline_edited | Edited |
| | content_edited | Edited |
| | regenerating | Processing |
| | failed | Failed |
| **Tracks** | uploading | Uploading |
| | uploaded | Uploaded |
| | processing | Processing |
| | processed | Processed |
| | failed | Failed |
| **Teams** | active | Active |
| | archived | Archived |
| **Memberships** | active | Active |
| | pending | Pending |
| | removed | Removed |
| **Invitations** | pending | Pending |
| | accepted | Accepted |
| | declined | Declined |
| | cancelled | Cancelled |

### Status Transition Validation

Each schema file exports a status transition map that defines valid state changes:

```javascript
export const validateStatusTransition = (currentStatus, newStatus, transitionMap) => {
  if (!currentStatus) {
    return true; // Allow any initial status
  }

  const allowedTransitions = transitionMap[currentStatus] || [];
  if (!allowedTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${newStatus}'`
    );
  }

  return true;
};
```

## Error Handling

### Validation Errors

```javascript
try {
  const validated = EpisodeCreateSchema.parse(data);
} catch (error) {
  if (error instanceof z.ZodError) {
    return formatResponse(400, {
      error: 'ValidationError',
      message: 'Invalid request data',
      details: error.errors
    });
  }
}
```

### Status Transition Errors

```javascript
try {
  validateStatusTransition(
    currentStatus,
    newStatus,
    EPISODE_STATUS_TRANSITIONS
  );
} catch (error) {
  return formatResponse(400, {
    error: 'InvalidStatusTransition',
    message: error.message
  });
}
```

## Testing Strategy

### Unit Tests

1. **Schema Validation Tests**
   - Test valid data passes validation
   - Test invalid data fails validation
   - Test optional fields work correctly
   - Test enum values are enforced

2. **Status Transition Tests**
   - Test valid transitions succeed
   - Test invalid transitions fail
   - Test initial status assignment
   - Test terminal states

3. **Type Export Tests**
   - Verify TypeScript types are correctly inferred
   - Test type compatibility with existing code

### Integration Tests

1. **Backend Integration**
   - Test Lambda functions use centralized schemas
   - Test validation errors return correct format
   - Test status updates follow transition rules

2. **Frontend Integration**
   - Test frontend can import and use types
   - Test type safety in API calls
   - Test status display uses correct values

## Migration Strategy

### Phase 1: Create Centralized Schemas
1. Create `schemas/` directory structure
2. Implement all schema files with Zod
3. Export TypeScript types
4. Create barrel export file

### Phase 2: Update Backend Code
1. Update `functions/utils/schemas.mjs` to import from centralized schemas
2. Update all Lambda functions to use new status constants
3. Update status transition validation logic
4. Update tool definitions to use centralized schemas

### Phase 3: Update Frontend Code
1. Configure frontend build to access schemas directory
2. Update frontend types to import from schemas
3. Update status display logic to use Title Case
4. Remove duplicate type definitions

### Phase 4: Data Migration
1. Create migration script to update existing status values
2. Run migration on DynamoDB data
3. Verify all status values are updated
4. Update status history entries

### Phase 5: Validation and Cleanup
1. Run full test suite
2. Verify all endpoints work correctly
3. Remove old schema definitions
4. Remove old status constants
5. Update documentation

## Implementation Notes

### Frontend Build Configuration

Update `frontend/vite.config.ts` to resolve schemas:

```typescript
export default defineConfig({
  resolve: {
    alias: {
      '@schemas': path.resolve(__dirname, '../schemas')
    }
  }
});
```

Update `frontend/tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@schemas/*": ["../schemas/*"]
    }
  }
}
```

### TypeScript Declaration Files

Each `.mjs` schema file has a companion `.d.ts` file that provides TypeScript type definitions:

**Purpose:**
- Provide TypeScript type safety without duplicating schema definitions
- Enable IDE autocomplete for both JavaScript and TypeScript code
- Allow frontend to import types while backend uses runtime validation

**Pattern:**
```typescript
// schemas/resource.d.ts
import { z } from 'zod';

// Re-export runtime schemas (no duplication)
export {
  ResourceStatus,
  RESOURCE_STATUS,
  ResourceCreateSchema
} from './resource.mjs';

// Import for type inference
import type {
  ResourceStatus,
  ResourceCreateSchema
} from './resource.mjs';

// Export inferred types
export type ResourceStatusType = z.infer<typeof ResourceStatus>;
export type ResourceCreate = z.infer<typeof ResourceCreateSchema>;
```

**Benefits:**
- Single source of truth (schemas in `.mjs` files)
- No code duplication
- Full TypeScript support
- Works with both JavaScript and TypeScript consumers

### Backward Compatibility

During migration, support both old and new status values:

```javascript
const normalizeStatus = (status) => {
  const statusMap = {
    'detected': 'Proposed',
    'created': 'Created',
    // ... other mappings
  };
  return statusMap[status] || status;
};
```

### Performance Considerations

- Zod validation is fast but adds overhead
- Cache parsed schemas where possible
- Use `.safeParse()` for non-throwing validation
- Consider lazy validation for large objects

## Success Criteria

1. All schemas defined in centralized location
2. All status values in Title Case
3. Frontend imports types from backend schemas
4. All validation uses centralized schemas
5. Status transitions validated consistently
6. No duplicate schema definitions
7. All tests passing
8. Documentation updated

