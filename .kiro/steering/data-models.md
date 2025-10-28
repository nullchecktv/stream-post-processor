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

### Episode Entity

#### Primary Record
```json
{
  "pk": "123e4567-e89b-12d3-a456-426614174000",
  "sk": "metadata",
  "GSI1PK": "episodes",
  "GSI1SK": "2025-01-15T10:30:00Z#123e4567-e89b-12d3-a456-426614174000",
  "title": "Episode Title",
  "episodeNumber": 42,
  "summary": "Episode description",
  "airDate": "2025-01-15T10:30:00Z",
  "platforms": ["twitch", "youtube", "linkedin live"],
  "themes": ["technology", "programming"],
  "seriesName": "Tech Talk Series",
  "status": "draft|processing|published|archived",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

#### Access Patterns
- **Get episode by ID**: `pk = {episodeId}` AND `sk = metadata`
- **List episodes chronologically**: GSI1 query with `GSI1PK = episodes`
- **List episodes by date range**: GSI1 query with `GSI1PK = episodes` and `GSI1SK` between dates

### Transcript Entity

#### Transcript Metadata
```json
{
  "pk": "123e4567-e89b-12d3-a456-426614174000",
  "sk": "transcript#main",
  "s3Key": "123e4567-e89b-12d3-a456-426614174000/transcript.srt",
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
- **Get episode transcript**: `pk = {episodeId}` AND `sk = transcript#{type}`
- **List all transcripts for episode**: `pk = {episodeId}` AND `sk` begins with `transcript#`

### Video Track Entity

#### Track Metadata
```json
{
  "pk": "123e4567-e89b-12d3-a456-426614174000",
  "sk": "track#main",
  "s3Key": "123e4567-e89b-12d3-a456-426614174000/tracks/main.mp4",
  "trackName": "main",
  "filename": "main-camera-feed.mp4",
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
        "s3Key": "123e4567-e89b-12d3-a456-426614174000/chunks/main_chunk_001.mp4",
        "startTime": "00:00:00",
        "endTime": "00:02:00"
      }
    ]
  }
}
```

#### Access Patterns
- **Get track by name**: `pk = {episodeId}` AND `sk = track#{trackName}`
- **List all tracks for episode**: `pk = {episodeId}` AND `sk` begins with `track#`

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

#### Detected Clip
```json
{
  "pk": "123e4567-e89b-12d3-a456-426614174000",
  "sk": "clip#001",
  "GSI1PK": "clips",
  "GSI1SK": "2025-01-15T10:30:00Z#123e4567-e89b-12d3-a456-426614174000#001",
  "title": "Interesting Discussion Point",
  "description": "AI-generated description of the clip content",
  "startTime": "00:15:30",
  "endTime": "00:17:45",
  "duration": "00:02:15",
  "confidence": 0.85,
  "tags": ["discussion", "technical", "important"],
  "transcriptSegment": "This is the transcript text for this clip...",
  "status": "detected|reviewed|approved|rejected|published",
  "aiAnalysis": {
    "sentiment": "positive",
    "topics": ["technology", "innovation"],
    "keyPhrases": ["machine learning", "artificial intelligence"],
    "speakerCount": 2
  },
  "createdAt": "2025-01-15T10:40:00Z",
  "updatedAt": "2025-01-15T10:40:00Z"
}
```

#### Access Patterns
- **Get clip by ID**: `pk = {episodeId}` AND `sk = clip#{clipId}`
- **List clips for episode**: `pk = {episodeId}` AND `sk` begins with `clip#`
- **List all clips chronologically**: GSI1 query with `GSI1PK = clips`

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

  const result = await docClient.send(new GetCommand(params));
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

  const result = await docClient.send(new BatchGetCommand(params));
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
