# Momento Topics and Notifications System

## Overview

The application uses Momento Topics for real-time notifications to the frontend. Notifications flow through EventBridge to a central handler that publishes to Momento Topics and optionally persists to DynamoDB.

## Architecture

```
Backend Function
    ↓
publishNotificationEvent() → EventBridge (DetailType: "Notification")
    ↓
NotificationHandlerFunction
    ↓
    ├─→ DynamoDB (if persist: true)
    └─→ Momento Topics
        ├─→ {tenantId} (tenant topic - always)
        └─→ {tenantId}_tasks (tasks topic - if topic: 'tasks')
```

## Momento Topics

### Tenant Topic: `{tenantId}`
**Purpose**: General notifications, activity feed updates, unread count changes

**Behavior**:
- Always receives all notifications
- Frontend refreshes unread count and activity feed
- Does NOT trigger page content refresh

**Frontend Handler**: `handleTenantMessage()` in `NotificationContext.tsx`
```typescript
const handleTenantMessage = async () => {
  // Refresh unread count from API
  const response = await apiRequest('/notifications');
  setUnreadCount(response.unreadCount || 0);
  
  // Trigger activity feed refresh
  window.dispatchEvent(new CustomEvent('activityUpdated'));
};
```

### Tasks Topic: `{tenantId}_tasks`
**Purpose**: Task-specific notifications that trigger page content refresh

**Behavior**:
- Only receives notifications with `topic: 'tasks'`
- Checks if user is on the notification's target URL
- If on same page: dispatches `refreshPageContent` event
- If on different page: shows toast notification with navigation option

**Frontend Handler**: `handleTaskMessage()` in `NotificationContext.tsx`
```typescript
const handleTaskMessage = (message: MomentoMessage) => {
  const currentPath = location.pathname;
  const messageUrl = message.url;
  
  if (currentPath === messageUrl) {
    // Refresh current page content
    window.dispatchEvent(new CustomEvent('refreshPageContent', {
      detail: { url: messageUrl, message }
    }));
    window.dispatchEvent(new CustomEvent('activityUpdated'));
  } else {
    // Show toast with navigation option
    showToast(message.title, 'info', () => navigate(messageUrl));
    window.dispatchEvent(new CustomEvent('activityUpdated'));
  }
};
```

## Notification Types

### Episode Planning

#### `plan_generated`
**Trigger**: AI planning agent completes episode recommendations
**Source**: `functions/tools/set-plan-recommendations.mjs`
**Topics**: Both tenant and tasks
**Persistence**: Yes
**URL**: `/episodes/{episodeId}/plan`
**Metadata**:
- `episodeId`: Episode identifier
- `sectionsCount`: Number of outline sections

**Frontend Listener**: `EpisodePlanPage.tsx`

---

### Blog Generation

#### `blog_generated`
**Trigger**: Blog content generation completes
**Source**: `functions/agents/blog-generator.mjs`
**Topics**: Both tenant and tasks
**Persistence**: Yes
**URL**: `/episodes/{episodeId}/blog`
**Metadata**:
- `episodeId`: Episode identifier
- `wordCount`: Generated blog word count

**Frontend Listener**: `BlogPage.tsx`

---

### Quote Graphics

#### `quote_graphic_ready`
**Trigger**: Quote graphic generation completes
**Source**: `functions/quotes/generate-graphic.mjs`
**Topics**: Both tenant and tasks
**Persistence**: No (ephemeral)
**URL**: `/episodes/{episodeId}/quotes/{quoteId}`
**Metadata**:
- `episodeId`: Episode identifier
- `quoteId`: Quote identifier
- `quoteText`: Quote text content

**Frontend Listener**: `QuoteDetailPage.tsx`

---

### Video Processing

#### `preprocessing_completed`
**Trigger**: MediaConvert video chunking completes
**Source**: `functions/events/preprocessing-completed.mjs`
**Topics**: Tenant only
**Persistence**: Yes
**URL**: `/episodes/{episodeId}`
**Metadata**:
- `episodeId`: Episode identifier
- `trackName`: Video track name
- `segmentCount`: Number of video segments

**Frontend Listener**: `EpisodeOverviewPage.tsx`

#### `track_processing_failed`
**Trigger**: MediaConvert video processing fails
**Source**: `functions/events/preprocessing-failed.mjs`
**Topics**: Tenant only
**Persistence**: Yes
**URL**: `/episodes/{episodeId}`
**Metadata**:
- `episodeId`: Episode identifier
- `trackName`: Video track name
- `reason`: Failure reason

**Frontend Listener**: `EpisodeOverviewPage.tsx`

#### `clip_generation_failed`
**Trigger**: Clip generation workflow fails
**Source**: `functions/events/clip-generation-failed.mjs`
**Topics**: Tenant only
**Persistence**: Yes
**URL**: `/episodes/{episodeId}/clips`
**Metadata**:
- `episodeId`: Episode identifier
- `clipId`: Clip identifier
- `error`: Error message

**Frontend Listener**: `EpisodeClipsPage.tsx`, `ClipsList.tsx`

---

### Transcript Processing

#### `transcript_processed`
**Trigger**: Transcript upload and AI analysis completes
**Source**: `functions/events/transcript-added.mjs`
**Topics**: Tenant only
**Persistence**: Yes
**URL**: `/episodes/{episodeId}`
**Metadata**:
- `episodeId`: Episode identifier
- `clipsDetected`: Number of clips detected
- `quotesDetected`: Number of quotes detected

**Frontend Listener**: `EpisodeOverviewPage.tsx`, `EpisodeContentPage.tsx`

---

### Team Management

#### `team_invitation`
**Trigger**: User invited to join team
**Source**: `functions/utils/notifications.mjs` → `createTeamInvitationNotification()`
**Topics**: Tenant only (user's personal tenant)
**Persistence**: Yes
**URL**: `/teams/{teamId}/invitations`
**Metadata**:
- `teamId`: Team identifier
- `teamName`: Team name
- `inviterName`: Name of person who sent invitation
- `invitationId`: Invitation identifier

**Frontend Listener**: Activity feed, notifications dropdown

---

## Frontend Page Listeners

Pages that listen for `refreshPageContent` event:

| Page | File | Refresh Action |
|------|------|----------------|
| Episode Plan | `EpisodePlanPage.tsx` | `fetchPlan()` |
| Episode Overview | `EpisodeOverviewPage.tsx` | `fetchEpisode()`, `fetchContent()` |
| Episode Clips | `EpisodeClipsPage.tsx` | Refetch clips list |
| Episode Quotes | `EpisodeQuotesPage.tsx` | Refetch quotes list |
| Episode Content | `EpisodeContentPage.tsx` | Refetch content |
| Blog Page | `BlogPage.tsx` | `fetchBlog()` |
| Quote Detail | `QuoteDetailPage.tsx` | Refetch quote details |
| Clips List Component | `ClipsList.tsx` | Refetch clips |

## Publishing Notifications

### Backend Usage

```javascript
import { publishNotificationEvent } from '../utils/notifications.mjs';

await publishNotificationEvent({
  type: 'notification_type',        // Notification type identifier
  tenantId,                          // Team or user tenant ID
  title: 'Notification Title',       // Display title
  message: 'Notification message',   // Display message
  url: '/target/page/url',          // Target URL for navigation
  persist: true,                     // Save to DynamoDB (default: true)
  topic: 'tasks',                    // 'tasks' for page refresh, omit for tenant-only
  metadata: {                        // Additional data
    key: 'value'
  }
});
```

### Topic Selection Guide

**Use `topic: 'tasks'` when**:
- Notification should trigger page content refresh
- User might be actively viewing the related page
- Content has been generated/updated and needs immediate display

**Omit `topic` (tenant-only) when**:
- Notification is informational only
- No specific page needs to refresh
- User should just see it in activity feed

### Persistence Guide

**Use `persist: true` when**:
- User should see notification in their notification list
- Notification has lasting relevance
- User might need to reference it later

**Use `persist: false` when**:
- Notification is ephemeral/transient
- Only real-time awareness needed
- Reduces notification clutter

## EventBridge Events

All notifications flow through EventBridge before reaching Momento:

**Event Pattern**:
```json
{
  "source": ["nullcheck"],
  "detail-type": ["Notification"]
}
```

**Event Detail**:
```json
{
  "type": "notification_type",
  "tenantId": "team#uuid",
  "title": "Notification Title",
  "message": "Notification message",
  "url": "/target/url",
  "persist": true,
  "topic": "tasks",
  "metadata": {}
}
```

## Other EventBridge Events

These events trigger workflows but don't go through the notification system:

### `Video Upload Completed`
**Source**: `functions/episodes/complete-track-upload.mjs`
**Trigger**: Multipart video upload completes
**Handler**: Triggers MediaConvert preprocessing job

### `Generate Blog Content`
**Source**: `functions/tools/build-blog-outline.mjs`
**Trigger**: Blog outline created
**Handler**: `functions/agents/blog-generator.mjs`

### `Generate Quote Graphic`
**Source**: `functions/quotes/create-quote.mjs`, `functions/quotes/update-quote.mjs`, `functions/tools/create-quotes.mjs`
**Trigger**: Quote created or updated
**Handler**: `functions/quotes/generate-graphic.mjs`

### `Generate Episode Plan`
**Source**: `functions/episodes/add-plan.mjs`, `functions/episodes/update-plan.mjs`
**Trigger**: Episode plan created or updated
**Handler**: `functions/agents/planning-agent.mjs`

### `Detect Clips`
**Source**: `functions/episodes/update-episode-status.mjs`
**Trigger**: Episode status changed to "Ready"
**Handler**: `functions/agents/clip-detector.mjs`

### Team Events
**Source**: Various team management functions
**Events**:
- `Team Member Added`
- `Team Member Removed`
- `Team Member Left`
- `Team Member Role Updated`
- `Team Deleted`
- `Team Invitation Cancelled`

**Handler**: `functions/events/team-event-handler.mjs`

## Configuration

### Environment Variables

**Backend** (`template.yaml`):
```yaml
MOMENTO_API_KEY: !Ref MomentoApiKey
MOMENTO_CACHE_NAME: !Ref MomentoCacheName
```

**Frontend** (`.env.local`):
```bash
VITE_CACHE_NAME=your-cache-name
```

### Momento Token Management

- Frontend receives Momento token from `/auth/momento-token` endpoint
- Token expires after 15 minutes
- Proactive refresh every 13 minutes
- Automatic resubscription on token refresh
- Fallback refresh on subscription errors

## Debugging

### Backend Logs
Check CloudWatch logs for `NotificationHandlerFunction`:
```
Notification published to tasks topic
Notification published to tenant topic
```

### Frontend Console
Enable verbose logging in `NotificationContext.tsx`:
```
Received tenant message: {...}
Received task message: {...}
```

### Common Issues

**Notifications not appearing**:
- Check `MOMENTO_API_KEY` is set in Lambda environment
- Verify `MOMENTO_CACHE_NAME` matches frontend config
- Check CloudWatch logs for subscription errors

**Page not refreshing**:
- Verify notification has `topic: 'tasks'`
- Check page has `refreshPageContent` event listener
- Verify URL in notification matches current page path

**Token expiration**:
- Check proactive refresh is running (13-minute interval)
- Verify `/auth/momento-token` endpoint is accessible
- Check for token refresh errors in console
