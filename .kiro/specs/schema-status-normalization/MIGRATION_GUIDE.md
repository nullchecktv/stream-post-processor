# Status Migration Guide

This guide documents the migration from old status values to the new Title Case status format.

## Overview

The schema normalization project standardizes all status values to Title Case format for consistency and readability. This document provides the complete mapping from old to new status values.

## Migration Mapping

### Episode Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `draft` | `Draft` | Initial episode state |
| `plan_added` | `Planning` | Episode has plan/outline |
| `Ready for Clip Gen` | `Ready` | Ready for processing |
| `processing` | `Processing` | Being processed |
| `published` | `Published` | Published content |
| `archived` | `Archived` | Archived episode |

### Clip Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `detected` | `Proposed` | AI detected clip |
| `processing` | `Processing` | Video being generated |
| `created` | `Created` | Successfully created |
| `failed` | `Failed` | Generation failed |
| `reviewed` | `Created` | Merged into Created |
| `approved` | `Created` | Merged into Created |
| `rejected` | `Failed` | Merged into Failed |
| `published` | `Created` | Merged into Created |

### Quote Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `proposed` | `Proposed` | AI detected quote |
| `created` | `Created` | Successfully created |
| `failed` | `Failed` | Generation failed |
| `approved` | `Edited` | User approved/edited |
| `rejected` | `Failed` | Merged into Failed |

### Blog Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `outline_created` | `Proposed` | Outline created |
| `content_generating` | `Processing` | Content being generated |
| `content_generated` | `Created` | Successfully created |
| `outline_edited` | `Edited` | User edited outline |
| `content_edited` | `Edited` | User edited content |
| `regenerating` | `Processing` | Regenerating content |
| `failed` | `Failed` | Generation failed |

### Track Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `uploading` | `Uploading` | Upload in progress |
| `uploaded` | `Uploaded` | Upload complete |
| `processing` | `Processing` | Preprocessing video |
| `processed` | `Processed` | Preprocessing complete |
| `failed` | `Failed` | Upload/processing failed |

### Team Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `active` | `Active` | Team is active |
| `archived` | `Archived` | Team is archived |

### Membership Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `active` | `Active` | Member is active |
| `pending` | `Pending` | Invitation pending |
| `removed` | `Removed` | Member removed |

### Invitation Statuses

| Old Status | New Status | Notes |
|------------|-----------|-------|
| `pending` | `Pending` | Invitation pending |
| `accepted` | `Accepted` | Invitation accepted |
| `declined` | `Declined` | Invitation declined |
| `cancelled` | `Cancelled` | Invitation cancelled |

## Migration Script

A migration script is provided at `scripts/migrate-statuses.mjs` to update existing data in DynamoDB.

### Running the Migration

```bash
# Dry run (preview changes without applying)
node scripts/migrate-statuses.mjs --dry-run

# Apply migration
node scripts/migrate-statuses.mjs

# Migrate specific entity types
node scripts/migrate-statuses.mjs --entities episodes,clips
```

### Migration Process

1. **Backup**: The script does not modify data destructively, but consider backing up your DynamoDB table
2. **Dry Run**: Always run with `--dry-run` first to preview changes
3. **Verify**: Check the output to ensure mappings are correct
4. **Execute**: Run without `--dry-run` to apply changes
5. **Validate**: Verify data after migration

## Code Migration

### Backend Functions

All Lambda functions have been updated to use the new status constants:

```javascript
// Old approach
const status = 'detected';

// New approach
import { CLIP_STATUS } from '../../schemas/clips.mjs';
const status = CLIP_STATUS.PROPOSED;
```

### Frontend Components

Frontend components now display Title Case statuses:

```typescript
// Old approach
<span>{clip.status}</span> // Shows "detected"

// New approach
<span>{clip.status}</span> // Shows "Proposed"
```

### API Responses

All API endpoints now return Title Case status values:

```json
{
  "id": "clip-123",
  "status": "Proposed",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

## Validation

### Status Transition Validation

The new schemas include status transition maps that validate state changes:

```javascript
import { EPISODE_STATUS_TRANSITIONS } from '../../schemas/episodes.mjs';

const validateTransition = (currentStatus, newStatus) => {
  const allowed = EPISODE_STATUS_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    throw new Error(`Invalid transition: ${currentStatus} → ${newStatus}`);
  }
};
```

### Schema Validation

All status values are validated using Zod enums:

```javascript
import { EpisodeStatus } from '../../schemas/episodes.mjs';

// This will throw if status is invalid
const validated = EpisodeStatus.parse('Draft');
```

## Rollback Plan

If issues are discovered after migration:

1. **Revert Code**: Deploy previous version of Lambda functions
2. **Revert Data**: Run migration script in reverse (requires custom script)
3. **Verify**: Test all functionality with old status values

## Testing

### Unit Tests

Unit tests have been updated to use new status constants:

```javascript
import { CLIP_STATUS } from '../../schemas/clips.mjs';

test('creates clip with Proposed status', () => {
  expect(clip.status).toBe(CLIP_STATUS.PROPOSED);
});
```

### Integration Tests

Integration tests verify that:
- API endpoints return Title Case statuses
- Status transitions are validated correctly
- Frontend displays statuses correctly

## Timeline

- **Phase 1**: Schema creation and backend migration (Completed)
- **Phase 2**: Frontend migration (Completed)
- **Phase 3**: Data migration (Completed)
- **Phase 4**: Documentation and cleanup (In Progress)

## Support

For issues or questions about the migration:
1. Check this guide for status mappings
2. Review the design document at `.kiro/specs/schema-status-normalization/design.md`
3. Check status progression diagrams at `.kiro/specs/schema-status-normalization/STATUS_PROGRESSIONS.md`
