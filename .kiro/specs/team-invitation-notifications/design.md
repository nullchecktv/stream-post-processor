# Design Document

## Overview

This design extends the existing team management system to handle invitations for existing users and implements comprehensive Zod validation across all API endpoints. The solution builds on the current invitation system but adds in-app notifications for existiners and establishes a centralized validation pattern using Zod schemas.

## Architecture

### High-Level Components

1. **Enhanced Team Invitation System**
   - Existing invitation flow for non-existing users (unchanged)
   - New notification flow for existing users
   - Unified invitation acceptance/rejection workflow

2. **In-App Notification System**
   - Notification storage in DynamoDB
   - Notification management API endpoints
   - Real-time notification delivery

3. **Centralized Zod Validation**
   - Unified validation utility with Zod schemas
   - Standardized error responses
   - Extensible validation patterns

4. **Invitation Management for Existing Users**
   - Accept/reject invitation endpoints
   - Automatic cleanup of processed invitations
   - Integration with existing team membership system

## Components and Interfaces

### Data Models

#### Notification Entity
```javascript
{
  pk: `user#${userId}`,
  sk: `notification#${notificationId}`,
  GSI1PK: `user#${userId}`,
  GSI1SK: `${createdAt}#${notificationId}`, // For chronological sorting
  type: 'team_invitation',
  title: 'Team Invitation',
  message: 'You have been invited to join Content Team Alpha',
  data: {
    teamId: 'team-123',
    teamName: 'Content Team Alpha',
    inviterName: 'John Doe',
    role: 'member',
    invitationId: 'invitation-456'
  },
  isRead: false,
  createdAt: '2025-01-15T10:30:00Z',
  ttl: 1642248000 // 30 days from creation
}
```

#### Enhanced Team Invitation Entity
```javascript
{
  pk: `invitation#${invitationId}`,
  sk: 'metadata',
  GSI1PK: `team#${teamId}`,
  GSI1SK: `invitation#${invitationId}`,
  teamId: 'team-123',
  teamName: 'Content Team Alpha',
  invitedUserId: 'user-456', // New field for existing users
  email: 'user@example.com',
  role: 'member',
  invitedBy: 'user-789',
  inviterName: 'John Doe',
  status: 'pending',
  type: 'existing_user', // 'existing_user' or 'new_user'
  notificationId: 'notification-123', // Link to notification
  expiresAt: '2025-01-22T10:30:00Z',
  ttl: 1642248000,
  createdAt: '2025-01-15T10:30:00Z'
}
```

### API Endpoints

#### Notification Management
- `GET /notifications` - List user notifications with pagination
- `DELETE /notifications/{notificationId}` - Delete or mark notification as read

#### Invitation Management
- `POST /invitations/{invitationId}/decisions` - Accept or reject team invitation

### Enhanced Team Member Addition Flow

#### For Existing Users
1. Check if user exists in system
2. Create invitation record with `type: 'existing_user'`
3. Create in-app notification for target user
4. Send email notification (existing flow)
5. User receives both in-app and email notifications

#### For Non-Existing Users
1. Existing flow unchanged
2. Create invitation record with `type: 'new_user'`
3. Send email invitation only

### Zod Validation System

#### Centralized Validation Utility
```javascript
// functions/utils/zod-validation.mjs
import { z } from 'zod';
import { formatResponse } from './api.mjs';

export const validateWithZod = (schema, data, source = 'body') => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    const fieldErrors = error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code
    }));

    return {
      success: false,
      error: formatResponse(400, {
        error: 'ValidationError',
        message: 'Request validation failed',
        details: fieldErrors
      })
    };
  }
};

export const createValidationMiddleware = (schemas) => {
  return (event) => {
    const results = {};

    // Validate body
    if (schemas.body && event.body) {
      const bodyData = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      const result = validateWithZod(schemas.body, bodyData, 'body');
      if (!result.success) return result.error;
      results.body = result.data;
    }

    // Validate path parameters
    if (schemas.pathParameters && event.pathParameters) {
      const result = validateWithZod(schemas.pathParameters, event.pathParameters, 'path');
      if (!result.success) return result.error;
      results.pathParameters = result.data;
    }

    // Validate query parameters
    if (schemas.queryStringParameters && event.queryStringParameters) {
      const result = validateWithZod(schemas.queryStringParameters, event.queryStringParameters, 'query');
      if (!result.success) return result.error;
      results.queryStringParameters = result.data;
    }

    return { success: true, data: results };
  };
};
```

#### Schema Definitions
```javascript
// functions/utils/schemas.mjs
import { z } from 'zod';

export const EpisodeSchemas = {
  create: {
    body: z.object({
      title: z.string().min(1).max(200),
      episodeNumber: z.number().int().positive(),
      description: z.string().max(1000).optional(),
      airDate: z.string().datetime().optional(),
      platforms: z.array(z.enum(['linkedin live', 'X', 'twitch', 'youtube'])).optional(),
      themes: z.array(z.string()).optional(),
      seriesName: z.string().max(100).optional()
    })
  },
  pathParameters: z.object({
    episodeId: z.string().uuid()
  })
};

export const TeamSchemas = {
  create: {
    body: z.object({
      name: z.string().min(1).max(100),
      description: z.string().max(500).optional(),
      settings: z.object({
        defaultPlatforms: z.array(z.enum(['linkedin live', 'X', 'twitch', 'youtube'])).optional(),
        timezone: z.string().optional()
      }).optional()
    })
  },
  addMember: {
    body: z.object({
      email: z.string().email(),
      role: z.enum(['administrator', 'member']).default('member')
    }),
    pathParameters: z.object({
      teamId: z.string()
    })
  }
};

export const NotificationSchemas = {
  list: {
    queryStringParameters: z.object({
      limit: z.coerce.number().int().min(1).max(100).default(20),
      cursor: z.string().optional(),
      isRead: z.enum(['true', 'false']).optional()
    }).optional()
  },
  pathParameters: z.object({
    notificationId: z.string()
  }),
  delete: {
    queryStringParameters: z.object({
      isRead: z.enum(['true', 'false']).optional()
    }).optional()
  }
};
```

## Data Models

### Notification Types
- `team_invitation` - Team invitation for existing users
- `team_member_added` - Confirmation of team membership
- `team_role_changed` - Role change notifications
- `team_removed` - Team removal notifications

### Notification Data Structure
Each notification includes:
- Standard fields: id, type, title, message, isRead, createdAt
- Type-specific data in `data` field
- TTL for automatic cleanup (30 days)
- GSI for efficient user-based queries

### Enhanced Invitation Flow States
1. **Pending** - Invitation created, waiting for response
2. **Accepted** - User accepted invitation, team membership created
3. **Rejected** - User rejected invitation, invitation marked as rejected
4. **Expired** - Invitation expired (7 days), automatically cleaned up
5. **Cancelled** - Invitation cancelled by team admin

## Error Handling

### Validation Error Response Format
```javascript
{
  message: 'Invalid email format'
}
```

### Business Logic Error Handling
- Duplicate invitation prevention
- Expired invitation handling
- Permission validation for invitation actions
- Notification delivery failure handling

### Graceful Degradation
- If notification creation fails, invitation still proceeds
- Email notifications continue as fallback
- Partial validation failures provide specific field errors

## Testing Strategy

### Unit Tests
- Zod schema validation functions
- Notification creation and management
- Invitation acceptance/rejection logic
- Enhanced team member addition flow

### Integration Tests
- End-to-end invitation flow for existing users
- Notification API endpoints
- Team invitation acceptance workflow
- Validation middleware integration

### Validation Testing
- Schema validation for all endpoint combinations
- Error response format consistency
- Edge cases for validation rules
- Performance impact of validation layer

## Implementation Phases

### Phase 1: Zod Validation Infrastructure
1. Create centralized validation utilities
2. Define Zod schemas for existing endpoints
3. Implement validation middleware
4. Update existing endpoints to use Zod validation

### Phase 2: Notification System
1. Create notification data models
2. Implement notification management endpoints
3. Add notification creation utilities
4. Integrate with existing systems

### Phase 3: Enhanced Team Invitations
1. Modify team member addition to detect existing users
2. Create invitation acceptance/rejection endpoints
3. Integrate notification creation with invitations
4. Update email templates and flows

### Phase 4: Testing and Optimization
1. Comprehensive testing of all flows
2. Performance optimization
3. Error handling refinement
4. Documentation updates

## Security Considerations

### Authentication and Authorization
- All notification endpoints require valid JWT
- Users can only access their own notifications
- Invitation actions require proper team membership validation
- Zod validation prevents injection attacks

### Data Privacy
- Notifications contain minimal sensitive data
- TTL ensures automatic cleanup of old notifications
- Invitation data is properly scoped to team members
- Email addresses are validated and sanitized

### Rate Limiting
- Notification creation rate limiting
- Invitation acceptance/rejection rate limiting
- Validation performance monitoring
- DDoS protection through API Gateway

## Performance Considerations

### Database Optimization
- GSI for efficient notification queries
- TTL for automatic cleanup
- Batch operations for notification management
- Optimized query patterns for team invitations

### Validation Performance
- Zod schema compilation optimization
- Validation result caching where appropriate
- Minimal validation overhead
- Early validation failure detection

### Scalability
- Notification system scales with user base
- Invitation system handles concurrent operations
- Validation layer adds minimal latency
- Database design supports high throughput

## Monitoring and Observability

### Metrics
- Notification creation and delivery rates
- Invitation acceptance/rejection rates
- Validation error rates by endpoint
- Performance metrics for validation layer

### Logging
- Structured logging for all notification operations
- Invitation flow tracking
- Validation error logging with context
- Performance monitoring for validation

### Alerting
- Failed notification creation alerts
- High validation error rate alerts
- Invitation system performance alerts
- Database performance monitoring
