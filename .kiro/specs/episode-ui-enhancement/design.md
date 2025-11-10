# Episode UI Enhancement Design

## Overview

This design document outlines the comprehensive enhancement of the episode management user interface. The system will provide dedicated pages for episode management, background upload handling, real-time status tracking, clip playback, and activity notifications. The design follows existing patterns from the team management UI while introducing new capabilities for file uploads and video processing workflows.

### Design Goals

- Intuitive user experience with minimal learning curve
- Background upload management that persists across navigation
- Real-time status updates for episodes, uploads, and clips
- Seamless clip playback with standard video controls
- Activity notifications for asynchronous processing tasks
- Responsive design optimized for desktop and tablet workflows

### Key Design Principles

- Use existing component patterns from team management UI
- Leverage React Context for global state management
- Implement cursor-based pagination for scalability
- Use browser storage for upload state persistence
- Follow REST API patterns with proper error handling
- Maintain consistent visual language across all pages

## Architecture

### Frontend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      React Application                       │
├─────────────────────────────────────────────────────────────┤
│  Contexts                                                    │
│  ├── AuthContext (existing)                                 │
│  ├── UserContext (existing)                                 │
│  ├── ToastContext (existing)                                │
│  ├── UploadContext (new) - Background upload management     │
│  └── ActivityContext (new) - Notifications management       │
├─────────────────────────────────────────────────────────────┤
│  Pages                                                       │
│  ├── EpisodesListPage - Browse all episodes                 │
│  └── Episode Sub-pages (nested routes)                      │
│      ├── EpisodeOverviewPage - Episode summary with status  │
│      ├── EpisodeDetailsPage - Edit episode metadata         │
│      ├── EpisodeContentPage - Upload transcript/tracks      │
│      └── EpisodeClipsPage - View and manage clips           │
├─────────────────────────────────────────────────────────────┤
│  Components                                                  │
│  ├── episodes/                                               │
│  │   ├── EpisodeCard - Episode list item                    │
│  │   ├── EpisodeStatusChip - Status indicator               │
│  │   ├── StatusHistoryTimeline - Status change history      │
│  │   ├── TranscriptUploader - Transcript upload UI          │
│  │   ├── TrackUploader - Video track upload UI              │
│  │   ├── UploadProgress - Upload progress display           │
│  │   ├── ClipsList - Episode clips display                  │
│  │   ├── ClipCard - Individual clip item                    │
│  │   └── ClipPlayer - Video playback component              │
│  ├── uploads/                                                │
│  │   ├── UploadManager - Global upload status widget        │
│  │   └── UploadItem - Individual upload progress            │
│  └── activity/                                               │
│      ├── ActivityDropdown - Notifications dropdown          │
│      └── ActivityItem - Individual notification             │
│      (Note: Reuses existing activity pulse icon)            │
└─────────────────────────────────────────────────────────────┘
```

### Backend Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway (REST)                        │
├─────────────────────────────────────────────────────────────┤
│  Existing Endpoints                                          │
│  ├── GET /episodes - List episodes                          │
│  ├── POST /episodes - Create episode                        │
│  ├── GET /episodes/{id} - Get episode details               │
│  ├── POST /episodes/{id}/transcripts - Upload transcript    │
│  ├── POST /episodes/{id}/tracks - Initiate track upload     │
│  ├── POST /episodes/{id}/tracks/{name}/parts - Sign parts   │
│  ├── POST /episodes/{id}/tracks/{name}/complete - Complete  │
│  ├── GET /episodes/{id}/clips - List clips                  │
│  ├── GET /episodes/{id}/clips/{clipId} - Get clip           │
│  ├── PATCH /episodes/{id}/clips/{clipId} - Update status    │
│  └── GET /episodes/{id}/clips/{clipId}/play - Play clip     │
│                                                              │
│  New Endpoints                                               │
│  └── GET /episodes/{id}/status - Get episode status history │
├─────────────────────────────────────────────────────────────┤
│  Lambda Functions                                            │
│  ├── GetEpisodeStatusFunction (new)                         │
│  └── (existing episode functions)                           │
├─────────────────────────────────────────────────────────────┤
│  Data Storage                                                │
│  ├── DynamoDB - Episode, clip, and status data              │
│  └── S3 - Video files and transcripts                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → Frontend Component → API Request → Lambda Function → DynamoDB/S3
                                                                        ↓
                                                    EventBridge ← S3 Event
                                                        ↓
                                            Processing Lambda Functions
                                                        ↓
                                            DynamoDB Status Updates
                                                        ↓
                                            Momento Topics Publish (server-side)
                                                        ↓
                                            (Frontend subscription - future phase)
```

## Components and Interfaces

### 1. Upload Context

Manages background upload state across the application.

```typescript
interface UploadState {
  id: string
  episodeId: string
  type: 'transcript' | 'track'
  trackName?: string
  filename: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt: string
  completedAt?: string
}

interface UploadContextType {
  uploads: UploadState[]
  addUpload: (upload: Omit<UploadState, 'id' | 'startedAt'>) => string
  updateUpload: (id: string, updates: Partial<UploadState>) => void
  removeUpload: (id: string) => void
  getEpisodeUploads: (episodeId: string) => UploadState[]
  activeUploadsCount: number
}
```

### 2. Activity Context

Manages notifications for asynchronous operations. Real-time subscription will be added in a future phase.

```typescript
interface Activity {
  id: string
  type: 'clip_detected' | 'clip_processed' | 'clip_failed' | 'preprocessing_completed' | 'preprocessing_failed' | 'status_changed'
  title: string
  message: string
  episodeId: string
  clipId?: string
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

interface ActivityContextType {
  activities: Activity[]
  unreadCount: number
  addActivity: (activity: Omit<Activity, 'id' | 'isRead' | 'createdAt'>) => void
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  clearActivity: (id: string) => void
  refreshActivities: () => Promise<void>
}

// Note: Momento Topics subscription will be added in future phase
// For now, activities are managed locally and persisted to localStorage
```

### 3. Episode Status Chip Component

Visual indicator for episode processing state.

```typescript
interface EpisodeStatusChipProps {
  status: 'draft' | 'processing' | 'published' | 'archived' | 'Ready for Clip Gen'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

// Status color mapping
const statusColors = {
  draft: 'bg-gray-100 text-gray-800',
  processing: 'bg-blue-100 text-blue-800',
  'Ready for Clip Gen': 'bg-yellow-100 text-yellow-800',
  published: 'bg-green-100 text-green-800',
  archived: 'bg-gray-100 text-gray-600'
}
```

### 4. Transcript Uploader Component

Handles transcript file selection and upload.

```typescript
interface TranscriptUploaderProps {
  episodeId: string
  onUploadComplete?: () => void
  onUploadError?: (error: string) => void
}

// Upload flow:
// 1. User selects .srt file
// 2. Validate file format and size
// 3. Request presigned URL from API
// 4. Upload file to S3 with progress tracking
// 5. Update upload context with status
// 6. Notify parent component on completion
```

### 5. Track Uploader Component

Handles multipart video track uploads.

```typescript
interface TrackUploaderProps {
  episodeId: string
  onUploadComplete?: (trackName: string) => void
  onUploadError?: (error: string) => void
}

// Multipart upload flow:
// 1. User selects video file
// 2. Prompt for track name (main, guest, screenshare)
// 3. Initiate multipart upload (POST /tracks)
// 4. Split file into 10MB chunks
// 5. Request signed URLs for each part
// 6. Upload parts concurrently (max 3 at a time)
// 7. Complete multipart upload
// 8. Update upload context with status
```

### 6. Upload Manager Widget

Persistent widget showing active uploads.

```typescript
interface UploadManagerProps {
  position?: 'bottom-right' | 'bottom-left'
  collapsible?: boolean
}

// Features:
// - Shows active upload count badge
// - Expandable to show detailed progress
// - Individual upload progress bars
// - Pause/resume/cancel controls
// - Error retry functionality
// - Minimizes to corner when collapsed
```

### 7. Clip Player Component

Video playback with standard controls.

```typescript
interface ClipPlayerProps {
  clipId: string
  episodeId: string
  title: string
  autoplay?: boolean
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
}

// Features:
// - Fetches presigned URL from /play endpoint
// - Standard HTML5 video controls
// - Fullscreen support
// - Playback speed controls
// - Keyboard shortcuts (space, arrows)
// - Loading state while fetching URL
// - Error handling for failed loads
```

### 8. Status History Timeline Component

Displays chronological status changes.

```typescript
interface StatusHistoryTimelineProps {
  episodeId: string
  compact?: boolean
}

interface StatusHistoryEntry {
  status: string
  timestamp: string
  duration?: number
  metadata?: Record<string, unknown>
}

// Features:
// - Vertical timeline layout
// - Status icons and colors
// - Relative timestamps (2 hours ago)
// - Duration in each status
// - Expandable metadata details
// - Real-time updates via polling
```

## Data Models

### Episode List View (Frontend)

```typescript
interface EpisodeListView {
  id: string
  title: string
  episodeNumber: number
  airDate?: string
  status: string
  platforms?: string[]
  themes?: string[]
  createdAt: string
  updatedAt: string
}
```

### Episode Detail View (Frontend)

```typescript
interface EpisodeDetail extends EpisodeListView {
  description?: string
  seriesName?: string
  statusHistory: StatusHistoryEntry[]
  tracks: TrackInfo[]
  transcript?: TranscriptInfo
  clips: ClipListView[]
}

interface TrackInfo {
  name: string
  status: string
  filename?: string
  uploadedAt?: string
  speakers?: string[]
}

interface TranscriptInfo {
  filename: string
  uploadedAt: string
  status: string
}
```

### Clip List View (Frontend)

```typescript
interface ClipListView {
  id: string
  episodeId: string
  title: string
  hook: string
  status: 'detected' | 'processing' | 'processed' | 'approved' | 'rejected' | 'published'
  duration: number
  segments: ClipSegment[]
  createdAt: string
  updatedAt: string
}

interface ClipSegment {
  startTime: string
  endTime: string
  speaker?: string
  order: number
}
```

### Episode Status Response (Backend)

```typescript
interface EpisodeStatusResponse {
  episodeId: string
  currentStatus: string
  statusHistory: StatusHistoryEntry[]
  updatedAt: string
}
```

## Error Handling

### Upload Error Scenarios

1. **File Validation Errors**
   - Invalid file format (not .srt for transcripts)
   - File size exceeds limits
   - Missing required metadata
   - Display inline error with retry option

2. **Network Errors**
   - Connection timeout during upload
   - Presigned URL expiration
   - S3 upload failure
   - Implement automatic retry with exponential backoff

3. **Server Errors**
   - Episode not found (404)
   - Unauthorized access (403)
   - Internal server error (500)
   - Display user-friendly error message with support contact

### Clip Playback Error Scenarios

1. **Video Not Available**
   - Clip still processing
   - Video file not found in S3
   - Display status message with refresh option

2. **Playback Errors**
   - Unsupported video format
   - Corrupted video file
   - Network interruption during playback
   - Show error overlay with retry button

### Activity Notification Errors

1. **Notification Fetch Failures**
   - API timeout
   - Network connectivity issues
   - Gracefully degrade to cached notifications

2. **Notification Display Errors**
   - Invalid notification data
   - Missing episode/clip references
   - Skip invalid notifications, log error

## Testing Strategy

### Unit Tests

1. **Upload Context**
   - Test upload state management
   - Test progress tracking
   - Test error handling
   - Test persistence to localStorage

2. **Activity Context**
   - Test notification creation
   - Test read/unread state management
   - Test filtering and sorting

3. **Component Tests**
   - Test status chip rendering
   - Test upload progress display
   - Test clip player controls
   - Test timeline rendering

### Integration Tests

1. **Upload Flow**
   - Test transcript upload end-to-end
   - Test multipart track upload
   - Test concurrent uploads
   - Test upload cancellation

2. **Clip Playback Flow**
   - Test video URL fetching
   - Test playback controls
   - Test fullscreen mode
   - Test error recovery

3. **Status Updates**
   - Test status history fetching
   - Test real-time status updates
   - Test status chip updates

### Manual Testing Scenarios

1. **Background Upload Persistence**
   - Start upload, navigate away, verify continues
   - Refresh page during upload, verify recovery
   - Close browser, reopen, verify state restoration

2. **Multi-Device Testing**
   - Test responsive layout on tablet
   - Test touch interactions
   - Test video playback on mobile

3. **Error Recovery**
   - Test network disconnection during upload
   - Test server errors during clip playback
   - Test expired presigned URLs

## Page Layouts

### Episodes List Page

```
┌─────────────────────────────────────────────────────────────┐
│  Header: "Episodes"                    [+ New Episode]      │
├─────────────────────────────────────────────────────────────┤
│  Filters: [All] [Draft] [Processing] [Published]            │
├─────────────────────────────────────────────────────────────┤
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Episode #42: "Tech Talk"              [Processing]    │  │
│  │ Aired: Jan 15, 2025 • Platforms: YouTube, Twitch     │  │
│  │ 3 clips detected • 2 tracks uploaded           │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Episode #41: "Developer Tools"        [Published]     │  │
│  │ Aired: Jan 8, 2025 • Platforms: YouTube              │  │
│  │ 5 clips published • 1 track uploaded                 │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                              │
│  [Load More]                                                 │
└─────────────────────────────────────────────────────────────┘
```

### Episode Overview Page (Sub-page)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar                     │  Episode #42: "Tech Talk"    │
│  ─────────                   │  [Processing]                │
│  Episodes                    │                              │
│    > Episode #42 ●           │  Aired: January 15, 2025     │
│      • Overview              │  Platforms: YouTube, Twitch  │
│      • Details               │  Themes: Technology          │
│      • Content               │                              │
│      • Clips                 │  Description                 │
│                              │  A deep dive into modern     │
│                              │  development tools.          │
│                              │                              │
│                              │  Status History              │
│                              │  ┌──────────────────────┐    │
│                              │  │ ● Processing         │    │
│                              │  │   2 hours ago        │    │
│                              │  │ ● Ready for Clip Gen │    │
│                              │  │   3 hours ago (1h)   │    │
│                              │  │ ● Draft              │    │
│                              │  │   5 hours ago (2h)   │    │
│                              │  └──────────────────────┘    │
│                              │                              │
│                              │  Quick Stats                 │
│                              │  • 2 tracks uploaded         │
│                              │  • 1 transcript uploaded     │
│                              │  • 3 clips detected          │
│                              │                              │
└─────────────────────────────────────────────────────────────┘
```

### Episode Details Page (Sub-page)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar                     │  Edit Episode Details        │
│  ─────────                   │                              │
│  Episodes                    │  Basic Information           │
│    > Episode #42 ●           │  Title:                      │
│      • Overview              │  [Tech Talk              ]   │
│      • Details               │                              │
│      • Content               │  Episode Number:             │
│      • Clips                 │  [42]                        │
│                              │  Air Date:                   │
│                              │  [2025-01-15]                │
│                              │                              │
│                              │  Description:                │
│                              │  [                        ]  │
│                              │  [                        ]  │
│                              │                              │
│                              │  Platforms:                  │
│                              │  ☑ YouTube  ☑ Twitch        │
│                              │  ☐ LinkedIn ☐ X             │
│                              │                              │
│                              │  [Save Changes]              │
└─────────────────────────────────────────────────────────────┘
```

### Episode Content Page (Sub-page)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar                     │  Episode Content             │
│  ─────────                   │                              │
│  Episodes                    │  Transcript                  │
│    > Episode #42 ●           │  ┌──────────────────────┐    │
│      • Overview              │  │ 📄 Drop .srt file or │    │
│      • Details               │  │    click to browse   │    │
│      • Content               │  └──────────────────────┘    │
│      • Clips                 │  Current: transcript.srt ✓   │
│                              │  Video Tracks                │
│                              │  [+ Add Track]               │
│                              │                              │
│                              │  main.mp4                    │
│                              │  ████████████░░░░ 75%       │
│                              │  750 MB / 1 GB • 2 min left  │
│                              │                              │
│                              │  guest.mp4                   │
│                              │  ✓ Uploaded • Processed      │
│                              │  Speakers: host, guest1      │
│                              │                              │
└─────────────────────────────────────────────────────────────┘
```

### Episode Clips Page (Sub-page)

```
┌─────────────────────────────────────────────────────────────┐
│  Sidebar                     │  Episode Clips (3)           │
│  ─────────                   │                              │
│  Episodes                    │  Filter: [All] [Detected]    │
│    > Episode #42 ●           │  [Processing] [Processed]    │
│      • Overview              │                              │
│      • Details               │  ┌──────────────────────┐    │
│      • Content               │  │ "AI Discussion"      │    │
│      • Clips                 │  │ [Processed]          │    │
│                              │  │ 2 segments           │    │
│                              │  │ [▶ Play] [✓] [✗]    │    │
│                              │  └──────────────────────┘    │
│                              │                              │
│                              │  ┌──────────────────────┐    │
│                              │  │ "Tool Demo"          │    │
│                              │  │ [Processing]         │    │
│                              │  │ Duration: 1:45       │    │
│                              │  │ 1 segment            │    │
│                              │  └──────────────────────┘    │
│                              │                              │
└─────────────────────────────────────────────────────────────┘
```



### Upload Manager Widget (Bottom Right)

```
┌─────────────────────────────────┐
│ Uploads (2 active)        [−]   │
├─────────────────────────────────┤
│ main.mp4                        │
│ ████████████░░░░ 75%           │
│ 750 MB / 1 GB • 2 min left     │
├─────────────────────────────────┤
│ transcript.srt                  │
│ ████████████████ 100%          │
│ ✓ Upload complete              │
└─────────────────────────────────┘
```

### Activity Dropdown (from existing pulse icon)

```
┌─────────────────────────────────────┐
│ Notifications (3 unread)      [×]   │
├─────────────────────────────────────┤
│ ● Clip processed                    │
│   "AI Discussion" is ready          │
│   Episode #42 • 5 min ago           │
├─────────────────────────────────────┤
│ ○ Preprocessing completed           │
│   Track "main" processed            │
│   Episode #42 • 1 hour ago          │
├─────────────────────────────────────┤
│ ○ Clip detected                     │
│   3 clips found in episode          │
│   Episode #42 • 2 hours ago         │
├─────────────────────────────────────┤
│ [Mark all as read] [View all →]    │
└─────────────────────────────────────┘
```


## Momento Topics Integration (Server-Side Publishing)

### Architecture

Momento Topics will be used for publishing notifications from Lambda functions. Frontend subscription will be implemented in a future phase.

```
┌─────────────────────────────────────────────────────────────┐
│  Lambda Functions (Publishers)                               │
│  ├── Clip Detection Complete → Publish to tenant topic      │
│  ├── Video Processing Complete → Publish to tenant topic    │
│  ├── Status Change → Publish to tenant topic                │
│  └── Clip Processing Complete → Publish to tenant topic     │
├─────────────────────────────────────────────────────────────┤
│  Momento Topics Service                                      │
│  └── Topic: {tenantId}                                      │
│      └── Messages queued for future subscribers             │
└─────────────────────────────────────────────────────────────┘
```

### Message Format

```typescript
interface MomentoNotification {
  type: 'clip_detected' | 'clip_processed' | 'clip_failed' | 'preprocessing_completed' | 'status_changed'
  episodeId: string
  clipId?: string
  title: string
  message: string
  timestamp: string
  metadata?: Record<string, unknown>
}
```

### Backend Publishing Utility

```javascript
// functions/utils/notifications.mjs
import { TopicClient, CredentialProvider } from '@gomomento/sdk'

const client = new TopicClient({
  configuration: TopicConfigurations.Default.latest(),
  credentialProvider: CredentialProvider.fromEnvironmentVariable({
    environmentVariableName: 'MOMENTO_API_KEY'
  })
})

export const publishNotification = async (tenantId, notification) => {
  try {
    await client.publish(
      process.env.MOMENTO_CACHE_NAME,
      tenantId,
      JSON.stringify({
        ...notification,
        timestamp: new Date().toISOString()
      })
    )
  } catch (error) {
    console.error('Failed to publish notification:', error)
  }
}

// Example usage in Lambda function:
// await publishNotification(tenantId, {
//   type: 'clip_processed',
//   episodeId: '123e4567-e89b-12d3-a456-426614174000',
//   clipId: 'clip-uuid',
//   title: 'Clip Processed',
//   message: '"AI Discussion" is ready to review'
// })
```

### Integration Points

Lambda functions will publish notifications at these points:
1. **Clip Detection Complete** - After AI agent detects clips
2. **Video Preprocessing Complete** - After MediaConvert finishes chunking
3. **Clip Processing Complete** - After clip video is generated
4. **Episode Status Change** - When episode status is updated
5. **Upload Complete** - When transcript or track upload finishes

## API Integration

### Episode Status Endpoint (New)

**Endpoint:** `GET /episodes/{episodeId}/status`

**Purpose:** Fetch episode status history without full episode data

**Request:**
```http
GET /api/episodes/123e4567-e89b-12d3-a456-426614174000/status
Authorization: Bearer {token}
```

**Response:**
```json
{
  "episodeId": "123e4567-e89b-12d3-a456-426614174000",
  "currentStatus": "processing",
  "statusHistory": [
    {
      "status": "processing",
      "timestamp": "2025-01-15T14:30:00Z"
    },
    {
      "status": "Ready for Clip Gen",
      "timestamp": "2025-01-15T13:30:00Z"
    },
    {
      "status": "draft",
      "timestamp": "2025-01-15T11:30:00Z"
    }
  ],
  "updatedAt": "2025-01-15T14:30:00Z"
}
```

**Lambda Function:** `GetEpisodeStatusFunction`

**Implementation:**
```javascript
export const handler = async (event) => {
  const { tenantId } = event.requestContext.authorizer;
  const { episodeId } = event.pathParameters;

  const episode = await docClient.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { pk: `${tenantId}#${episodeId}`, sk: 'metadata' }
  }));

  if (!episode.Item) {
    return formatResponse(404, { message: 'Episode not found' });
  }

  const statusHistory = episode.Item.statusHistory || [];
  const currentStatus = statusHistory.length > 0
    ? statusHistory[statusHistory.length - 1].status
    : 'draft';

  return formatResponse(200, {
    episodeId,
    currentStatus,
    statusHistory,
    updatedAt: episode.Item.updatedAt
  });
};
```

### Existing Endpoints Usage

1. **List Episodes:** `GET /episodes`
   - Used by Episodes List Page
   - Supports pagination with cursor
   - Returns episode list view with status

2. **Get Episode:** `GET /episodes/{id}`
   - Used by Episode Detail Page
   - Returns full episode data including tracks and transcript

3. **Upload Transcript:** `POST /episodes/{id}/transcripts`
   - Used by Transcript Uploader
   - Returns presigned S3 URL

4. **Initiate Track Upload:** `POST /episodes/{id}/tracks`
   - Used by Track Uploader
   - Returns uploadId and presigned URL

5. **Sign Track Parts:** `POST /episodes/{id}/tracks/{name}/parts`
   - Used by Track Uploader for multipart
   - Returns array of presigned URLs

6. **Complete Track Upload:** `POST /episodes/{id}/tracks/{name}/complete`
   - Used by Track Uploader
   - Finalizes multipart upload

7. **List Clips:** `GET /episodes/{id}/clips`
   - Used by Episode Detail Page
   - Returns clips with current status

8. **Get Clip:** `GET /episodes/{id}/clips/{clipId}`
   - Used by Clip Player
   - Returns clip details

9. **Play Clip:** `GET /episodes/{id}/clips/{clipId}/play`
   - Used by Clip Player
   - Returns presigned video URL

10. **Update Clip Status:** `PATCH /episodes/{id}/clips/{clipId}`
    - Used by Clip Card actions
    - Updates clip status (approved, rejected, etc.)

## User Experience Enhancements

### Contextual Help

1. **First-Time Upload Help**
   - Show dismissible tooltip on first transcript upload
   - Explain .srt format requirement
   - Link to transcript format documentation

2. **Track Upload Help**
   - Explain track naming conventions
   - Suggest optimal video formats
   - Show multipart upload benefits for large files

3. **Status Chip Tooltips**
   - Hover over status chip shows explanation
   - "Processing: Video is being chunked for clip detection"
   - "Ready for Clip Gen: Upload complete, ready to detect clips"

4. **Empty States**
   - No episodes: "Create your first episode to get started"
   - No clips: "Upload transcript and tracks to detect clips"
   - No uploads: "Drag and drop files to upload"

### Loading States

1. **Episode List Loading**
   - Skeleton cards while fetching
   - Smooth transition to actual content

2. **Upload Progress**
   - Real-time progress bar
   - Estimated time remaining
   - Current upload speed

3. **Clip Player Loading**
   - Spinner while fetching video URL
   - Buffering indicator during playback

4. **Status History Loading**
   - Skeleton timeline while fetching
   - Smooth animation on load

### Responsive Design

1. **Desktop (1024px+)**
   - Full sidebar navigation
   - Multi-column layouts
   - Expanded upload manager

2. **Tablet (768px - 1023px)**
   - Collapsible sidebar
   - Single column layouts
   - Compact upload manager

3. **Mobile (< 768px)**
   - Bottom navigation
   - Stacked layouts
   - Minimized upload manager

## Implementation Considerations

### Browser Storage Strategy

**Upload State Persistence:**
- Store active uploads in `localStorage`
- Key: `episode-uploads-{userId}`
- Restore on page load
- Clear completed uploads after 24 hours

**Activity Notifications:**
- Store in `localStorage` for offline access
- Key: `episode-activities-{userId}`
- Sync with server on connection restore
- Limit to 50 most recent activities

### Performance Optimizations

1. **Lazy Loading**
   - Load clip videos only when player is visible
   - Defer status history fetch until tab is opened
   - Paginate large clip lists

2. **Caching**
   - Cache episode list for 5 minutes
   - Cache episode details for 2 minutes
   - Invalidate cache on mutations

3. **Concurrent Uploads**
   - Limit to 3 concurrent part uploads
   - Queue additional parts
   - Retry failed parts automatically

4. **Status Updates**
   - Backend publishes to Momento Topics on status changes
   - Frontend displays status from initial page load
   - Real-time subscription will be added in future phase

### Security Considerations

1. **Presigned URL Handling**
   - Never expose presigned URLs in logs
   - Validate URL expiration before use
   - Request new URL if expired

2. **File Validation**
   - Validate file types client-side
   - Enforce size limits before upload
   - Sanitize filenames

3. **Authorization**
   - Verify episode access before operations
   - Check team membership for team episodes
   - Validate clip access before playback

### Accessibility

1. **Keyboard Navigation**
   - Tab through all interactive elements
   - Space/Enter to activate buttons
   - Arrow keys for video controls

2. **Screen Reader Support**
   - ARIA labels on all controls
   - Status announcements for uploads
   - Descriptive button labels

3. **Visual Accessibility**
   - High contrast status colors
   - Focus indicators on all controls
   - Sufficient text size (16px minimum)

## Migration Strategy

### Phase 1: Core Infrastructure
- Implement Upload Context
- Implement Activity Context
- Create base components (StatusChip, UploadProgress)
- Add episode status endpoint

### Phase 2: Episode Pages
- Build Episodes List Page
- Build Episode Overview Page (sub-page with status history)
- Build Episode Details Page (sub-page)
- Build Episode Content Page (sub-page)
- Build Episode Clips Page (sub-page)
- Implement nested routing with sidebar navigation

### Phase 3: Upload Features
- Implement Transcript Uploader
- Implement Track Uploader
- Implement Upload Manager Widget
- Add background upload persistence

### Phase 4: Clip Features
- Implement Clips List
- Implement Clip Player
- Add clip status management
- Implement playback controls

### Phase 5: Activity Features & Momento Publishing
- Implement Activity Context with localStorage persistence
- Implement Activity Bell
- Implement Activity Dropdown
- Add notification creation
- Implement read/unread state
- Add Momento Topics publishing utility (server-side)
- Integrate publishing in Lambda functions for key events

### Phase 6: Polish & Testing
- Add contextual help
- Implement loading states
- Add error boundaries
- Comprehensive testing
- Performance optimization

## Dependencies

### Frontend Dependencies (Existing)
- React 19
- React Router v7
- TypeScript
- Tailwind CSS v4
- AWS Amplify (Auth)
- Zod (Validation)

### Frontend Dependencies (New)
- None required for this phase (Momento subscription will be added later)

### Backend Dependencies (New)
- `@gomomento/sdk` - Momento Topics for server-side publishing

## Success Metrics

1. **User Engagement**
   - Time to first episode creation
   - Upload completion rate
   - Clip approval rate
   - Daily active users

2. **Performance**
   - Page load time < 2 seconds
   - Upload success rate > 95%
   - Clip playback start time < 3 seconds
   - API response time < 500ms

3. **User Satisfaction**
   - Task completion rate
   - Error recovery rate
   - Feature adoption rate
   - User feedback scores

## Future Enhancements

1. **Advanced Upload Features**
   - Drag-and-drop file upload
   - Batch upload multiple tracks
   - Resume interrupted uploads
   - Upload queue management

2. **Enhanced Clip Management**
   - Clip editing (trim, merge)
   - Custom thumbnails
   - Clip collections/playlists
   - Export to social platforms

3. **Real-Time Updates (Future Phase)**
   - Frontend subscription to Momento Topics
   - WebSocket for live status updates
   - Push notifications
   - Collaborative editing
   - Live upload progress sharing

4. **Analytics Dashboard**
   - Upload statistics
   - Clip performance metrics
   - Processing time analytics
   - Storage usage tracking
