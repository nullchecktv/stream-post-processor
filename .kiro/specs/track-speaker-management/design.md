# Design Document

## Overview

This design enhances the existing track management system to support speaker associations and updates the clip creation workflow to use speaker-based track selection. The solution builds on the current single-table DynamoDB design and existing API patterns while adding new functionality for speaker management.

## Architecture

### High-Level Flow
```
1. Track Upload → Enhanced with speakers array
2. Track Update → New endpoint for speaker modification
3. Clip Creation → Speaker-aware segment processing
. Track Selection → Algorithm matches speakers to tracks
5. Video Processing → Uses selected track for extraction
```

### Component Interactions
- **API Gateway**: Routes track update requests to new endpoint
- **Track Management Functions**: Handle speaker data in create/update operations
- **Clip Creation Tool**: Validates speaker requirements and stores speaker data
- **Track Selection Service**: Queries tracks and matches speakers for clip processing
- **Video Processing Pipeline**: Uses selected tracks for segment extraction

## Components and Interfaces

### 1. Enhanced Track Data Model

#### Track Entity Schema (Updated)
```json
{
  "pk": "episodeId",
  "sk": "track#trackName",
  "trackName": "main",
  "uploadKey": "s3-key",
  "status": "processed",
  "speakers": ["host", "guest1", "guest2"],
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Key Changes
- **speakers**: New array field containing speaker names
- **Backward compatibility**: Existing tracks without speakers field treated as empty array
- **Validation**: Speaker names must be non-empty strings, trimmed of whitespace

### 2. Track Update API Endpoint

#### New Endpoint: `PUT /episodes/{episodeId}/tracks/{trackName}`

**Request Schema:**
```json
{
  "speakers": ["speaker1", "speaker2"]
}
```

**Response Schema:**
```json
{
  "trackName": "main",
  "speakers": ["speaker1", "speaker2"],
  "updatedAt": "2025-01-15T10:35:00Z"
}
```

#### Implementation Details
- **Function**: `functions/episodes/update-track.mjs`
- **Validation**: Zod schema for speakers array
- **Error Handling**: 404 for missing tracks, 400 for invalid input
- **Idempotency**: Safe to call multiple times with same data

### 3. Enhanced Track Creation

#### Modified: `POST /episodes/{episodeId}/tracks`

**Updated Request Schema:**
```json
{
  "filename": "video.mp4",
  "trackName": "main",
  "speakers": ["host", "guest1"]  // New optional field
}
```

#### Implementation Changes
- **Function**: `functions/episodes/create-track-upload.mjs` (enhanced)
- **Validation**: Optional speakers array in request body
- **Storage**: Include speakers in track record creation
- **Backward Compatibility**: Speakers field optional, defaults to empty array

### 4. Updated Clip Creation Tool

#### Enhanced Segment Schema
```javascript
const segmentSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),  // Now required
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),    // Now required
  speaker: z.string().min(1),                          // Now required
  notes: z.string().optional()
  // text field removed
});
```

#### Key Changes
- **speaker**: Required field for each segment
- **startTime/endTime**: Both now required (no text fallback)
- **text**: Property removed entirely
- **Validation**: Stricter requirements for time-based processing

### 5. Track Selection Algorithm

#### Core Logic
```javascript
const selectTrackForSpeaker = async (episodeId, speaker) => {
  // 1. Query all tracks for episode
  const tracks = await queryTracks(episodeId);

  // 2. Find tracks containing speaker
  const matchingTracks = tracks.filter(track =>
    track.speakers && track.speakers.includes(speaker)
  );

  // 3. Return first match or null
  return matchingTracks.length > 0 ? matchingTracks[0] : null;
};
```

#### Implementation Details
- **Function**: `functions/utils/track-selection.mjs`
- **Query Pattern**: Use DynamoDB query with `pk = episodeId` and `sk` begins with `track#`
- **Matching Logic**: Case-sensitive speaker name matching
- **Fallback**: Log warning and skip segment if no track found
- **Performance**: Cache track list per episode during processing

### 6. Enhanced Clip Processing Integration

#### Updated Video Processing Flow
```
1. Load clip segments from DynamoDB
2. For each segment:
   a. Extract speaker from segment
   b. Call track selection algorithm
   c. If track found: proceed with extraction
   d. If no track: log warning and continue
3. Process remaining segments normally
```

#### Integration Points
- **Segment Extractor**: Enhanced to accept track selection
- **Clip Stitcher**: No changes required
- **Error Handling**: Graceful degradation when tracks missing

## Data Models

### Track Entity (Enhanced)
```javascript
// Zod validation schema
const TrackSchema = z.object({
  trackName: z.string().min(1).max(50),
  uploadKey: z.string(),
  status: z.enum(['uploading', 'uploaded', 'processing', 'processed', 'failed']),
  speakers: z.array(z.string().min(1)).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});
```

### Clip Segment (Updated)
```javascript
const SegmentSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
  speaker: z.string().min(1),
  notes: z.string().optional()
});
```

### API Request/Response Models
```javascript
// Track update request
const UpdateTrackRequest = z.object({
  speakers: z.array(z.string().min(1)).optional()
});

// Track creation request (enhanced)
const CreateTrackRequest = z.object({
  filename: z.string().min(1),
  trackName: z.string().min(1),
  speakers: z.array(z.string().min(1)).optional()
});
```

## Error Handling

### Track Update Errors
- **404 Not Found**: Track doesn't exist for episode
- **400 Bad Request**: Invalid speakers array format
- **500 Internal Error**: DynamoDB or other service failures

### Clip Processing Errors
- **Warning Logs**: Speaker not found in any track
- **Error Logs**: No tracks exist for episode
- **Graceful Degradation**: Continue processing other segments

### Validation Errors
- **Speaker Names**: Must be non-empty strings
- **Time Format**: Must match HH:MM:SS pattern
- **Array Limits**: Reasonable limits on speakers array size

## Testing Strategy

### Unit Tests

#### Track Management
- Test track creation with speakers array
- Test track update with various speaker combinations
- Test validation of speaker names and formats
- Test backward compatibility with existing tracks

#### Clip Creation Tool
- Test enhanced segment validation (required speaker, times)
- Test removal of text property support
- Test error handling for invalid segments
- Test clip creation with speaker data

#### Track Selection Algorithm
- Test speaker matching with single and multiple tracks
- Test fallback behavior when no tracks match
- Test error handling for malformed track data
- Test performance with large numbers of tracks

### Integration Tests

#### API Endpoints
- Test complete track creation flow with speakers
- Test track update endpoint with various payloads
- Test error responses for invalid requests
- Test CORS and authentication (when enabled)

#### End-to-End Processing
- Test clip creation with speaker-track matching
- Test video processing with selected tracks
- Test error handling when speakers don't match tracks
- Test processing with mixed speaker availability

### Performance Tests
- Test track selection performance with many tracks
- Test concurrent clip processing with speaker matching
- Test API response times for track operations
- Test DynamoDB query performance for track lookups

## Migration Strategy

### Backward Compatibility
- **Existing Tracks**: Treat missing speakers field as empty array
- **Existing Clips**: Continue processing clips without speaker requirements
- **API Compatibility**: New fields optional in existing endpoints

### Deployment Approach
1. **Phase 1**: Deploy enhanced track creation (speakers optional)
2. **Phase 2**: Deploy track update endpoint
3. **Phase 3**: Deploy enhanced clip creation tool
4. **Phase 4**: Deploy track selection integration

### Data Migration
- **No migration required**: New speakers field optional
- **Gradual adoption**: Users can add speakers to tracks over time
- **Validation**: Existing data remains valid

## Security Considerations

### Input Validation
- **Speaker Names**: Sanitize and validate speaker name format
- **Array Limits**: Prevent excessively large speakers arrays
- **SQL Injection**: Use parameterized DynamoDB queries

### Access Control
- **Track Updates**: Same permissions as track creation
- **Speaker Data**: No sensitive information in speaker names
- **API Security**: Consistent with existing endpoint security

## Performance Optimization

### DynamoDB Queries
- **Track Selection**: Single query per episode using sort key prefix
- **Caching**: Cache track list during clip processing session
- **Batch Operations**: Process multiple segments efficiently

### API Response Times
- **Track Updates**: Direct DynamoDB updates, minimal processing
- **Validation**: Fast Zod schema validation
- **Error Handling**: Quick validation failures

### Memory Usage
- **Track Caching**: Reasonable limits on cached track data
- **Speaker Arrays**: Practical limits on array sizes
- **Processing**: Efficient iteration over tracks and speakers
