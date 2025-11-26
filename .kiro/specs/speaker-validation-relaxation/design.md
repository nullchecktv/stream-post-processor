# Design Document

## Overview

This design removes strict speaker validation from content creation workflows and implements intelligent speakeratching during video processing. The current system fails silently when AI-generated speaker names don't exactly match episode speakers. By moving validation to the processing phase with LLM-based fuzzy matching and fallbacks, we create a more resilient system that handles speaker name variations gracefully.

## Architecture

### Current Flow (Problematic)
```
AI Agent → createClip tool → validateSpeakers (STRICT) → ❌ Silent Failure
                                                        ↓
                                                   Clip NOT Created
```

### New Flow (Resilient)
```
AI Agent → createClip tool → ✅ Clip Created (any speaker name)
                                    ↓
                              Stored in DynamoDB
                                    ↓
                         User Approves Clip
                                    ↓
                         Step Functions Workflow
                                    ↓
                         Segment Extractor
                                    ↓
                    LLM Speaker Matching (fuzzy)
                                    ↓
                    ┌───────────────┴───────────────┐
                    ↓                               ↓
            Exact/Fuzzy Match                  No Match
                    ↓                               ↓
            Use Matched Track              Use 'main' Track
                    ↓                               ↓
                    └───────────────┬───────────────┘
                                    ↓
                         ✅ Clip Generated
```

## Components and Interfaces

### 1. Tool Handlers (Simplified)

#### createClip Tool
**Changes:**
- Remove `validateSpeakers` import and call
- Remove speaker validation logic
- Remove speaker normalization mapping
- Accept any speaker name in segments
- Store clips with original speaker names as provided by AI

**Interface:**
```javascript
// Input (unchanged)
{
  episodeId: string,
  clips: [{
    segments: [{
      speaker: string,  // Now accepts ANY value
      startTime: string,
      endTime: string,
      transcript: string,
      order: number
    }],
    title: string,
    summary: string,
    // ...
  }]
}

// Output (unchanged)
"N clips added for episode {episodeId}"
```

#### createQuote Tool
**Changes:**
- Remove `validateSpeakers` import and call
- Remove speaker validation logic
- Accept any speaker name
- Store quotes with original speaker names

### 2. API Endpoints (Validation Removed)

#### POST /episodes/{episodeId}/quotes
**Changes:**
- Remove `validateSpeakers` call
- Remove `formatSpeakerValidationError` usage
- Accept any speaker name in request body

#### PUT /episodes/{episodeId}/quotes/{quoteId}
**Changes:**
- Remove `validateSpeakers` call
- Remove `formatSpeakerValidationError` usage
- Allow updating to any speaker name

#### POST /episodes/{episodeId}/tracks
**Changes:**
- Remove `validateSpeakers` call
- Remove `formatSpeakerValidationError` usage
- Accept any speaker names in track metadata

#### PUT /episodes/{episodeId}/tracks/{trackName}
**Changes:**
- Remove `validateSpeakers` call
- Remove `formatSpeakerValidationError` usage
- Allow updating to any speaker names

### 3. Segment Extractor (Enhanced)

**Current Behavior:**
```javascript
// Simple track selection with basic fallback
if (segment.speaker) {
  const speakerTrack = await selectTrackForSpeaker(episodeId, segment.speaker, tenantId);
  if (speakerTrack) {
    useTrackName = speakerTrack.trackName;
  }
}
```

**New Behavior:**
```javascript
// Intelligent track selection with LLM matching
const trackSelection = await selectTrackForSegment(
  episodeId,
  segment,
  tenantId,
  {
    enableLLMMatching: true,
    fallbackTrack: 'main',
    confidenceThreshold: 0.7
  }
);

useTrackName = trackSelection.trackName;

// Log the selection for debugging
logger.info('Track selected for segment', {
  originalSpeaker: segment.speaker,
  selectedTrack: trackSelection.trackName,
  matchType: trackSelection.matchType, // 'exact', 'fuzzy', 'fallback'
  confidence: trackSelection.confidence,
  episodeId,
  clipId
});
```

### 4. Track Selection Utility (Enhanced)

**New Function: `selectTrackForSegment`**

```javascript
/**
 * Select the best track for a segment with intelligent matching
 * @param {string} episodeId - Episode ID
 * @param {object} segment - Segment with speaker information
 * @param {string} tenantId - Tenant ID
 * @param {object} options - Selection options
 * @returns {Promise<object>} Track selection result
 */
export const selectTrackForSegment = async (
  episodeId,
  segment,
  tenantId,
  options = {}
) => {
  const {
    enableLLMMatching = true,
    fallbackTrack = 'main',
    confidenceThreshold = 0.7
  } = options;

  // If no speaker specified, use fallback
  if (!segment.speaker) {
    return {
      trackName: fallbackTrack,
      matchType: 'fallback',
      reason: 'no_speaker_specified',
      confidence: 1.0
    };
  }

  // Get all tracks for the episode
  const tracks = await getEpisodeTracks(episodeId, tenantId);

  if (!tracks || tracks.length === 0) {
    return {
      trackName: fallbackTrack,
      matchType: 'fallback',
      reason: 'no_tracks_available',
      confidence: 1.0
    };
  }

  // Try exact match first (case-insensitive)
  const exactMatch = tracks.find(track =>
    track.speaker &&
    track.speaker.toLowerCase() === segment.speaker.toLowerCase()
  );

  if (exactMatch) {
    return {
      trackName: exactMatch.trackName,
      matchType: 'exact',
      originalSpeaker: segment.speaker,
      matchedSpeaker: exactMatch.speaker,
      confidence: 1.0
    };
  }

  // Try LLM-based fuzzy matching if enabled
  if (enableLLMMatching) {
    try {
      const trackSpeakers = tracks
        .filter(t => t.speaker)
        .map(t => ({ trackName: t.trackName, speaker: t.speaker }));

      const matchResult = await matchSpeakerToTrack(
        segment.speaker,
        trackSpeakers
      );

      if (matchResult.matched && matchResult.confidence >= confidenceThreshold) {
        return {
          trackName: matchResult.trackName,
          matchType: 'fuzzy',
          originalSpeaker: segment.speaker,
          matchedSpeaker: matchResult.matchedSpeaker,
          confidence: matchResult.confidence
        };
      }
    } catch (error) {
      logger.warn('LLM matching failed, using fallback', {
        error: error.message,
        speaker: segment.speaker,
        episodeId
      });
    }
  }

  // Fallback to default track
  return {
    trackName: fallbackTrack,
    matchType: 'fallback',
    reason: 'no_match_found',
    originalSpeaker: segment.speaker,
    confidence: 0.0
  };
};
```

**New Function: `matchSpeakerToTrack`**

```javascript
/**
 * Use LLM to match a speaker name to available tracks
 * @param {string} speakerName - Speaker name from segment
 * @param {Array} trackSpeakers - Available tracks with speakers
 * @returns {Promise<object>} Match result
 */
const matchSpeakerToTrack = async (speakerName, trackSpeakers) => {
  const systemPrompt = `You are a speaker matching assistant. Match a speaker name to the best available track.

Rules:
- Match even with spelling variations, nicknames, or abbreviations
- Consider "Bob" matches "Robert", "Dr. Smith" matches "John Smith", etc.
- Return the track name and confidence score
- Confidence: 1.0 = exact, 0.9 = very likely, 0.7 = probable, 0.5 = possible
- If no good match exists, return matched: false

Respond with JSON only:
{
  "matched": true,
  "trackName": "guest",
  "matchedSpeaker": "Robert Smith",
  "confidence": 0.9,
  "reasoning": "Bob is a common nickname for Robert"
}`;

  const userPrompt = `Speaker to match: "${speakerName}"

Available tracks:
${trackSpeakers.map(t => `- Track "${t.trackName}": ${t.speaker}`).join('\n')}

Find the best match. Return only valid JSON.`;

  const response = await bedrock.send(new ConverseCommand({
    modelId: 'amazon.nova-lite-v1:0',
    messages: [{
      role: 'user',
      content: [{ text: userPrompt }]
    }],
    system: [{ text: systemPrompt }],
    inferenceConfig: {
      temperature: 0.1,
      maxTokens: 500
    }
  }));

  const result = JSON.parse(response.output.message.content[0].text);

  return {
    matched: result.matched || false,
    trackName: result.trackName || null,
    matchedSpeaker: result.matchedSpeaker || null,
    confidence: result.confidence || 0.0,
    reasoning: result.reasoning || ''
  };
};
```

**New Function: `getEpisodeTracks`**

```javascript
/**
 * Get all tracks for an episode
 * @param {string} episodeId - Episode ID
 * @param {string} tenantId - Tenant ID
 * @returns {Promise<Array>} List of tracks
 */
const getEpisodeTracks = async (episodeId, tenantId) => {
  const result = await ddb.send(new QueryCommand({
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
    ExpressionAttributeValues: marshall({
      ':pk': `${tenantId}#${episodeId}`,
      ':sk': 'data#track#'
    })
  }));

  if (!result.Items || result.Items.length === 0) {
    return [];
  }

  return result.Items.map(item => {
    const track = unmarshall(item);
    return {
      trackName: track.trackName,
      speaker: track.speaker || null,
      status: track.status
    };
  }).filter(track => track.status === 'Processed');
};
```

## Data Models

### Clip Record (Unchanged)
```javascript
{
  pk: "tenant123#episode-id",
  sk: "data#clip#clip-id",
  segments: [
    {
      speaker: "Bob",  // Now accepts ANY value
      startTime: "00:15:30",
      endTime: "00:17:45",
      transcript: "...",
      order: 1
    }
  ],
  // ... other fields
}
```

### Track Selection Metadata (New)
```javascript
// Added to Step Functions execution metadata
{
  trackSelections: [
    {
      segmentOrder: 1,
      originalSpeaker: "Bob",
      selectedTrack: "guest",
      matchType: "fuzzy",
      matchedSpeaker: "Robert Smith",
      confidence: 0.9,
      reasoning: "Bob is a common nickname for Robert"
    },
    {
      segmentOrder: 2,
      originalSpeaker: "Unknown Speaker",
      selectedTrack: "main",
      matchType: "fallback",
      reason: "no_match_found",
      confidence: 0.0
    }
  ]
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Clip creation accepts any speaker name
*For any* clip creation request with speaker names, the system should successfully create the clip without validating speakers against the episode speaker list
**Validates: Requirements 1.1, 1.2, 1.3**

### Property 2: Track selection always returns a valid track
*For any* segment with a speaker name, the track selection function should return a valid track name (either matched or fallback), never null or undefined
**Validates: Requirements 2.3, 2.4, 2.5**

### Property 3: Exact matches take precedence over fuzzy matches
*For any* segment where an exact speaker match exists, the system should use the exact match rather than attempting fuzzy matching
**Validates: Requirements 2.1, 2.2**

### Property 4: Fallback track is used when matching fails
*For any* segment where speaker matching fails or times out, the system should use the fallback track without failing the clip generation
**Validates: Requirements 2.4, 2.5**

### Property 5: Quote creation accepts any speaker name
*For any* quote creation request with a speaker name, the system should successfully create the quote without validating the speaker against the episode speaker list
**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: API endpoints accept any speaker names
*For any* API request to create or update quotes/tracks with speaker names, the system should accept the request without speaker validation
**Validates: Requirements 5.1, 5.2, 5.3, 5.4**

### Property 7: Track selection logs all decisions
*For any* track selection operation, the system should log the original speaker, selected track, match type, and confidence level
**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 8: Batch clip creation succeeds regardless of speakers
*For any* batch of clips with various speaker names, the system should create all clips successfully without failing due to speaker validation
**Validates: Requirements 1.4**

## Error Handling

### LLM Matching Failures
- **Timeout**: Fall back to default track after 5 seconds
- **Invalid JSON**: Log error and fall back to default track
- **Service unavailable**: Fall back to default track
- **No tracks available**: Use 'main' as fallback

### Track Selection Errors
- **Episode not found**: Throw error (legitimate failure)
- **No tracks exist**: Use 'main' as fallback
- **Track query fails**: Use 'main' as fallback
- **Invalid segment data**: Log warning and use 'main'

### Logging Strategy
- **INFO**: Successful matches (exact and fuzzy)
- **WARN**: Fallback usage, LLM failures
- **ERROR**: Legitimate errors (episode not found, invalid data)

## Testing Strategy

### Unit Tests
- Test `selectTrackForSegment` with various speaker names
- Test exact matching (case-insensitive)
- Test fallback behavior when no tracks exist
- Test fallback behavior when LLM matching fails
- Test `getEpisodeTracks` query logic
- Test clip creation without validation
- Test quote creation without validation

### Integration Tests
- Test full clip generation workflow with speaker variations
- Test segment extraction with fuzzy matching
- Test LLM matching with real Bedrock calls
- Test fallback behavior in Step Functions workflow
- Test logging of track selections

### Manual Testing
- Create clips with speaker variations ("Bob" vs "Robert")
- Verify correct tracks are selected
- Verify fallback to 'main' when no match
- Verify clips generate successfully
- Review CloudWatch logs for track selection decisions

## Performance Considerations

### LLM Matching Overhead
- **Latency**: ~500ms per LLM call
- **Optimization**: Cache matching results per episode
- **Fallback**: 5-second timeout to prevent blocking

### DynamoDB Queries
- **Track lookup**: Single query per episode (cached in Lambda)
- **Pattern**: Query with begins_with on sk
- **Cost**: Minimal (typically <10 tracks per episode)

### Step Functions Impact
- **Additional time**: ~500ms per segment for LLM matching
- **Mitigation**: Parallel segment processing already in place
- **Acceptable**: Small overhead for improved reliability

## Migration Strategy

### Phase 1: Remove Validation (Immediate)
1. Remove `validateSpeakers` calls from tool handlers
2. Remove validation from API endpoints
3. Deploy changes
4. Monitor for any issues

### Phase 2: Enhance Track Selection (Next)
1. Implement `selectTrackForSegment` function
2. Implement `matchSpeakerToTrack` with LLM
3. Update segment extractor to use new function
4. Add comprehensive logging
5. Deploy and monitor

### Backward Compatibility
- Existing clips with validated speakers: Work unchanged
- Existing quotes with validated speakers: Work unchanged
- New clips with any speakers: Work with new logic
- No database migrations required

## Security Considerations

- **LLM prompt injection**: System prompts are fixed, user input is quoted
- **Track access**: Tenant isolation maintained in all queries
- **Fallback safety**: Always falls back to 'main' track (safe default)
- **Logging**: No sensitive data logged (only speaker names and track names)

