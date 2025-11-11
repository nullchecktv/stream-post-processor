# Data Models and Schema Patterns

## Database Design Philosophy

**Keep data models simple and direct.**

This system uses **single-table design** in DynamoDB because it works well for our access patterns. All entities go in `NullCheckTable` with `pk`/`sk` keys and one GSI for chronological queries.

**Avoid:**
- Multiple tables when single-table works
- Complex normalization schemes
- Abstract data layer frameworks
- Generic entity base classes
- Over-engineered schema versioning

## Table Structure

### Primary Keys
- **Partition Key (pk)**: Entity type and identifier
- **Sort Key (sk)**: Entity subtype or relationship identifier
- **GSI1PK**: Alternative partition key for different access patterns
- **GSI1SK**: Alternative sort key for different access patterns

### Common Attributes
- **ttl**: Time-to-live for automatic cleanup (Unix timestamp)
- **createdAt**: ISO 8601 timestamp of creation
- **updatedAt**: ISO 8601 timestamp of last modification
- **version**: Optimistic locking version number (optional)

## Entity Models

### Team Entity

#### Team Metadata
```json
{
  "pk": "team#123e4567-e89b-12d3-a456-426614174000",
  "sk": "metadata",
  "name": "My Content Team",
  "description": "Team for podcast production",
  "ownerId": "user-uuid",
  "status": "active",
  "settings": {
    "defaultPlatforms": ["youtube", "twitch"],
    "timezone": "America/New_York"
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get team by ID**: `pk = team#{teamId}` AND `sk = metadata`
- **List user's teams**: GSI1 query with `GSI1PK = user#{userId}#teams`

### Team Membership Entity

#### Membership Record
```json
{
  "pk": "team#123e4567-e89b-12d3-a456-426614174000",
  "sk": "member#user-uuid",
  "GSI1PK": "user#user-uuid#teams",
  "GSI1SK": "2025-01-15T10:30:00Z#123e4567-e89b-12d3-a456-426614174000",
  "userId": "user-uuid",
  "teamId": "123e4567-e89b-12d3-a456-426614174000",
  "role": "owner|administrator|member",
  "status": "active|removed",
  "joinedAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get user's membership in team**: `pk = team#{teamId}` AND `sk = member#{userId}`
- **List team members**: `pk = team#{teamId}` AND `sk` begins with `member#`
- **List user's teams**: GSI1 query with `GSI1PK = user#{userId}#teams`

### User Profile Entity

#### User Metadata
```json
{
  "pk": "user#user-uuid",
  "sk": "profile",
  "email": "user@example.com",
  "name": "John Doe",
  "activeTeamId": "team-uuid",
  "preferences": {
    "timezone": "America/New_York",
    "notifications": true
  },
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get user profile**: `pk = user#{userId}` AND `sk = profile`

### Invitation Entity

#### Invitation Record
```json
{
  "pk": "team#123e4567-e89b-12d3-a456-426614174000",
  "sk": "invitation#user@example.com",
  "GSI1PK": "invitation#invitation-uuid",
  "GSI1SK": "2025-01-15T10:30:00Z",
  "invitationId": "invitation-uuid",
  "teamId": "123e4567-e89b-12d3-a456-426614174000",
  "email": "user@example.com",
  "role": "administrator|member",
  "status": "pending|accepted|declined|cancelled",
  "invitedBy": "inviter-user-uuid",
  "expiresAt": "2025-01-22T10:30:00Z",
  "ttl": 1642248000,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get invitation by email**: `pk = team#{teamId}` AND `sk = invitation#{email}`
- **Get invitation by ID**: GSI1 query with `GSI1PK = invitation#{invitationId}`
- **List team invitations**: `pk = team#{teamId}` AND `sk` begins with `invitation#`

### Notification Entity

#### Notification Record
```json
{
  "pk": "user#user-uuid",
  "sk": "notification#2025-01-15T10:30:00Z#notification-uuid",
  "GSI1PK": "user#user-uuid#notifications",
  "GSI1SK": "2025-01-15T10:30:00Z",
  "notificationId": "notification-uuid",
  "type": "team_invitation|clip_processed|member_added",
  "title": "New team invitation",
  "message": "You've been invited to join My Content Team",
  "isRead": false,
  "metadata": {
    "teamId": "team-uuid",
    "invitationId": "invitation-uuid"
  },
  "expiresAt": "2025-02-15T10:30:00Z",
  "ttl": 1644926400,
  "createdAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **List user notifications**: `pk = user#{userId}` AND `sk` begins with `notification#`
- **Get notification by ID**: `pk = user#{userId}` AND `sk = notification#{timestamp}#{notificationId}`
- **Query by read status**: GSI1 query with filters

### Episode Entity

#### Primary Record
```json
{
  "pk": "tenant123#123e4567-e89b-12d3-a456-426614174000",
  "sk": "metadata",
  "GSI1PK": "tenant123#episodes",
  "GSI1SK": "2025-01-15T10:30:00Z#123e4567-e89b-12d3-a456-426614174000",
  "episodeId": "123e4567-e89b-12d3-a456-426614174000",
  "tenantId": "tenant123",
  "title": "Episode Title",
  "episodeNumber": 42,
  "description": "Episode description",
  "airDate": "2025-01-15T10:30:00Z",
  "platforms": ["twitch", "youtube", "linkedin live"],
  "themes": ["technology", "programming"],
  "seriesName": "Tech Talk Series",
  "status": "draft|processing|published|archived",
  "statusHistory": [
    {
      "status": "draft",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get episode by ID**: `pk = {tenantId}#{episodeId}` AND `sk = metadata`
- **List tenant episodes**: GSI1 query with `GSI1PK = {tenantId}#episodes`
- **List episodes by date range**: GSI1 query with `GSI1PK = {tenantId}#episodes` and `GSI1SK` between dates

### Transcript Entity

#### Transcript Metadata
```json
{
  "pk": "tenant123#123e4567-e89b-12d3-a456-426614174000",
  "sk": "transcript#main",
  "s3Key": "tenant123/123e4567-e89b-12d3-a456-426614174000/transcript.srt",
  "filename": "meeting-transcript-2025-01-15.srt",
  "uploadedAt": "2025-01-15T10:35:00Z",
  "status": "uploaded|processing|processed|failed",
  "processingResults": {
    "clipsDetected": 3,
    "totalDuration": "01:45:30",
    "lastProcessedAt": "2025-01-15T10:40:00Z"
  }
}
```

#### Access Patterns
- **Get episode transcript**: `pk = {tenantId}#{episodeId}` AND `sk = transcript#{type}`
- **List all transcripts for episode**: `pk = {tenantId}#{episodeId}` AND `sk` begins with `transcript#`

### Video Track Entity

#### Track Metadata
```json
{
  "pk": "tenant123#123e4567-e89b-12d3-a456-426614174000",
  "sk": "data#track#main",
  "s3Key": "tenant123/123e4567-e89b-12d3-a456-426614174000/tracks/main.mp4",
  "trackName": "main",
  "filename": "main-camera-feed.mp4",
  "speaker": "host",
  "uploadedAt": "2025-01-15T10:45:00Z",
  "status": "uploading|uploaded|processing|processed|failed",
  "uploadMetadata": {
    "uploadId": "multipart-upload-id",
    "totalParts": 15,
    "completedParts": 15,
    "totalSize": 1073741824
  },
  "processingResults": {
    "duration": "01:45:30",
    "resolution": "1920x1080",
    "chunks": [
      {
        "chunkNumber": 1,
        "s3Key": "tenant123/123e4567-e89b-12d3-a456-426614174000/chunks/main_chunk_001.mp4",
        "startTime": "00:00:00",
        "endTime": "00:02:00"
      }
    ]
  }
}
```

#### Access Patterns
- **Get track by name**: `pk = {tenantId}#{episodeId}` AND `sk = data#track#{trackName}`
- **List all tracks for episode**: `pk = {tenantId}#{episodeId}` AND `sk` begins with `data#track#`

### Upload Session Entity

#### Multipart Upload Session
```json
{
  "pk": "upload#456e7890-e89b-12d3-a456-426614174001",
  "sk": "session",
  "episodeId": "123e4567-e89b-12d3-a456-426614174000",
  "trackName": "main",
  "uploadId": "aws-multipart-upload-id",
  "filename": "main-camera-feed.mp4",
  "status": "initiated|in_progress|completed|aborted",
  "expiresAt": "2025-01-15T12:00:00Z",
  "ttl": 1642248000,
  "parts": [
    {
      "partNumber": 1,
      "etag": "\"d41d8cd98f00b204e9800998ecf8427e\"",
      "size": 67108864
    }
  ],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Access Patterns
- **Get upload session**: `pk = upload#{uploadId}` AND `sk = session`
- **Cleanup expired sessions**: TTL-based automatic cleanup

### Clip Entity

#### Enhanced Clip with Processing Fields
```json
{
  "pk": "tenant123#123e4567-e89b-12d3-a456-426614174000",
  "sk": "data#clip#clip-uuid",
  "GSI1PK": "tenant123#clips",
  "GSI1SK": "2025-01-15T10:30:00Z#123e4567-e89b-12d3-a456-426614174000#clip-uuid",
  "clipId": "clip-uuid",
  "episodeId": "123e4567-e89b-12d3-a456-426614174000",
  "tenantId": "tenant123",
  "hook": "Interesting Discussion Point",
  "title": "AI-generated title",
  "clipType": "discussion|highlight|tutorial",
  "segments": [
    {
      "startTime": "00:15:30",
      "endTime": "00:17:45",
      "speaker": "host",
      "order": 1
    }
  ],
  "duration": 135,
  "status": "detected|processing|processed|failed|approved|rejected",
  "statusHistory": [
    {
      "status": "detected",
      "timestamp": "2025-01-15T10:40:00Z"
    },
    {
      "status": "processing",
      "timestamp": "2025-01-15T10:41:00Z",
      "segmentCount": 2
    }
  ],
  "s3Key": "tenant123/123e4567-e89b-12d3-a456-426614174000/clips/clip-uuid.mp4",
  "processingStartedAt": "2025-01-15T10:41:00Z",
  "processingCompletedAt": "2025-01-15T10:42:15Z",
  "createdAt": "2025-01-15T10:40:00Z",
  "updatedAt": "2025-01-15T10:42:15Z"
}
```

#### Status Values
- **detected**: Initial state when AI detects a potential clip
- **processing**: Clip is currently being processed (segment extraction/stitching)
- **processed**: Successfully processed and video file is available
- **failed**: Processing failed due to technical issues
- **approved**: User approved clip for publication
- **rejected**: User rejected clip

#### Access Patterns
- **Get clip by ID**: `pk = {tenantId}#{episodeId}` AND `sk = data#clip#{clipId}`
- **List clips for episode**: `pk = {tenantId}#{episodeId}` AND `sk` begins with `data#clip#`
- **List tenant clips**: GSI1 query with `GSI1PK = {tenantId}#clips`

### Segment Entity

#### Segment Record
```json
{
  "pk": "tenant123#123e4567-e89b-12d3-a456-426614174000",
  "sk": "segment#clip-uuid#1",
  "clipId": "clip-uuid",
  "order": 1,
  "startTime": "00:15:30",
  "endTime": "00:17:45",
  "speaker": "host",
  "status": "processing|completed|failed",
  "s3Key": "tenant123/123e4567-e89b-12d3-a456-426614174000/segments/clip-uuid-1.mp4",
  "duration": 135,
  "createdAt": "2025-01-15T10:41:00Z",
  "updatedAt": "2025-01-15T10:41:30Z"
}
```

#### Access Patterns
- **Get segment**: `pk = {tenantId}#{episodeId}` AND `sk = segment#{clipId}#{order}`
- **List clip segments**: `pk = {tenantId}#{episodeId}` AND `sk` begins with `segment#{clipId}#`

### Agent Memory Entity

#### Memory Context
```json
{
  "pk": "memory#session-123",
  "sk": "context#transcription",
  "namespace": "session-123-transcription",
  "memoryType": "summary|semantic",
  "content": {
    "summary": "This episode covered topics about...",
    "keyTopics": ["AI", "machine learning", "automation"],
    "participants": ["host", "guest1"],
    "duration": "01:45:30"
  },
  "bedrockMemoryId": "bedrock-memory-id",
  "expiresAt": "2025-04-15T10:30:00Z",
  "ttl": 1650024600,
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Access Patterns
- **Get memory context**: `pk = memory#{sessionId}` AND `sk = context#{type}`
- **List contexts for session**: `pk = memory#{sessionId}` AND `sk` begins with `context#`

## Data Validation Patterns

### Zod Schemas

#### Episode Schema
```javascript
import { z } from 'zod';

export const EpisodeSchema = z.object({
  title: z.string().min(1).max(200),
  episodeNumber: z.number().int().positive(),
  summary: z.string().max(1000).optional(),
  airDate: z.string().datetime().optional(),
  platforms: z.array(z.enum(['linkedin live', 'X', 'twitch', 'youtube'])).optional(),
  themes: z.array(z.string()).optional(),
  seriesName: z.string().max(100).optional()
});
```

#### Upload Request Schema
```javascript
export const UploadRequestSchema = z.object({
  filename: z.string().min(1).max(255),
  trackName: z.string().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/).optional()
});
```

### Validation Helpers
Keep validation simple and direct:
```javascript
export const validateEpisode = (data) => {
  try {
    return EpisodeSchema.parse(data);
  } catch (error) {
    throw new ValidationError('Invalid episode data', error.errors);
  }
};
```

**Avoid:**
- Complex validation frameworks with custom rules engines
- Abstract validator base classes
- Validation middleware chains
- Generic validation decorators or annotations

## Key Generation Patterns

### Episode ID
```javascript
import { randomUUID } from 'crypto';

export const generateEpisodeId = () => randomUUID();
```

### Composite Keys
```javascript
export const createEpisodeKey = (episodeId) => ({
  pk: episodeId,
  sk: 'metadata'
});

export const createTranscriptKey = (episodeId, type = 'main') => ({
  pk: episodeId,
  sk: `transcript#${type}`
});
```

### GSI Keys
```javascript
export const createEpisodeGSIKey = (airDate, episodeId) => ({
  GSI1PK: 'episodes',
  GSI1SK: `${airDate}#${episodeId}`
});
```

## Query Patterns

### Single Item Queries
```javascript
const getEpisode = async (episodeId) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      pk: episodeId,
      sk: 'metadata'
    }
  };

  const result = await docClient.send(new GetItemCommand(params));
  return result.Item;
};
```

### List Queries with GSI
```javascript
const listEpisodes = async (cursor, limit = 20) => {
  const params = {
    TableName: TABLE_NAME,
    IndexName: 'GSI1',
    KeyConditionExpression: 'GSI1PK = :pk',
    ExpressionAttributeValues: {
      ':pk': 'episodes'
    },
    ScanIndexForward: false, // Most recent first
    Limit: limit
  };

  if (cursor) {
    params.ExclusiveStartKey = decodeCursor(cursor);
  }

  const result = await docClient.send(new QueryCommand(params));
  return {
    items: result.Items,
    nextCursor: result.LastEvaluatedKey ? encodeCursor(result.LastEvaluatedKey) : null
  };
};
```

### Batch Operations
```javascript
const batchGetItems = async (keys) => {
  const params = {
    RequestItems: {
      [TABLE_NAME]: {
        Keys: keys
      }
    }
  };

  const result = await docClient.send(new BatchGetItemCommand(params));
  return result.Responses[TABLE_NAME];
};
```

## Data Consistency Patterns

### Optimistic Locking
```javascript
const updateEpisodeWithVersion = async (episodeId, updates, currentVersion) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      pk: episodeId,
      sk: 'metadata'
    },
    UpdateExpression: 'SET #title = :title, #version = :newVersion, #updatedAt = :updatedAt',
    ConditionExpression: '#version = :currentVersion',
    ExpressionAttributeNames: {
      '#title': 'title',
      '#version': 'version',
      '#updatedAt': 'updatedAt'
    },
    ExpressionAttributeValues: {
      ':title': updates.title,
      ':currentVersion': currentVersion,
      ':newVersion': currentVersion + 1,
      ':updatedAt': new Date().toISOString()
    }
  };

  await docClient.send(new UpdateCommand(params));
};
```

### Transactional Operations
```javascript
const createEpisodeWithTranscript = async (episode, transcript) => {
  const params = {
    TransactItems: [
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: episode.id,
            sk: 'metadata',
            ...episode
          },
          ConditionExpression: 'attribute_not_exists(pk)'
        }
      },
      {
        Put: {
          TableName: TABLE_NAME,
          Item: {
            pk: episode.id,
            sk: 'transcript#main',
            ...transcript
          }
        }
      }
    ]
  };

  await docClient.send(new TransactWriteCommand(params));
};
```
