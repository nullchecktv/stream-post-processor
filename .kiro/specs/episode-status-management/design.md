# Design Document

## Overview

The Episode Status Management system adds manual status control capabilities to episodes and clips through a new API endpoint and data model changhe system validates prerequisites before allowing status transitions and maintains complete audit trails through status history arrays.

## Architecture

### High-Level Flow
```
Client Request → API Gateway → Status Update Lambda → DynamoDB Update → EventBridge Event
                                     ↓
                              Prerequisite Validation
                                     ↓
                              Track Status Verification
```

### Components
- **Status Update Handler**: New Lambda function for POST `/episodes/{episodeId}/statuses`
- **Status History Model**: Enhanced data model with history arrays
- **Prerequisite Validator**: Logic to verify episode and track readiness
- **Event Publisher**: EventBridge integration for downstream notifications

## Components and Interfaces

### New Lambda Function: UpdateEpisodeStatus

**File**: `functions/episodes/update-episode-status.mjs`

**Responsibilities**:
- Validate episode exists
- Check prerequisite conditions (tracks uploaded, all tracks processed)
- Update episode status history
- Publish EventBridge events
- Return appropriate HTTP responses

**Input**:
```json
{
  "episodeId": "uuid",
  "status": "Ready for Clip Gen"
}
```

**Output**:
```json
{
  "id": "episode-uuid",
  "status": "Ready for Clip Gen",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

### Enhanced Data Models

#### Episode Entity Changes
```json
{
  "pk": "episode-id",
  "sk": "metadata",
  "statusHistory": [
    {
      "status": "draft",
      "timestamp": "2025-01-15T10:00:00Z"
    },
    {
      "status": "tracks uploaded",
      "timestamp": "2025-01-15T10:15:00Z"
    },
    {
      "status": "Ready for Clip Gen",
      "timestamp": "2025-01-15T10:30:00Z"
    }
  ],
  "status": "Ready for Clip Gen", // Computed from latest statusHistory entry
  // ... other episode fields
}
```

#### Clip Entity Changes
```json
{
  "pk": "episode-id",
  "sk": "clip#001",
  "statusHistory": [
    {
      "status": "detected",
      "timestamp": "2025-01-15T10:40:00Z"
    },
    {
      "status": "processing",
      "timestamp": "2025-01-15T10:41:00Z"
    }
  ],
  "status": "processing", // Computed from latest statusHistory entry
  // ... other clip fields
}
```

### API Endpoint Design

#### POST /episodes/{episodeId}/statuses

**Request Body**:
```json
{
  "status": "Ready for Clip Gen"
}
```

**Success Response (200)**:
```json
{
  "id": "episode-uuid",
  "status": "Ready for Clip Gen",
  "updatedAt": "2025-01-15T10:30:00Z"
}
```

**Conflict Response (409)**:
```json
{
  "error": "PrerequisiteNotMet",
  "message": "Episode is not ready for clip generation",
  "details": {
    "missingPrerequisites": [
      "Episode does not have 'tracks uploaded' status",
      "Track 'guest' has status 'uploading', expected 'processed'"
    ]
  }
}
```

### Prerequisite Validation Logic

#### Episode Status Validation
1. Check current episode status is "tracks uploaded"
2. Query all tracks for the episode
3. Verify all tracks have status "processed"
4. Return specific failure reasons if validation fails

#### Track Status Query Pattern
```javascript
// Query all tracks for episode
const trackQuery = {
  TableName: TABLE_NAME,
  KeyConditionExpression: 'pk = :pk AND begins_with(sk, :sk)',
  ExpressionAttributeValues: {
    ':pk': episodeId,
    ':sk': 'track#'
  }
};
```

### Event Publishing Design

#### EventBridge Event Structure
```json
{
  "Source": "nullcheck",
  "DetailType": "Begin Clip Generation",
  "Detail": {
    "episodeId": "episode-uuid",
    "status": "Ready for Clip Gen",
    "timestamp": "2025-01-15T10:30:00Z",
    "episodeMetadata": {
      "title": "Episode Title",
      "episodeNumber": 42,
      "airDate": "2025-01-15T10:00:00Z"
    }
  }
}
```

## Data Models

### Status History Structure
```javascript
const statusHistoryEntry = {
  status: 'string', // The status value
  timestamp: 'ISO 8601 string' // When the status was set
};
```

### Migration Strategy
Since this changes the data model from single `status` field to `statusHistory` array:

1. **Backward Compatibility**: Continue to provide `status` field in API responses
2. **Data Migration**: Existing episodes with `status` field will be migrated to `statusHistory` on first update
3. **Computed Status**: The `status` field becomes computed from the latest `statusHistory` entry

### Database Update Patterns

#### Adding Status History Entry
```javascript
const updateParams = {
  TableName: TABLE_NAME,
  Key: { pk: episodeId, sk: 'metadata' },
  UpdateExpression: 'SET statusHistory = list_append(if_not_exists(statusHistory, :emptyList), :newStatus), #status = :status, updatedAt = :updatedAt',
  ExpressionAttributeNames: {
    '#status': 'status'
  },
  ExpressionAttributeValues: {
    ':emptyList': [],
    ':newStatus': [{
      status: 'Ready for Clip Gen',
      timestamp: new Date().toISOString()
    }],
    ':status': 'Ready for Clip Gen',
    ':updatedAt': new Date().toISOString()
  }
};
```

## Error Handling

### Validation Errors
- **404 Not Found**: Episode doesn't exist
- **409 Conflict**: Prerequisites not met (with specific reasons)
- **400 Bad Request**: Invalid status value or request format

### Error Response Format
```json
{
  "error": "ErrorType",
  "message": "Human readable message",
  "details": {
    "missingPrerequisites": ["specific", "failure", "reasons"]
  }
}
```

### Prerequisite Validation Details
The system will check and report specific failures:
- Episode current status is not "tracks uploaded"
- Specific tracks that are not in "processed" status
- Missing tracks if episode claims to have tracks uploaded

## Testing Strategy

### Unit Tests
- **Status validation logic**: Test prerequisite checking with various episode/track states
- **Status history management**: Test adding entries and computing current status
- **Error handling**: Test all error conditions and response formats

### Integration Tests
- **End-to-end flow**: Create episode, upload tracks, process tracks, trigger status update
- **EventBridge integration**: Verify events are published correctly
- **Database consistency**: Verify status history is maintained correctly

### Test Data Scenarios
1. **Happy path**: Episode with tracks uploaded and all tracks processed
2. **Missing tracks uploaded status**: Episode in draft state
3. **Partial track processing**: Some tracks processed, others still uploading
4. **No tracks**: Episode claims tracks uploaded but no tracks exist

## OpenAPI Specification Updates

### New Endpoint Definition
```yaml
/episodes/{episodeId}/statuses:
  post:
    summary: Update episode status
    parameters:
      - name: episodeId
        in: path
        required: true
        schema:
          type: string
          format: uuid
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              status:
                type: string
                enum: ["Ready for Clip Gen"]
            required: [status]
    responses:
      200:
        description: Status updated successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/Episode'
      409:
        description: Prerequisites not met
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/PrerequisiteError'
```

### Schema Updates
```yaml
components:
  schemas:
    StatusHistoryEntry:
      type: object
      properties:
        status:
          type: string
        timestamp:
          type: string
          format: date-time
      required: [status, timestamp]

    PrerequisiteError:
      type: object
      properties:
        error:
          type: string
        message:
          type: string
        details:
          type: object
          properties:
            missingPrerequisites:
              type: array
              items:
                type: string
```

## Implementation Considerations

### Performance
- **Single query for tracks**: Use query operation to get all tracks at once
- **Atomic updates**: Use DynamoDB UpdateItem for atomic status history updates
- **Event publishing**: Asynchronous EventBridge publishing doesn't block response

### Scalability
- **Status history size**: Consider limits on status history array size (unlikely to be an issue)
- **Concurrent updates**: DynamoDB handles concurrent updates to status history

### Monitoring
- **CloudWatch metrics**: Track status update success/failure rates
- **Event publishing**: Monitor EventBridge event delivery
- **Prerequisite failures**: Track common prerequisite failure patterns
