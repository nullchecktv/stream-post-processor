# Design Document

## Overview

This feature enhances the clip generation and viewing experience by:
1. Adding transcript text to clip segments in the create-clips tool
2. Creating a new API endpoint to generate clips on-demand
3. Returning full clip transcripts in the get clip API response
4. Building a clip detail page with breadcrumbs and video playback
5. Adding modal clip viewing from the clips list page

The design follows existing patterns in the codebase, using simple Lambda functions, direct DynamoDB operations, and React components with TypeScript.

## Architecture

### Backend Components

#### 1. Enhanced Create Clips Tool
**File**: `functions/tools/create-clips.mjs`

**Changes**:
- Add `transcript` field to segment schema (required, min 1 character)
- Store transcript text with each segment in DynamoDB
- Validate transcript presence during clip creation

**Data Model Update**:
```javascript
{
  pk: "tenant123#episode-id",
  sk: "clip#clip-id",
  segments: [
    {
      startTime: "00:15:30",
      endTime: "00:17:45",
      speaker: "host",
      order: 1,
      transcript: "So today we're going to talk about...",  // NEW
      notes: "Optional context"
    }
  ],
  // ... other fields
}
```

#### 2. Generate Clip Endpoint
**File**: `functions/clips/generate-clip.mjs` (new)

**Purpose**: Trigger Step Functions execution for a single clip

**Flow**:
1. Extract tenantId from authorizer context
2. Validate episodeId and clipId from path parameters
3. Extract orientation from request body (landscape or portrait)
4. Query DynamoDB to verify clip exists and belongs to episode
5. Check clip status (must be "detected" or "failed")
6. Start Step Functions execution with clip data and orientation
7. Return execution ARN and status

**API Integration**:
- Method: POST
- Path: `/episodes/{episodeId}/clips/{clipId}/generate`
- Request: `{ orientation: "landscape" | "portrait" }`
- Response: `{ executionArn, status: "started", clipId, episodeId, orientation }`

**Note**: Orientation is a placeholder for future video processing features and is not currently used in the workflow.

#### 3. Enhanced Get Clip Endpoint
**File**: `functions/clips/get-clip.mjs`

**Changes**:
- Add `transcript` field to response
- Concatenate segment transcripts in order with speaker labels
- Add `segmentCount` field to response
- Remove individual segments array from response

**Transcript Format**:
Each segment's transcript is prefixed with the speaker name in the format:
```
[Speaker Name]: Transcript text...
```

**Response Format**:
```json
{
  "id": "clip-id",
  "episodeId": "episode-id",
  "title": "Clip hook",
  "description": "Clip summary",
  "status": "processed",
  "duration": 135,
  "segmentCount": 2,
  "transcript": "[host]: First segment transcript...\n\n[guest]: Second segment transcript...",
  "tags": [],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Frontend Components

#### 1. Clip Detail Page
**File**: `frontend/src/pages/ClipDetailPage.tsx` (new)

**Route**: `/episodes/:episodeId/clips/:clipId`

**Layout**:
```
┌─────────────────────────────────────────┐
│ Breadcrumbs: Episodes > Episode > Clip │
├─────────────────────────────────────────┤
│ Clip Title (hook)                       │
│ Status Badge | Duration | Type          │
├─────────────────────────────────────────┤
│ [Video Player] (if processed)           │
│ or [Status Message] (if not ready)      │
│ or [Generate Button] (if detected)      │
├─────────────────────────────────────────┤
│ Summary                                  │
│ Clip description text...                │
├─────────────────────────────────────────┤
│ Transcript (2 segments)                  │
│ [host]: First segment transcript...     │
│                                          │
│ [guest]: Second segment transcript...   │
└─────────────────────────────────────────┘
```

**Features**:
- Breadcrumb navigation with episode title
- Video player for processed clips using HTML5 `<video>` element
- Status indicators for non-processed clips
- Generate button for detected clips (with landscape orientation)
- Full transcript display with speaker labels
- Segment count indicator

#### 2. Clip Modal Component
**File**: `frontend/src/components/clips/ClipModal.tsx` (new)

**Purpose**: Display clip video in modal overlay

**Features**:
- Full-screen overlay with dimmed background
- Video player centered in viewport
- Close button (X icon)
- Close on escape key
- Close on backdrop click
- Prevent body scroll when open

**Implementation**:
```tsx
<div className="fixed inset-0 z-50 flex items-center justify-center">
  <div className="absolute inset-0 bg-black/50" onClick={onClose} />
  <div className="relative bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
    <button onClick={onClose} className="absolute top-4 right-4">×</button>
    <video src={playbackUrl} controls className="w-full" />
  </div>
</div>
```

#### 3. Enhanced Clips List
**File**: `frontend/src/components/episodes/ClipsList.tsx` (update)

**Changes**:
- Add "View Clip" button for processed clips
- Show processing indicator for clips in progress
- Open ClipModal on view button click
- Pass clip data to modal

**List Item Layout**:
```
┌────────────────────────────────────────────┐
│ Clip Title                    [View] [···] │
│ Status: Processed | Duration: 2:15         │
│ Type: Educational                          │
└────────────────────────────────────────────┘
```

### API Changes

#### New Endpoint: Generate Clip
```yaml
/episodes/{episodeId}/clips/{clipId}/generate:
  post:
    summary: Generate clip video
    description: Triggers Step Functions workflow to process a single clip with specified orientation
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              orientation:
                type: string
                enum: [landscape, portrait]
                description: Video orientation (placeholder for future use)
            required:
              - orientation
    responses:
      202:
        description: Clip generation started
        content:
          application/json:
            schema:
              type: object
              properties:
                executionArn:
                  type: string
                status:
                  type: string
                  enum: [started]
                clipId:
                  type: string
                episodeId:
                  type: string
                orientation:
                  type: string
                  enum: [landscape, portrait]
      400:
        description: Clip not in valid state for generation or invalid orientation
      404:
        description: Episode or clip not found
```

#### Updated Schema: ClipDetail
```yaml
ClipDetail:
  type: object
  properties:
    id:
      type: string
    episodeId:
      type: string
    title:
      type: string
    description:
      type: string
    status:
      type: string
    duration:
      type: integer
    segmentCount:
      type: integer
      description: Number of segments in the clip
    transcript:
      type: string
      description: Full transcript from all segments with speaker labels
    tags:
      type: array
      items:
        type: string
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time
```

## Components and Interfaces

### Backend Functions

#### Generate Clip Function
```javascript
export const handler = async (event) => {
  const { tenantId } = event.requestContext.authorizer;
  const { episodeId, clipId } = event.pathParameters;
  const { orientation } = JSON.parse(event.body);

  // 1. Validate orientation
  if (!['landscape', 'portrait'].includes(orientation)) {
    return formatResponse(400, {
      error: 'ValidationError',
      message: 'Orientation must be landscape or portrait'
    });
  }

  // 2. Get clip from DynamoDB
  const clip = await getClip(tenantId, episodeId, clipId);

  // 3. Validate clip status
  if (!['detected', 'failed'].includes(clip.status)) {
    return formatResponse(400, {
      error: 'InvalidState',
      message: 'Clip must be in detected or failed status'
    });
  }

  // 4. Start Step Functions execution
  const execution = await sfn.send(new StartExecutionCommand({
    stateMachineArn: process.env.STATE_MACHINE_ARN,
    input: JSON.stringify({
      tenantId,
      episodeId,
      clipId,
      segments: clip.segments,
      orientation  // Placeholder for future use
    })
  }));

  return formatResponse(202, {
    executionArn: execution.executionArn,
    status: 'started',
    clipId,
    episodeId,
    orientation
  });
};
```

### Frontend Components

#### ClipDetailPage Component
```tsx
function ClipDetailPage() {
  const { episodeId, clipId } = useParams();
  const [clip, setClip] = useState<Clip | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch clip and episode data
    Promise.all([
      clipsApi.get(episodeId, clipId),
      episodesApi.get(episodeId)
    ]).then(([clipData, episodeData]) => {
      setClip(clipData);
      setEpisode(episodeData);

      // If processed, get playback URL
      if (clipData.status === 'processed') {
        clipsApi.getPlaybackUrl(episodeId, clipId)
          .then(data => setPlaybackUrl(data.downloadUrl));
      }
    });
  }, [episodeId, clipId]);

  const handleGenerate = async () => {
    await clipsApi.generate(episodeId, clipId, { orientation: 'landscape' });
    // Refresh clip data
  };

  return (
    <div>
      <Breadcrumbs>
        <Link to="/">Episodes</Link>
        <Link to={`/episodes/${episodeId}`}>{episode?.title}</Link>
        <span>{clip?.title}</span>
      </Breadcrumbs>

      {clip.status === 'processed' && playbackUrl && (
        <video src={playbackUrl} controls />
      )}

      {clip.status === 'detected' && (
        <button onClick={handleGenerate}>Generate Clip</button>
      )}

      <div>
        <h2>Summary</h2>
        <p>{clip.description}</p>
      </div>

      <div>
        <h2>Transcript ({clip.segmentCount} segments)</h2>
        <p className="whitespace-pre-wrap">{clip.transcript}</p>
      </div>
    </div>
  );
}
```

#### ClipModal Component
```tsx
interface ClipModalProps {
  clipId: string;
  episodeId: string;
  isOpen: boolean;
  onClose: () => void;
}

function ClipModal({ clipId, episodeId, isOpen, onClose }: ClipModalProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      clipsApi.getPlaybackUrl(episodeId, clipId)
        .then(data => setPlaybackUrl(data.downloadUrl));

      // Prevent body scroll
      document.body.style.overflow = 'hidden';

      // Handle escape key
      const handleEscape = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleEscape);

      return () => {
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen, clipId, episodeId, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {playbackUrl && (
          <video src={playbackUrl} controls className="w-full rounded" />
        )}
      </div>
    </div>
  );
}
```

## Data Models

### Clip Entity (Updated)
```javascript
{
  pk: "tenant123#episode-id",
  sk: "clip#clip-id",
  GSI1PK: "tenant123#clips",
  GSI1SK: "2025-01-15T10:30:00Z#episode-id#clip-id",
  clipId: "clip-id",
  segments: [
    {
      startTime: "00:15:30",
      endTime: "00:17:45",
      speaker: "host",
      order: 1,
      transcript: "Full transcript text for this segment",  // NEW
      notes: "Optional context",
      originalStartTime: "00:15:31",
      originalEndTime: "00:17:44"
    }
  ],
  hook: "Catchy title",
  summary: "Description",
  clipType: "educational",
  status: "detected",
  statusHistory: [...],
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

## Error Handling

### Backend Error Scenarios

1. **Clip Not Found**: Return 404 with descriptive message
2. **Invalid Status for Generation**: Return 400 explaining valid states
3. **Step Functions Failure**: Log error, return 500
4. **Missing Transcript**: Validation error during clip creation
5. **Playback URL Generation**: Return 404 if S3 object missing

### Frontend Error Handling

1. **Failed to Load Clip**: Show error message with retry button
2. **Failed to Generate**: Show toast notification with error
3. **Playback URL Expired**: Automatically refresh URL
4. **Network Errors**: Show user-friendly error messages

## Testing Strategy

### Backend Tests

1. **Create Clips Tool**:
   - Test transcript validation (required, min length)
   - Test segment storage with transcript
   - Test multiple segments with different transcripts

2. **Generate Clip Endpoint**:
   - Test successful execution start with orientation
   - Test invalid orientation rejection
   - Test invalid clip status rejection
   - Test clip not found scenario
   - Test Step Functions integration

3. **Get Clip Endpoint**:
   - Test transcript concatenation with speaker labels
   - Test empty transcript handling
   - Test segment count calculation
   - Test segment order preservation

### Frontend Tests

1. **ClipDetailPage**:
   - Test breadcrumb navigation
   - Test video player rendering for processed clips
   - Test status message for non-processed clips
   - Test generate button for detected clips
   - Test transcript display with speaker labels
   - Test segment count display

2. **ClipModal**:
   - Test modal open/close
   - Test escape key handling
   - Test backdrop click handling
   - Test body scroll prevention

3. **ClipsList**:
   - Test view button visibility based on status
   - Test modal opening
   - Test processing indicator

## Performance Considerations

1. **Transcript Size**: Limit transcript field to reasonable size (e.g., 10KB per segment)
2. **Playback URL Caching**: Cache presigned URLs in frontend for 50 minutes
3. **Modal Rendering**: Lazy load video player until modal opens
4. **List Performance**: Only fetch playback URLs when modal opens, not for all clips

## Security Considerations

1. **Tenant Isolation**: All operations validate tenantId from authorizer
2. **Presigned URLs**: 1-hour expiration on playback URLs
3. **Input Validation**: Validate transcript length and content
4. **XSS Prevention**: Sanitize transcript text before rendering in UI

## Deployment Notes

1. **SAM Template Updates**:
   - Add GenerateClipFunction resource
   - Add API Gateway integration for generate endpoint
   - Grant Step Functions start execution permission

2. **OpenAPI Updates**:
   - Add /generate endpoint definition
   - Update ClipDetail schema with transcript field
   - Update ClipSegment schema with transcript field

3. **Frontend Routing**:
   - Add /episodes/:episodeId/clips/:clipId route
   - Update navigation links

4. **Environment Variables**:
   - STATE_MACHINE_ARN for generate function
   - No new variables needed for other changes

