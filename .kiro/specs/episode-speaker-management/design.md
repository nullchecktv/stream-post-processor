# Design Document

## Overview

This design elevates speaker management from the track level to the episode level, establishing episodes as the single source of truth for speaker information. The solution introduces episode-level speaker arrays, validation services to ensure referential integrity, and an AI-powered speaker matching system using Amazon Nova Lite to normalize speaker names from transcripts. All entities (tracks, segments, quotes) will reference speakers from the episode's canonical list.

## Architecture

### High-Level Flow
```
1. Episode Creation → Define speakers array
2. Episode Update → Modify speakers list
3. Track Upload → Validate speakers against episode list
4. Transcript Upload → Extract speakers, AI matching, suggest additions
5. Clip Creation → Validate segment speakers against episode list
6. Quote Creation → Validate quote speaker against episode list
```

### Component Interactions
- **Episode Management**: Stores and manages canonical speaker list
- **Speaker Utilities** (`functions/utils/speakers.mjs`): Single utility with validation, extraction, and matching
- **Track/Clip/Quote Management**: Uses speaker utilities for validation
- **Transcript Processing**: Uses speaker utilities for extraction and matching

## Components and Interfaces

### 1. Enhanced Episode Data Model

#### Episode Entity Schema (Updated)
```json
{
  "pk": "team123#episodeId",
  "sk": "metadata",
  "GSI1PK": "team123#episodes",
  "GSI1SK": "2025-01-15T10:30:00Z#episodeId",
  "episodeId": "episodeId",
  "tenantId": "team123",
  "title": "Episode Title",
  "episodeNumber": 42,
  "speakers": ["Alice Johnson", "Bob Smith", "Charlie Davis"],
  "status": "Draft",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Key Changes
- **speakers**: New array field at episode level containing canonical speaker names
- **Uniqueness**: Speaker names are deduplicated and normalized
- **Validation**: Non-empty strings, trimmed whitespace
- **Default**: Empty array when not provided

### 2. Episode API Enhancements

#### Updated: `POST /episodes`

**Request Schema:**
```json
{
  "title": "Episode Title",
  "episodeNumber": 42,
  "speakers": ["Alice Johnson", "Bob Smith"],
  "airDate": "2025-01-15T10:30:00Z",
  "platforms": ["youtube", "twitch"]
}
```

#### Updated: `PUT /episodes/{episodeId}`

**Request Schema:**
```json
{
  "speakers": ["Alice Johnson", "Bob Smith", "Charlie Davis"]
}
```

**Response includes speakers:**
```json
{
  "episodeId": "uuid",
  "title": "Episode Title",
  "speakers": ["Alice Johnson", "Bob Smith", "Charlie Davis"],
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

### 3. Speaker Utilities

All speaker-related functionality in a single utility file.

**Function**: `functions/utils/speakers.mjs`

#### Speaker Validation
```javascript
export const validateSpeakers = async (episodeId, tenantId, speakersToValidate) => {
  const episode = await getEpisode(episodeId, tenantId);
  if (!episode) {
    throw new Error('Episode not found');
  }

  const episodeSpeakers = episode.speakers || [];
  const normalizedInput = speakersToValidate.map(s => s.trim());

  const invalidSpeakers = normalizedInput.filter(speaker =>
    !episodeSpeakers.some(es => es.toLowerCase() === speaker.toLowerCase())
  );

  if (invalidSpeakers.length > 0) {
    return {
      valid: false,
      invalidSpeakers,
      validSpeakers: episodeSpeakers
    };
  }

  const normalizedSpeakers = normalizedInput.map(speaker => {
    const match = episodeSpeakers.find(es => es.toLowerCase() === speaker.toLowerCase());
    return match || speaker;
  });

  return { valid: true, normalizedSpeakers };
};
```

#### Speaker Extraction and Matching (Combined)
```javascript
export const extractAndMatchSpeakers = async (s3Key, episodeSpeakers = []) => {
  // Download first 3K characters from S3
  const response = await s3.send(new GetObjectCommand({
    Bucket: process.env.BUCKET_NAME,
    Key: s3Key,
    Range: 'bytes=0-3000'
  }));

  const transcriptSample = await response.Body.transformToString();

  // Use LLM to extract speakers AND match them in one call
  const systemPrompt = `You are a transcript speaker analysis assistant. Analyze the transcript sample and:
1. Identify all unique speakers in the transcript
2. If episode speakers are provided, match transcript speakers to them

Rules:
- Extract actual speaker names, not labels like "Speaker 1"
- Ignore mentions of people in dialogue - only extract actual speakers
- Match speakers even if spelling, capitalization, or formatting differs
- Handle nicknames and variations (e.g., "Bob" matches "Robert Smith")
- Provide confidence scores for matches (high, medium, low)

Respond with JSON only:
{
  "speakers": ["Alice Johnson", "Bob Smith"],
  "matches": [
    {"transcriptName": "alice", "episodeName": "Alice Johnson", "confidence": "high"}
  ],
  "unmatched": ["Charlie"]
}`;

  const userPrompt = episodeSpeakers.length > 0
    ? `Transcript sample:\n${transcriptSample}\n\nEpisode speakers: ${JSON.stringify(episodeSpeakers)}\n\nExtract speakers and match them.`
    : `Transcript sample:\n${transcriptSample}\n\nExtract all speakers.`;

  const result = await bedrock.send(new ConverseCommand({
    modelId: 'amazon.nova-lite-v1:0',
    messages: [{ role: 'user', content: [{ text: userPrompt }] }],
    system: [{ text: systemPrompt }],
    inferenceConfig: { temperature: 0.1, maxTokens: 1000 }
  }));

  try {
    const parsed = JSON.parse(result.output.message.content[0].text);
    return {
      speakers: parsed.speakers || [],
      matches: parsed.matches || [],
      unmatched: parsed.unmatched || []
    };
  } catch (error) {
    console.error('Failed to parse speaker analysis:', error);
    return { speakers: [], matches: [], unmatched: [] };
  }
};
```

### 4. Enhanced Track Management

#### Updated Track Creation Validation

**Modified: `POST /episodes/{episodeId}/tracks`**

```javascript
// In create-track-upload.s
export const handler = async (event) => {
  const { episodeId } = event.pathParameters;
  const { tenantId } = event.requestContext.authorizer;
  const { filename, trackName, speakers = [] } = JSON.parse(event.body);

  // Validate speakers against episode
  if (speakers.length > 0) {
    const validation = await validateSpeakers(episodeId, tenantId, speakers);

    if (!validation.valid) {
      return formatResponse(400, {
        error: 'InvalidSpeakers',
        message: 'Track speakers must exist in episode speaker list',
        invalidSpeakers: validation.invalidSpeakers,
        validSpeakers: validation.validSpeakers
      });
    }

    // Use normalized speakers
    speakers = validation.normalizedSpeakers;
  }

  // Continue with track creation...
};
```

#### Updated Track Update Validation

**Modified: `PUT /episodes/{episodeId}/tracks/{trackName}`**

Same validation logic applied to track updates.

### 4. Transcript Upload Integration

**Modified: `POST /episodes/{episodeId}/transcripts`**

```javascript
export const handler = async (event) => {
  // After transcript upload to S3...

  const episode = await getEpisode(episodeId, tenantId);
  const episodeSpeakers = episode.speakers || [];

  // Extract speakers and match them in one AI call
  const analysis = await extractAndMatchSpeakers(s3Key, episodeSpeakers);

  if (analysis.speakers.length === 0) {
    return formatResponse(201, { key, uploadUrl });
  }

  return formatResponse(201, {
    key,
    uploadUrl,
    speakerAnalysis: {
      speakers: analysis.speakers,
      matches: analysis.matches,
      unmatched: analysis.unmatched,
      suggestion: analysis.unmatched.length > 0
        ? `Consider adding these speakers to the episode: ${analysis.unmatched.join(', ')}`
        : null
    }
  });
};
```

### 7. Enhanced Clip Segment Validation

#### Updated Segment Schema

**Modified: `functions/tools/create-clips.mjs`**

```javascript
const segmentSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  speaker: z.string().min(1),
  notes: z.string().optional()
});

// In handler
export const handler = async (tenantId, input) => {
  const { episodeId, segments } = input;

  // Validate all segment speakers against episode
  const allSpeakers = [...new Set(segments.map(s => s.speaker))];
  const validation = await validateSpeakers(episodeId, tenantId, allSpeakers);

  if (!validation.valid) {
    return {
      error: 'InvalidSpeakers',
      message: 'Segment speakers must exist in episode speaker list',
      invalidSpeakers: validation.invalidSpeakers,
      validSpeakers: validation.validSpeakers
    };
  }

  // Normalize speakers in segments
  const normalizedSegments = segments.map(segment => ({
    ...segment,
    speaker: validation.normalizedSpeakers.find(ns =>
      ns.toLowerCase() === segment.speaker.toLowerCase()
    ) || segment.speaker
  }));

  // Continue with clip creation...
};
```

### 8. Enhanced Quote Validation

#### Updated Quote Creation

**Modified: `functions/quotes/create-quote.mjs`**

```javascript
export const handler = async (event) => {
  const { episodeId } = event.pathParameters;
  const { tenantId } = event.requestContext.authorizer;
  const { text, speaker, timestamp } = JSON.parse(event.body);

  // Validate speaker if provided
  if (speaker) {
    const validation = await validateSpeakers(episodeId, tenantId, [speaker]);

    if (!validation.valid) {
      return formatResponse(400, {
        error: 'InvalidSpeaker',
        message: 'Quote speaker must exist in episode speaker list',
        invalidSpeakers: validation.invalidSpeakers,
        validSpeakers: validation.validSpeakers
      });
    }

    // Use normalized speaker
    speaker = validation.normalizedSpeakers[0];
  }

  // Continue with quote creation...
};
```

**Modified: `functions/tools/create-quotes.mjs`**

Same validation logic for AI-generated quotes.

## Data Models

### Episode Schema (Enhanced)
```javascript
import { z } from 'zod';

export const EpisodeCreateSchema = z.object({
  title: z.string().min(1).max(200),
  episodeNumber: z.number().int().positive(),
  description: z.string().max(1000).optional(),
  airDate: z.string().datetime().optional(),
  platforms: z.array(Platform).optional(),
  themes: z.array(z.string()).optional(),
  seriesName: z.string().max(100).optional(),
  speakers: z.array(z.string().min(1).max(100)).optional()
});

export const EpisodeUpdateSchema = EpisodeCreateSchema.partial();
```

### Speaker Validation Response
```javascript
const SpeakerValidationResult = z.object({
  valid: z.boolean(),
  normalizedSpeakers: z.array(z.string()).optional(),
  invalidSpeakers: z.array(z.string()).optional(),
  validSpeakers: z.array(z.string()).optional()
});
```

### Speaker Matching Response
```javascript
const SpeakerMatchResult = z.object({
  matches: z.array(z.object({
    transcriptName: z.string(),
    episodeName: z.string(),
    confidence: z.enum(['high', 'medium', 'low'])
  })),
  unmatched: z.array(z.string())
});
```

## Error Handling

### Validation Errors
```json
{
  "error": "InvalidSpeakers",
  "message": "Track speakers must exist in episode speaker list",
  "invalidSpeakers": ["Bobby", "Chuck"],
  "validSpeakers": ["Alice Johnson", "Bob Smith", "Charlie Davis"]
}
```

### AI Matching Errors
- **Bedrock Failures**: Log error, return empty match result
- **Invalid JSON**: Parse error handling with fallback
- **Timeout**: Retry once, then return unmatched speakers

### Episode Not Found
```json
{
  "error": "NotFound",
  "message": "Episode with ID 'abc123' was not found"
}
```

## Testing Strategy

### Unit Tests

#### Episode Management
- Test episode creation with speakers array
- Test episode update with speaker modifications
- Test speaker deduplication and normalization
- Test empty speakers array handling

#### Speaker Validation Service
- Test validation with valid speakers
- Test validation with invalid speakers
- Test case-insensitive matching
- Test empty speaker arrays
- Test episode not found scenarios

#### Speaker Matching Agent
- Test AI matching with exact matches
- Test matching with variations (nicknames, capitalization)
- Test unmatched speaker identification
- Test empty transcript speakers
- Test Bedrock error handling

#### Track/Quote/Segment Validation
- Test creation with valid speakers
- Test creation with invalid speakers
- Test error message formatting
- Test speaker normalization

### Integration Tests

#### End-to-End Workflows
- Test complete episode creation with speakers
- Test track upload with speaker validation
- Test transcript upload with AI matching
- Test clip creation with segment speaker validation
- Test quote creation with speaker validation

#### API Endpoint Tests
- Test all enhanced endpoints with various payloads
- Test error responses for validation failures
- Test CORS and authentication

## Migration Strategy

### Backward Compatibility
- **Existing Episodes**: Add empty speakers array to existing episodes
- **Existing Tracks**: Tracks with speakers not in episode list remain valid initially
- **Gradual Migration**: Users can add speakers to episodes over time

### Deployment Approach
1. **Phase 1**: Deploy episode schema changes (speakers optional)
2. **Phase 2**: Deploy speaker validation service
3. **Phase 3**: Deploy AI matching for transcripts
4. **Phase 4**: Enable validation for tracks, clips, quotes

### Data Migration Script
```javascript
// Optional migration to populate speakers from existing tracks
const migrateEpisodeSpeakers = async () => {
  // For each episode:
  // 1. Query all tracks
  // 2. Collect unique speakers from tracks
  // 3. Update episode with speakers array
};
```

## Security Considerations

### Input Validation
- **Speaker Names**: Sanitize, validate length, prevent injection
- **Array Limits**: Maximum 50 speakers per episode
- **AI Input**: Sanitize before sending to Bedrock

### Access Control
- **Episode Updates**: Same permissions as episode creation
- **Speaker Data**: No PII in speaker names
- **AI Calls**: Rate limiting on Bedrock invocations

## Performance Optimization

### Caching Strategy
- **Episode Speakers**: Cache during batch validation operations
- **Validation Results**: Cache validation results per request
- **AI Matching**: Cache matching results for identical inputs

### DynamoDB Optimization
- **Single Query**: Fetch episode once per validation batch
- **Batch Operations**: Validate multiple entities together
- **Efficient Queries**: Use existing access patterns

### AI Performance
- **Model Selection**: Nova Lite for fast, cost-effective matching
- **Batch Processing**: Match multiple speakers in single call
- **Timeout**: 5-second timeout for AI calls
- **Fallback**: Return unmatched on timeout

## Monitoring and Observability

### CloudWatch Metrics
- **Validation Failures**: Count of speaker validation failures
- **AI Matching Success**: Percentage of successful matches
- **AI Latency**: Response time for speaker matching
- **Unmatched Speakers**: Frequency of unmatched speakers

### Logging
- **Validation Errors**: Log invalid speakers with context
- **AI Calls**: Log input/output for debugging
- **Performance**: Log validation and matching duration

