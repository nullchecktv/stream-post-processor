# Design Document

## Overview

This feature adds memorable quote extraction and branded graphic generation to the livestream post-production platform. The AI agent analyzes transcripts to identify shareable quotes, stores them in DynamoDB, and generates 16:9 graphics using team branding (colors and fonts). Users manage quotes through REST API endpoints and view them in the episode UI alongside clips and tracks.

## Architecture

### High-Level Flow

```
Transcript Analysis → Quote Detection (AI Agent) → Quote Storage (DynamoDB)
                                                          ↓
User Approval → Graphic Generation (Lambda + Sharp) → S3 Storage
                                                          ↓
                                              UI Display & Management
```

### Component Interaction

1. **Clip Detector Agent** analyzes transcript and calls Quote Tool
2. **Quote Tool** validates and stores quotes in DynamoDB
3. **Quote API** provides CRUD operations for quote management
4. **Graphic Generator** creates branded images using Sharp layer
5. **Frontend UI** displays quotes in episode assets tree

## Components and Interfaces

### 1. Quote Tool (Agent Integration)

**Location**: `functions/tools/create-quotes.mjs`

**Purpose**: Provides AI agent with capability to save detected quotes

**Schema**:
```javascript
{
  episodeId: string,
  quotes: [{
    title: string,          // Brief name for the quote (10-40 characters)
    text: string,           // Quote text (5-280 characters)
    speaker: string,        // Speaker attribution
    timestamp: string,      // Time in transcript (hh:mm:ss)
    relevanceScore: number, // 0-100 score
    context: string         // Optional surrounding context
  }]
}
```

**Handler Logic**:
- Validates tenant context
- Generates unique quote IDs
- Stores quotes in DynamoDB with proper keys
- Fetches episode metadata for title
- Publishes `Generate Quote Graphic` EventBridge event for each quote with full data
- Returns success/failure message to agent

**Integration Point**: Added to `convertToBedrockTools` array in clip detector agent

### 2. Quote Data Model

**DynamoDB Structure**:

```javascript
{
  pk: "{tenantId}#{episodeId}",
  sk: "data#quote#{quoteId}",
  GSI1PK: "{tenantId}#quotes",
  GSI1SK: "{timestamp}#{episodeId}#{quoteId}",
  quoteId: "uuid",
  text: "Quote text here",
  speaker: "Allen",
  timestamp: "00:15:30",
  relevanceScore: 85,
  context: "Optional context",
  showSpeaker: true,
  showEpisodeTitle: true,
  status: "detected|generated|approved|rejected",
  s3Key: "{tenantId}/{episodeId}/quotes/{quote-id}.png",
  createdAt: "ISO-8601",
  updatedAt: "ISO-8601",
  ttl: 1234567890  // 14 days
}
```

**Access Patterns**:
- Get quote: `pk = {tenantId}#{episodeId}` AND `sk = data#quote#{quoteId}`
- List episode quotes: `pk = {tenantId}#{episodeId}` AND `sk` begins with `data#quote#`
- List tenant quotes: GSI1 query with `GSI1PK = {tenantId}#quotes`

### 3. Tenant Branding Configuration

**Team Metadata Enhancement**:

```javascript
{
  pk: "team#{teamId}",
  sk: "metadata",
  // ... existing fields
  branding: {
    colors: {
      primary: "#3B82F6",      // Main brand color (used for border)
      secondary: "#8B5CF6",    // Accent color (used for speaker name)
      background: "#1F2937",   // Background color
      text: "#F9FAFB"          // Text color
    },
    fontFamily: "Inter"        // Font for quote graphics
  }
}
```

**User Profile Enhancement**:

```javascript
{
  pk: "user#{userId}",
  sk: "profile",
  // ... existing fields
  branding: {
    colors: {
      primary: "#3B82F6",
      secondary: "#8B5CF6",
      background: "#1F2937",
      text: "#F9FAFB"
    },
    fontFamily: "Inter"
  }
}
```

**Branding Resolution Logic**:
1. Fetch tenant record (team or user) by tenantId
2. Check if branding field exists on tenant
3. Use system defaults if tenant branding not configured

### 4. Quote Graphics Generator

**Location**: `functions/quotes/generate-graphic.mjs`

**Lambda Configuration**:
- Runtime: Node.js 22.x
- Memory: 1024 MB (for @napi-rs/canvas image processing)
- Timeout: 30 seconds
- Layers: @napi-rs/canvas Lambda Layer (arn:aws:lambda:us-east-1:205979422636:layer:napi-rs-canvas:888)
- Trigger: EventBridge event pattern matching `Generate Quote Graphic` events

**EventBridge Event Pattern**:
```json
{
  "source": ["nullcheck"],
  "detail-type": ["Generate Quote Graphic"]
}
```

**Event Detail Structure**:
```javascript
{
  source: "nullcheck",
  "detail-type": "Generate Quote Graphic",
  detail: {
    tenantId: string,
    episodeId: string,
    quoteId: string,
    quote: {
      text: string,
      speaker: string,
      timestamp: string,
      showSpeaker: boolean,
      showEpisodeTitle: boolean,
      status: string
    },
    episode: {
      title: string
    }
  }
}
```

**Processing Steps**:
1. Extract quote and episode data from event detail (no DynamoDB lookup needed)
2. Resolve branding (tenant → defaults)
3. Generate 1920x1080 PNG using @napi-rs/canvas with primary color border
4. Upload to S3 (overwrite if exists)
5. Update quote record with s3Key and status

**Graphic Layout**:
```
┌─────────────────────────────────────────┐ ← Primary color border
│ [Background Color]                      │
│                                         │
│     "Quote text here in large font"     │
│                                         │
│     — Speaker Name (if showSpeaker)     │
│                                         │
│     Episode Title (if showEpisodeTitle) │
│                                         │
└─────────────────────────────────────────┘ ← Primary color border
```

**@napi-rs/canvas Implementation**:
```javascript
import { createCanvas } from '@napi-rs/canvas';

const borderWidth = 20;
const width = 1920;
const height = 1080;
const innerWidth = width - (borderWidth * 2);
const innerHeight = height - (borderWidth * 2);

const canvas = createCanvas(width, height);
const ctx = canvas.getContext('2d');

// Draw border (primary color)
ctx.fillStyle = branding.colors.primary;
ctx.fillRect(0, 0, width, height);

// Draw inner background
ctx.fillStyle = branding.colors.background;
ctx.fillRect(borderWidth, borderWidth, innerWidth, innerHeight);

// Draw quote text
ctx.fillStyle = branding.colors.text;
ctx.font = `bold 72px ${branding.fontFamily}`;
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';
ctx.fillText(quote.text, width / 2, 450);

// Draw speaker name (if enabled)
if (quote.showSpeaker) {
  ctx.fillStyle = branding.colors.secondary;
  ctx.font = `48px ${branding.fontFamily}`;
  ctx.fillText(`— ${quote.speaker}`, width / 2, 580);
}

// Draw episode title (if enabled)
if (quote.showEpisodeTitle) {
  ctx.fillStyle = branding.colors.text;
  ctx.globalAlpha = 0.7;
  ctx.font = `36px ${branding.fontFamily}`;
  ctx.fillText(episode.title, width / 2, 650);
  ctx.globalAlpha = 1.0;
}

const buffer = await canvas.encode('png');
```

**Event Publishing**:

Quote creation and update functions publish EventBridge events to trigger graphic generation:

```javascript
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const eventBridge = new EventBridgeClient();

await eventBridge.send(new PutEventsCommand({
  Entries: [{
    Source: 'nullcheck',
    DetailType: 'Generate Quote Graphic',
    Detail: JSON.stringify({
      tenantId,
      episodeId,
      quoteId,
      quote: {
        text: quote.text,
        speaker: quote.speaker,
        timestamp: quote.timestamp,
        showSpeaker: quote.showSpeaker,
        showEpisodeTitle: quote.showEpisodeTitle,
        status: quote.status
      },
      episode: {
        title: episode.title
      }
    })
  }]
}));
```

### 5. Quote API Endpoints

#### POST /episodes/{episodeId}/quotes

**Purpose**: Create a new quote manually

**Request**:
```json
{
  "text": "Quote text",
  "speaker": "Allen",
  "timestamp": "00:15:30",
  "relevanceScore": 85,
  "context": "Optional context"
}
```

**Response**: `201 Created`
```json
{
  "id": "quote-uuid"
}
```

**Lambda**: `functions/quotes/create-quote.mjs`

**Post-Creation Logic**:
1. Store quote in DynamoDB with status='proposed'
2. Fetch episode metadata for title
3. Publish `Generate Quote Graphic` EventBridge event with full quote and episode data
4. EventBridge triggers graphic generation Lambda asynchronously

#### GET /episodes/{episodeId}/quotes

**Purpose**: List all quotes for an episode

**Query Parameters**:
- `limit`: Number of items (default 20, max 100)
- `cursor`: Pagination cursor

**Response**: `200 OK`
```json
{
  "items": [
    {
      "id": "quote-uuid",
      "text": "Quote text",
      "speaker": "Allen",
      "timestamp": "00:15:30",
      "relevanceScore": 85,
      "status": "generated",
      "imageUrl": "presigned-s3-url",
      "createdAt": "ISO-8601"
    }
  ],
  "nextToken": "cursor-string"
}
```

**Lambda**: `functions/quotes/list-quotes.mjs`

#### PUT /episodes/{episodeId}/quotes/{quoteId}

**Purpose**: Update quote metadata and regenerate graphic

**Request**:
```json
{
  "text": "Updated quote text",
  "speaker": "Updated speaker",
  "showSpeaker": false,
  "showEpisodeTitle": true,
  "status": "approved"
}
```

**Response**: `204 No Content`

**Lambda**: `functions/quotes/update-quote.mjs`

**Logic**:
1. Update quote metadata in DynamoDB
2. If text, speaker, showSpeaker, or showEpisodeTitle changed:
   - Fetch updated quote and episode data
   - Publish `Generate Quote Graphic` EventBridge event with full data
   - EventBridge triggers graphic regeneration asynchronously
3. Regeneration overwrites existing S3 object with same key

#### DELETE /episodes/{episodeId}/quotes/{quoteId}

**Purpose**: Delete quote and associated graphic

**Response**: `204 No Content`

**Lambda**: `functions/quotes/delete-quote.mjs`

**Logic**:
1. Fetch quote from DynamoDB
2. Delete S3 object if exists
3. Delete DynamoDB record
4. Return 204 (idempotent)

### 6. Frontend UI Components

#### Quote Card Component

**Location**: `frontend/src/components/episodes/QuoteCard.tsx`

**Props**:
```typescript
interface QuoteCardProps {
  quote: {
    id: string;
    text: string;
    speaker: string;
    timestamp: string;
    status: string;
    imageUrl?: string;
  };
  onDelete: (id: string) => void;
  onDownload: (id: string) => void;
  onRegenerate: (id: string) => void;
}
```

**Features**:
- Display quote text and metadata
- Show thumbnail preview of graphic
- Download button for full-size image
- Delete button with confirmation
- Regenerate button for failed graphics
- Status indicator (detected, generated, approved)

#### Episode Quotes Page

**Location**: `frontend/src/pages/EpisodeQuotesPage.tsx`

**Route**: `/episodes/:id/quotes`

**Sidebar Navigation**: Add "Quotes" link in the EPISODE section of the sidebar, alongside Overview, Details, Uploads, and Clips

**Layout**:
```
Episode Quotes Page (/episodes/:id/quotes)
├── Page Header (Episode title, description)
├── Quote Cards Grid (3 columns on large screens)
│   ├── Quote Card 1
│   ├── Quote Card 2
│   └── Quote Card 3
└── Load More Button (if pagination needed)
```

#### Team Settings Branding

**Location**: `frontend/src/pages/TeamDetailPage.tsx`

**New Section**: "Branding" tab

**Fields**:
- Primary Color (color picker)
- Secondary Color (color picker)
- Background Color (color picker)
- Text Color (color picker)
- Font Family (dropdown: Inter, Roboto, Open Sans, Lato, Montserrat)
- Preview panel showing sample quote graphic

#### User Profile Branding

**Location**: `frontend/src/pages/ProfilePage.tsx`

**New Section**: "Personal Branding" (optional overrides)

**Fields**:
- Same as team settings
- Checkbox: "Use team branding" (default checked)
- When unchecked, show color pickers and font selector

## Data Models

### Quote Entity

```typescript
interface Quote {
  pk: string;                    // {tenantId}#{episodeId}
  sk: string;                    // data#quote#{quoteId}
  GSI1PK: string;                // {tenantId}#quotes
  GSI1SK: string;                // {timestamp}#{episodeId}#{quoteId}
  quoteId: string;
  text: string;
  speaker: string;
  timestamp: string;             // hh:mm:ss
  relevanceScore: number;        // 0-100
  context?: string;
  showSpeaker: boolean;          // Display speaker name (default true)
  showEpisodeTitle: boolean;     // Display episode title (default true)
  status: 'detected' | 'generated' | 'approved' | 'rejected';
  s3Key?: string;
  fileSize?: number;
  createdAt: string;
  updatedAt: string;
  ttl: number;                   // 14 days
}
```

### Branding Configuration

```typescript
interface BrandingConfig {
  colors: {
    primary: string;             // Hex color
    secondary: string;           // Hex color
    background: string;          // Hex color
    text: string;                // Hex color
  };
  fontFamily: string;            // Font name
}
```

### Default Branding

```javascript
const DEFAULT_BRANDING = {
  colors: {
    primary: '#3B82F6',          // Blue
    secondary: '#8B5CF6',        // Purple
    background: '#1F2937',       // Dark gray
    text: '#F9FAFB'              // Light gray
  },
  fontFamily: 'Inter'
};
```

## Error Handling

### Quote Tool Errors

- **Missing tenant context**: Return error message to agent
- **Invalid quote data**: Validate schema and return specific error
- **DynamoDB errors**: Log and return generic error to agent
- **Duplicate quotes**: Use conditional expression to prevent duplicates

### Graphic Generation Errors

- **Missing branding**: Fall back to defaults
- **Canvas processing errors**: Update quote status to 'failed'
- **S3 upload errors**: Retry once, then mark as failed
- **Font rendering errors**: Fall back to system fonts (sans-serif)

### API Errors

- **404 Not Found**: Quote or episode doesn't exist
- **400 Bad Request**: Invalid input data
- **403 Forbidden**: User doesn't have access to tenant
- **500 Internal Error**: Unexpected errors

## Testing Strategy

### Unit Tests

**Quote Tool**:
- Test quote validation
- Test DynamoDB key generation
- Test tenant isolation
- Test error handling

**Graphic Generator**:
- Test branding resolution logic
- Test @napi-rs/canvas image generation
- Test S3 upload
- Test status updates

**API Functions**:
- Test CRUD operations
- Test pagination
- Test authorization
- Test error responses

### Integration Tests

**End-to-End Quote Flow**:
1. Agent detects quote
2. Quote stored in DynamoDB
3. Graphic generated
4. Image uploaded to S3
5. Quote retrieved via API
6. Quote displayed in UI

**Branding Configuration**:
1. Update team branding
2. Generate quote graphic
3. Verify colors and font applied
4. Update user branding
5. Verify user branding overrides team

### Manual Testing

- Upload transcript and verify quotes detected
- Generate graphics with different branding
- Test quote CRUD operations in UI
- Verify image downloads work
- Test pagination with many quotes

## Performance Considerations

### @napi-rs/canvas Lambda Layer

- Use pre-built @napi-rs/canvas layer for Lambda
- Layer ARN: arn:aws:lambda:us-east-1:205979422636:layer:napi-rs-canvas:888
- Layer size: ~30 MB (lighter than Sharp)
- Cold start impact: +300ms
- Warm execution: <1 second per graphic
- Better font handling and custom font support

### Image Generation Optimization

- Generate images on-demand (not automatically)
- Cache generated images in S3
- Use presigned URLs with 1-hour expiration
- Lazy load thumbnails in UI

### Database Queries

- Use GSI for tenant-wide quote queries
- Implement pagination for large result sets
- Use projection expressions to limit data transfer
- Set TTL for automatic cleanup

## Security Considerations

### Tenant Isolation

- Always validate tenant context from authorizer
- Never trust tenantId from request body
- Use partition key prefix for tenant isolation
- Validate user has access to episode

### Input Validation

- Sanitize quote text for XSS
- Validate color hex codes
- Limit quote text length (280 characters)
- Escape XML in SVG generation

### S3 Security

- Use presigned URLs for downloads
- Set short expiration (1 hour)
- Block public access to bucket
- Use server-side encryption

## Deployment Considerations

### Lambda Layer

**@napi-rs/canvas Layer**:
- Use pre-built @napi-rs/canvas layer
- Layer ARN: `arn:aws:lambda:us-east-1:205979422636:layer:napi-rs-canvas:888`
- Compatible with Node.js 22.x and x86_64
- Lighter weight than Sharp with better font support
- No additional configuration needed

### Environment Variables

**Graphic Generator**:
- `TABLE_NAME`: DynamoDB table
- `BUCKET_NAME`: S3 bucket for images
- `DEFAULT_FONT`: Fallback font name

### IAM Permissions

**Quote Functions**:
- `dynamodb:GetItem`, `PutItem`, `UpdateItem`, `DeleteItem`, `Query`
- `s3:PutObject`, `GetObject`, `DeleteObject`
- `events:PutEvents` (for publishing EventBridge events)

**Graphic Generator**:
- `dynamodb:UpdateItem` (for updating quote status and s3Key)
- `s3:PutObject` (for uploading generated images)
- No EventBridge permissions needed (triggered by events)

## Monitoring and Observability

### CloudWatch Metrics

- Quote detection count per episode
- Graphic generation success/failure rate
- Average generation time
- S3 storage usage for quotes

### Logging

- Log quote detection events
- Log graphic generation start/complete
- Log branding resolution
- Log API operations

### Alarms

- High graphic generation failure rate
- Long generation times (>10 seconds)
- S3 upload failures
- DynamoDB throttling

## Future Enhancements

### Phase 2 Features

- Multiple graphic templates (square, vertical, horizontal)
- Custom background images
- Logo overlay support
- Animated quote graphics (GIF/MP4)
- Batch graphic generation
- Social media direct publishing

### Advanced Branding

- Multiple brand presets per team
- Brand guidelines enforcement
- Custom font uploads
- Gradient backgrounds
- Pattern overlays

### AI Improvements

- Sentiment-based quote selection
- Automatic quote categorization
- Quote clustering by topic
- Engagement prediction scoring

