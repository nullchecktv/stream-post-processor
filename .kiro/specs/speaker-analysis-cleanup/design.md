# Design Document

## Overview

This design removes the unused `speakerAnalysis` property from the codebase. The property was originally intended to provide real-time speaker matching feedback during transcript upload, but the implementation never actually returns this data to the frontend. The property is stored in DynamoDB and included in events, but never retrieved or used.

## Architecture

### Current Flow (with speakerAnalysis)
```
1. User uploads transcript → upload-transcript.mjs generates presigned URL
2. User uploads to S3 → EventBridge triggers transcript-added.mjs
3. transcript-added.mjs:
   - Extracts speakers from transcript
   - Matches against episode speakers
   - Stores speakerAnalysis in DynamoDB (unused)
   - Publishes SpeakersAdded event with speakerAnalysis (unused)
4. Frontend expects speakerAnalysis in upload response (never provided)
5. Frontend has components to display speakerAnalysis (never rendered)
```

### Simplified Flow (without speakerAnalysis, matchSpeakers, and clip reprocessing)
```
1. User uploads transcript → upload-transcript.mjs generates presigned URL
2. User uploads to S3 → EventBridge triggers transcript-added.mjs
3. transcript-added.mjs:
   - Extracts speakers from transcript using extractSpeakersFromTranscript
   - Updates episode.speakers and episode.hasSpeakers directly
   - No event publishing (SpeakersAdded event removed)
4. Frontend receives upload confirmation
5. Episode page shows updated speaker list
```

## Components and Interfaces

### Backend Changes

#### transcript-added.mjs
- Remove `speakerAnalysis` variable and related logic
- Remove `speakerAnalysis` from DynamoDB update expression
- Remove `matchSpeakers` import and call
- Remove `needsClipReprocessing` flag logic
- Remove EventBridge event publishing (SpeakersAdded event)
- Keep `extractSpeakersFromTranscript` call (still needed for speakers field)
- Simplify to just extract speakers and update episode record

#### speakers.mjs
- Remove `matchSpeakers` function entirely
- Keep `extractSpeakersFromTranscript` function (still used)

#### speakers-added.mjs
- Delete entire file (no longer needed)
- This handler was only used for automatic clip reprocessing

#### template.yaml
- Remove `SpeakersAddedHandler` function definition
- Remove EventBridge rule that triggers speakers-added handler

### Frontend Changes

#### Remove Components
- `frontend/src/components/episodes/SpeakerAnalysisDisplay.tsx` - Delete entire file
- Remove import and usage from `TranscriptUploader.tsx`

#### Update TranscriptUploader.tsx
- Remove `SpeakerAnalysis` interface
- Remove `speakerAnalysis` state
- Remove `setSpeakerAnalysis` call
- Remove `SpeakerAnalysisDisplay` component rendering

#### Update API Types
```typescript
// frontend/src/api/episodes.ts
interface UploadTranscriptResponse {
  key: string
  uploadUrl: string
  expiresAt: string
  requiredHeaders?: Record<string, string>
  // speakerAnalysis?: { ... }  // REMOVE
}
```

### API Documentation Changes

#### openapi.yaml
- Remove `speakerAnalysis` from Episode schema
- Remove `speakerAnalysis` from any response schemas

## Data Models

### Episode Record (DynamoDB)
```javascript
// Keep these fields (still used)
{
  pk: "tenant#episodeId",
  sk: "metadata",
  speakers: ["Alice", "Bob"],     // Keep - displayed in UI
  hasSpeakers: true,               // Keep - used for validation
  // speakerAnalysis: { ... }      // REMOVE - never retrieved
  // needsClipReprocessing: true   // REMOVE - automatic reprocessing not used
}
```

### Rationale for Removing Clip Reprocessing

The automatic clip reprocessing feature was designed to regenerate clips when speakers are added to an episode. However:

1. **Never triggered in practice**: The SpeakersAdded event is published but the handler is never actually invoked
2. **Unclear user value**: Users don't expect clips to automatically regenerate when speakers change
3. **Complexity without benefit**: The feature adds significant code complexity for a workflow that doesn't happen
4. **Manual control preferred**: If users want to regenerate clips, they can delete and recreate them manually

Removing this feature simplifies the codebase without impacting actual user workflows.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Speaker data preservation
*For any* transcript upload, removing speakerAnalysis storage and matchSpeakers logic should not affect the speakers and hasSpeakers fields that are actually used by the system.
**Validates: Requirements 1.2, 4.1, 4.3**

### Property 2: No event publishing
*For any* transcript upload, the system should not publish SpeakersAdded events.
**Validates: Requirements 5.2**

### Property 3: API response consistency
*For any* upload-transcript API call, the response should not include speakerAnalysis.
**Validates: Requirements 1.4**

### Property 4: Component removal completeness
*For any* reference to SpeakerAnalysisDisplay, speakerAnalysis, matchSpeakers, or speakers-added handler in the codebase, those references should be removed.
**Validates: Requirements 2.1, 2.2, 2.3, 4.2, 5.3, 5.4**

### Property 5: No clip reprocessing flag
*For any* episode record, the needsClipReprocessing flag should not be set or referenced.
**Validates: Requirements 5.1**

## Error Handling

No new error handling required. This is a removal of unused code, so error handling remains the same for the features that continue to work (speaker extraction and storage).

## Testing Strategy

### Unit Tests

#### Backend Tests
- Verify transcript-added.mjs still extracts and stores speakers correctly
- Verify no EventBridge events are published
- Verify episode updates don't include speakerAnalysis or needsClipReprocessing
- Verify matchSpeakers function is removed from speakers.mjs

#### Frontend Tests
- Verify TranscriptUploader renders without SpeakerAnalysisDisplay
- Verify upload flow completes successfully without speakerAnalysis handling

### Integration Tests
- Upload transcript and verify episode.speakers is updated
- Verify no EventBridge events are published
- Verify frontend displays speaker list from episode record
- Verify existing clips are not affected by transcript upload

### Manual Testing
1. Upload a transcript with multiple speakers
2. Verify episode page shows speaker list
3. Verify no console errors about missing speakerAnalysis
4. Verify upload completes successfully
