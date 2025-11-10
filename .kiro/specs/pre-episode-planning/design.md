# Design Document

## Overview

The pre-episode planning feature enables content creators to structure their episodes before recording by adding objectives, concepts, and notes. An AI Planning Agent powered by AWS Bedrock analyzes this input and generates actionable recommendations including a Mermaid sequence diagram for episode flow, promotional content, and key learning moments.

This design follows the existing serverless architecture patterns using Lambda functions, DynamoDB single-table design, EventBridge for event-driven processing, and AWS Bedrock for AI capabilities.

## Architecture

### High-Level Flow

```
User → API Gateway → Lambda (Add/Update Plan) → DynamoDB
                                                    ↓
                                            EventBridge Event
                                                    ↓
                                    Lambda (AI Planning Agent) → Bedrock
                                                    ↓
                                            Lambda (Tool: setPlanRecommendations)
                                                    ↓
                                                DynamoDB
                                                    ↓
                                            Status History Update
```

### Components

1. **API Layer**: REST endpoints for plan management
2. **Data Layer**: DynamoDB entities for plans and recommendations
3. **Event Layer**: EventBridge events for asynchronous AI processing
4. **AI Layer**: Bedrock agent with custom tool for generating recommendations
5. **UI Layer**: React components for plan input and recommendation display

## Components and Interfaces

### API Endpoints

#### Create/Update Episode Plan
```
POST /episodes/{episodeId}/plan
PUT /episodes/{episodeId}/plan

Request Body:
{
  "objectives": "string (required, min 1 char)",
  "concepts": "string (required, min 1 char)",
  "notes": "string (optional)"
}

Response (201/200):
{
  "episodeId": "uuid",
  "plan": {
    "objectives": "string",
    "concepts": "string",
    "notes": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "status": "plan_added" | "plan_updated"
}
```

#### Get Episode Plan
```
GET /episodes/{episodeId}/plan

Response (200):
{
  "episodeId": "uuid",
  "plan": {
    "objectives": "string",
    "concepts": "string",
    "notes": "string",
    "createdAt": "ISO8601",
    "updatedAt": "ISO8601"
  },
  "recommendations": {
    "suggestedFlow": "string (Mermaid diagram)",
    "proposedTitle": "string",
    "proposedDescription": "string",
    "keyLearningMoments": ["string"],
    "generatedAt": "ISO8601"
  } | null
}

Response (404):
{
  "error": "NotFound",
  "message": "Plan not found for episode"
}
```

### EventBridge Events

#### Plan Added/Updated Event
```json
{
  "Source": "nullcheck",
  "DetailType": "Episode Plan Updated",
  "Detail": {
    "episodeId": "uuid",
    "tenantId": "string",
    "action": "plan_added" | "plan_updated",
    "plan": {
      "objectives": "string",
      "concepts": "string",
      "notes": "string"
    },
    "timestamp": "ISO8601"
  }
}
```

### AI Planning Agent Tool

#### setPlanRecommendations Tool Schema
```json
{
  "toolSpec": {
    "name": "setPlanRecommendations",
    "description": "Store AI-generated recommendations for an episode plan including suggested flow, title, description, and key learning moments",
    "inputSchema": {
      "json": {
        "type": "object",
        "properties": {
          "episodeId": {
            "type": "string",
            "description": "The unique identifier of the episode"
          },
          "suggestedFlow": {
            "type": "string",
            "description": "A Mermaid sequence diagram showing the proposed episode flow"
          },
          "proposedTitle": {
            "type": "string",
            "description": "A compelling title for the episode (10-200 characters)"
          },
          "proposedDescription": {
            "type": "string",
            "description": "A promotional description for the episode (50-1000 characters)"
          },
          "keyLearningMoments": {
            "type": "array",
            "items": {
              "type": "string"
            },
            "description": "Array of key learning moments or takeaways from the episode"
          }
        },
        "required": ["episodeId", "suggestedFlow", "proposedTitle", "proposedDescription", "keyLearningMoments"]
      }
    }
  }
}
```

## Data Models

### Plan Entity (DynamoDB)

```javascript
{
  pk: "tenant123#episode-uuid",
  sk: "plan",
  objectives: "Discuss serverless architecture patterns and best practices",
  concepts: "Lambda, DynamoDB, EventBridge, Step Functions",
  notes: "Focus on real-world examples, include cost optimization tips",
  createdAt: "2025-01-15T10:30:00Z",
  updatedAt: "2025-01-15T10:30:00Z"
}
```

### Recommendations Entity (DynamoDB)

```javascript
{
  pk: "tenant123#episode-uuid",
  sk: "recommendations",
  suggestedFlow: "sequenceDiagram\n    participant Host\n    participant Audience\n    Host->>Audience: Introduction\n    Host->>Audience: Concept 1: Lambda\n    ...",
  proposedTitle: "Mastering Serverless Architecture: A Deep Dive into AWS Patterns",
  proposedDescription: "Join us for an in-depth exploration of serverless architecture patterns...",
  keyLearningMoments: [
    "Understanding Lambda cold starts and optimization",
    "DynamoDB single-table design patterns",
    "Cost optimization strategies for serverless"
  ],
  generatedAt: "2025-01-15T10:35:00Z"
}
```

### Status History Update

The episode's status history will be updated with new entries:

```javascript
{
  pk: "tenant123#episode-uuid",
  sk: "metadata",
  statusHistory: [
    {
      status: "draft",
      timestamp: "2025-01-15T10:00:00Z"
    },
    {
      status: "plan_added",
      timestamp: "2025-01-15T10:30:00Z"
    },
    {
      status: "recommendations_generated",
      timestamp: "2025-01-15T10:35:00Z"
    }
  ]
}
```

## Error Handling

### Validation Errors

- **Empty objectives or concepts**: Return 400 with clear error message
- **Invalid episodeId**: Return 404 with episode not found message
- **Unauthorized access**: Return 403 if user doesn't have access to episode's team

### AI Processing Errors

- **Bedrock invocation failure**: Log error, update status history with "recommendations_failed", return 500
- **Tool invocation failure**: Log error, retry once, update status history if retry fails
- **Invalid Mermaid syntax**: Validate basic syntax before storing, reject if invalid

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Objectives field is required and must contain at least one character"
}
```

## Testing Strategy

### Unit Tests

1. **Plan CRUD operations**: Test create, read, update plan data
2. **Validation logic**: Test input validation for objectives, concepts, notes
3. **Status history updates**: Verify correct status entries are added
4. **Tool invocation**: Mock Bedrock responses and verify tool execution
5. **Recommendations storage**: Test setPlanRecommendations tool logic

### Integration Tests

1. **End-to-end plan flow**: Create plan → trigger AI → verify recommendations stored
2. **EventBridge integration**: Verify events are published and consumed correctly
3. **Bedrock agent integration**: Test actual AI agent with sample plans
4. **API endpoint integration**: Test full request/response cycle
5. **Status history tracking**: Verify complete status progression

### UI Tests

1. **Plan form submission**: Test form validation and submission
2. **Recommendations display**: Verify all recommendation fields render correctly
3. **Mermaid diagram rendering**: Test diagram display with various flows
4. **Loading states**: Verify pending state while recommendations generate
5. **Error handling**: Test error message display for failed operations

## Implementation Notes

### Bedrock Agent Configuration

- Use existing `clipAgentMemory` or create new memory namespace for planning context
- Model: `amazon.nova-pro-v1:0` (same as clip detection)
- System prompt should focus on episode structure, educational content, and promotional copy
- Tool definition must be registered with the agent

### Mermaid Diagram Validation

Basic validation to ensure diagram is syntactically correct:
- Must start with `sequenceDiagram`
- Must contain at least one participant
- Must contain at least one interaction arrow

### Frontend Considerations

- Use `react-mermaid` or similar library for diagram rendering
- Implement loading skeleton while recommendations generate
- Show timestamp of when recommendations were generated
- Allow users to regenerate recommendations if needed

### Performance Considerations

- AI processing is asynchronous via EventBridge (non-blocking)
- Recommendations typically generate within 10-30 seconds
- Frontend should poll or use WebSocket for real-time updates (future enhancement)
- Cache recommendations in browser to avoid repeated API calls
