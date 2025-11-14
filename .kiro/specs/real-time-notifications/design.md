# Design Document

## Overview

This design implements a real-time notification system using Momento Topics for pub/sub messaging. The system provides immediate feedback to users when async operations complete and maintains live notification badges showing unread activity counts. The architecture uses two topic patterns: tenant-wide topics for general notifications and task-specific topics for operation completion updates.

## Architecture

### High-Level Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │          Momento Client (with Auth Token)                 │  │
│  │  ┌────────────────────┐  ┌──────────────────────────┐   │  │
│  │  │  Tenant Topic      │  │  Tasks Topic             │   │  │
│  │  │  {tenantId}        │  │  {tenantId}_tasks        │   │  │
│  │  └────────────────────┘  └──────────────────────────┘   │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ▲                    ▲
                              │                    │
                              │                    │
┌─────────────────────────────┴────────────────────┴──────────────┐
│                    Momento Topics Service            │
└──────────────────────────────────────────────────────────────────┘
                              ▲                    ▲
                              │                    │
                              │                    │
┌─────────────────────────────┴────────────────────┴──────────────┐
│                  Notification Handler Lambda                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  1. Receive EventBridge notification event                 │ │
│  │  2. Determine delivery method (persist/publish)            │ │
│  │  3. Store in DynamoDB if persist=true                      │ │
│  │  4. Publish to appropriate Momento topic                   │ │
│  └────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│                      EventBridge Default Bus                     │
└──────────────────────────────────────────────────────────────────┘
                              ▲
                              │
┌─────────────────────────────┴────────────────────────────────────┐
│         Lambda Functions (Clips, Quotes, Blogs, etc.)            │
│  - Publish notification events to EventBridge                    │
│  - Include metadata: type, tenantId, userId, subscriptionId      │
└──────────────────────────────────────────────────────────────────┘
```

### Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Authentication                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cognito Pre-Token Generation Trigger                │
│  1. Query user's team memberships from DynamoDB                  │
│  2. Generate Momento auth token with scoped permissions:         │
│     - userId topic (read/write)                                  │
│     - All team topics: {teamId} (read/write)                     │
│     - All task topics: {teamId}_tasks (read/write)               │
│  3. Add Momento token to JWT custom claims                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    JWT Token with Claims                         │
│  - tenantId: active team ID                                      │
│  - momentoToken: scoped auth token                               │
└─────────────────────────────────────────────────────────────────┘
```

### Token Refresh Flow

```
┌─────────────────────────────────────────────────────────────────┐
│         Momento Subscription Returns 401/403                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend Calls POST /tokens/refresh                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Token Refresh Lambda                            │
│  1. Validate user's current JWT                                  │
│  2. Query user's current team memberships                        │
│  3. Generate new Momento auth token with updated permissions     │
│  4. Return new token in response                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│         Frontend Re-establishes Subscriptions                    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Momento Client (Frontend)

**Location**: `frontend/src/contexts/NotificationContext.tsx`

**Responsibilities**:
- Initialize Momento TopicClient with auth token from JWT
- Subscribe to tenant topic and tasks topic on login/team switch
- Handle incoming messages and route to appropriate handlers
- Manage subscription lifecycle (subscribe/unsubscribe)
- Handle token expiration and refresh

**Interface**:
```typescript
interface NotificationContextValue {
  unreadCount: number;
  subscribe: (tenantId: string, token: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

interface MomentoMessage {
  type: string;
  title: string;
  message: string;
  url: string;
  subscriptionId?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}
```

**Key Methods**:
- `initializeClient(token: string)`: Create Momento TopicClient with auth token
- `subscribeTenant(tenantId: string)`: Subscribe to tenant and tasks topics
- `handleTenantMessage(message: MomentoMessage)`: Process tenant topic messages
- `handleTaskMessage(message: MomentoMessage)`: Process task topic messages
- `refreshMomentoToken()`: Call refresh endpoint and re-establish subscriptions

### 2. Pre-Token Generation Trigger

**Location**: `functions/auth/pre-token-generation.mjs`

**Responsibilities**:
- Query user's team memberships from DynamoDB
- Generate Momento auth token with scoped permissions
- Add Momento token to JWT custom claims

**Dependencies**:
- `@gomomento/sdk`: For generating auth tokens
- DynamoDB: For querying team memberships

**Key Logic**:
```javascript
// Query user's teams
const teams = await queryUserTeams(userId);

// Build permission list
const permissions = [
  { topic: userId, role: 'subscribeonly' },
  ...teams.map(team => ({ topic: team.teamId, role: 'subscribeonly' })),
  ...teams.map(team => ({ topic: `${team.teamId}_tasks`, role: 'subscribeonly' }))
];

// Generate Momento token
const momentoToken = await generateMomentoToken(permissions, expiresIn);

// Add to JWT claims
event.response.claimsOverrideDetails.claimsToAddOrOverride.momentoToken = momentoToken;
```

### 3. Token Refresh Endpoint

**Location**: `functions/tokens/refresh-token.mjs`

**API Endpoint**: `POST /tokens/refresh`

**Request**: No body required (uses JWT from Authorization header)

**Response**:
```json
{
  "momentoToken": "string",
  "expiresAt": "ISO8601 timestamp"
}
```

**Responsibilities**:
- Validate user's current JWT
- Query user's current team memberships
- Generate new Momento auth token
- Return new token to frontend

### 4. Notification Handler Lambda

**Location**: `functions/events/notification-handler.mjs`

**Trigger**: EventBridge rule matching notification events

**Event Pattern**:
```json
{
  "source": ["nullcheck"],
  "detail-type": ["Notification"]
}
```

**Event Schema**:
```json
{
  "type": "clip_processed|blog_generated|quote_ready|...",
  "tenantId": "team-uuid",
  "userId": "user-uuid",
  "title": "Notification title",
  "message": "Notification message",
  "url": "/episodes/123/clips/456",
  "persist": true,
  "topic": "tenant|tasks",
  "subscriptionId": "clip-uuid|episode-uuid_blog|...",
  "metadata": {}
}
```

**Responsibilities**:
- Receive notification events from EventBridge
- Store notification in DynamoDB if `persist: true`
- Publish to appropriate Momento topic based on `topic` field
- Handle errors gracefully (log but don't fail)

**Key Logic**:
```javascript
export const handler = async (event) => {
  const notification = event.detail;

  // Persist to DynamoDB if requested
  if (notification.persist) {
    await createNotification(
      notification.userId,
      notification.type,
      notification.title,
      notification.message,
      notification.metadata
    );
  }

  // Publish to Momento topic
  const topicName = notification.topic === 'tasks'
    ? `${notification.tenantId}_tasks`
    : notification.tenantId;

  await publishToMomento(topicName, {
    type: notification.type,
    title: notification.title,
    message: notification.message,
    url: notification.url,
    subscriptionId: notification.subscriptionId,
    timestamp: new Date().toISOString()
  });
};
```

### 5. Notification Publishing Utility

**Location**: `functions/utils/notifications.mjs`

**New Function**: `publishNotificationEvent`

**Purpose**: Centralized function for publishing notification events to EventBridge

**Interface**:
```javascript
export const publishNotificationEvent = async ({
  type,
  tenantId,
  userId,
  title,
  message,
  url,
  persist = true,
  topic = 'tenant',
  subscriptionId = null,
  metadata = {}
}) => {
  await eventBridge.send(new PutEventsCommand({
    Entries: [{
      Source: 'nullcheck',
      DetailType: 'Notification',
      Detail: JSON.stringify({
        type,
        tenantId,
        userId,
        title,
        message,
        url,
        persist,
        topic,
        subscriptionId,
        metadata
      })
    }]
  }));
};
```

## Data Models

### Momento Auth Token Permissions

```javascript
{
  permissions: [
    {
      cache: process.env.MOMENTO_CACHE_NAME,
      topic: userId,
      role: 'subscribeonly'
    },
    {
      cache: process.env.MOMENTO_CACHE_NAME,
      topic: teamId1,
      role: 'subscribeonly'
    },
    {
      cache: process.env.MOMENTO_CACHE_NAME,
      topic: `${teamId1}_tasks`,
      role: 'subscribeonly'
    },
    // ... repeat for all teams
  ],
  expiresIn: 3600 // 1 hour
}
```

### Notification Event (EventBridge)

```javascript
{
  Source: 'nullcheck',
  DetailType: 'Notification',
  Detail: {
    type: 'clip_processed',
    tenantId: 'team-uuid',
    userId: 'user-uuid',
    title: 'Clip Ready',
    message: 'Your clip has been processed',
    url: '/episodes/123/clips/456',
    persist: true,
    topic: 'tasks',
    subscriptionId: 'clip-uuid',
    metadata: {
      episodeId: '123',
      clipId: '456',
      duration: 45
    }
  }
}
```

### Momento Topic Message

```javascript
{
  type: 'clip_processed',
  title: 'Clip Ready',
  message: 'Your clip has been processed',
  url: '/episodes/123/clips/456',
  subscriptionId: 'clip-uuid',
  timestamp: '2025-01-15T10:30:00Z'
}
```

## Error Handling

### Momento Connection Errors

**Strategy**: Automatic reconnection with exponential backoff

```typescript
const reconnect = async (attempt = 1) => {
  const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    await subscribe(currentTenantId, currentToken);
  } catch (error) {
    if (attempt < 5) {
      await reconnect(attempt + 1);
    } else {
      showToast('Connection lost. Please refresh the page.', 'error');
    }
  }
};
```

### Token Expiration

**Strategy**: Automatic token refresh on 401/403 errors with max retry limit

```typescript
let refreshAttempts = 0;
const MAX_REFRESH_ATTEMPTS = 3;

const handleAuthError = async (error) => {
  if (error.statusCode === 401 || error.statusCode === 403) {
    if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
      showToast('Session expired. Please log in again.', 'error');
      navigate('/login');
      return;
    }

    try {
      refreshAttempts++;
      await refreshMomentoToken();
      await reestablishSubscriptions();
      refreshAttempts = 0; // Reset on success
    } catch (refreshError) {
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        showToast('Session expired. Please log in again.', 'error');
        navigate('/login');
      }
    }
  }
};
```

### Notification Handler Failures

**Strategy**: Log errors but don't fail the event processing

```javascript
try {
  await publishToMomento(topicName, message);
} catch (error) {
  logger.error('Failed to publish to Momento', {
    error: error.message,
    topicName,
    notificationType: notification.type
  });
  // Don't throw - notification is still persisted in DynamoDB
}
```

## Testing Strategy

### Unit Tests

1. **Momento Client Tests**
   - Test subscription/unsubscription lifecycle
   - Test message routing (tenant vs tasks)
   - Test token refresh logic
   - Mock Momento SDK

2. **Pre-Token Generation Tests**
   - Test team membership queries
   - Test permission generation
   - Test token creation
   - Mock DynamoDB and Momento SDK

3. **Notification Handler Tests**
   - Test EventBridge event processing
   - Test DynamoDB persistence
   - Test Momento publishing
   - Mock all AWS services

4. **Token Refresh Tests**
   - Test JWT validation
   - Test team membership queries
   - Test token generation
   - Mock authentication and DynamoDB

### Integration Tests

1. **End-to-End Notification Flow**
   - Trigger async operation (e.g., generate clip)
   - Verify EventBridge event published
   - Verify notification stored in DynamoDB
   - Verify Momento message published
   - Verify frontend receives message

2. **Token Refresh Flow**
   - Simulate token expiration
   - Verify refresh endpoint called
   - Verify new token received
   - Verify subscriptions re-established

3. **Team Switch Flow**
   - Switch active team in UI
   - Verify old subscriptions closed
   - Verify new subscriptions established
   - Verify correct notifications received

## Deployment Considerations

### Environment Variables

**New Variables**:
- `MOMENTO_API_KEY`: Momento API key for server-side operations
- `MOMENTO_CACHE_NAME`: Momento cache name for topics

**Frontend Environment**:
- Momento token comes from JWT, no environment variable needed

### IAM Permissions

**Pre-Token Generation Trigger**:
- `dynamodb:Query` on GSI1 for team memberships
- No Momento permissions needed (uses API key)

**Token Refresh Function**:
- `dynamodb:Query` on GSI1 for team memberships
- No Momento permissions needed (uses API key)

**Notification Handler**:
- `dynamodb:PutItem` for persisting notifications
- No Momento permissions needed (uses API key)

### Momento Configuration

**Cache Setup**:
- Create Momento cache for topics
- Generate API key with appropriate permissions
- Store API key in AWS Systems Manager Parameter Store
- Reference in SAM template as secure parameter

**Topic Naming Convention**:
- Tenant topics: `{teamId}` (UUID format)
- Tasks topics: `{teamId}_tasks`
- User topics: `{userId}` (for future use)

## Performance Optimization

### Connection Pooling

**Momento Client**: Reuse TopicClient instance across subscriptions

```typescript
let topicClient: TopicClient | null = null;

const getTopicClient = (token: string) => {
  if (!topicClient) {
    topicClient = new TopicClient({
      configuration: Configurations.Browser.latest(),
      credentialProvider: CredentialProvider.fromString(token)
    });
  }
  return topicClient;
};
```

### Message Batching

**Not Required**: Momento Topics handles message delivery efficiently without batching

### Subscription Management

**Strategy**: Minimize subscription churn by only unsubscribing when necessary

```typescript
// Only unsubscribe if tenant actually changed
if (newTenantId !== currentTenantId) {
  await unsubscribe();
  await subscribe(newTenantId, token);
}
```

## Security Considerations

### Token Scoping

**Principle**: Users can only access topics for teams they belong to

**Implementation**: Pre-token generation trigger queries actual team memberships and generates scoped token

### Token Expiration

**Duration**: 1 hour (configurable)

**Refresh Strategy**: Automatic refresh on 401/403 errors

### Message Validation

**Frontend**: Validate message structure before processing

```typescript
const isValidMessage = (msg: any): msg is MomentoMessage => {
  return (
    typeof msg.type === 'string' &&
    typeof msg.title === 'string' &&
    typeof msg.message === 'string' &&
    typeof msg.url === 'string' &&
    typeof msg.timestamp === 'string'
  );
};
```

## Migration Path

### Phase 1: Infrastructure Setup
1. Add Momento configuration to SAM template
2. Deploy notification handler Lambda
3. Update pre-token generation trigger
4. Deploy token refresh endpoint

### Phase 2: Backend Integration
1. Update all async operation handlers to publish notification events
2. Test EventBridge → Notification Handler flow
3. Verify Momento messages published

### Phase 3: Frontend Integration
1. Add Momento SDK to frontend dependencies
2. Implement NotificationContext
3. Update authentication flow to extract Momento token
4. Implement token refresh logic

### Phase 4: Testing and Rollout
1. Test with small group of users
2. Monitor Momento usage and costs
3. Gradually roll out to all users
4. Remove old notification polling logic (if any)

## Monitoring and Observability

### CloudWatch Metrics

**Custom Metrics**:
- `NotificationPublished`: Count of notifications published to Momento
- `NotificationPersisted`: Count of notifications stored in DynamoDB
- `TokenRefreshRequests`: Count of token refresh requests
- `SubscriptionErrors`: Count of subscription failures

### CloudWatch Logs

**Log Groups**:
- `/aws/lambda/notification-handler`: Notification handler logs
- `/aws/lambda/token-refresh`: Token refresh logs
- `/aws/lambda/pre-token-generation`: Auth trigger logs

**Key Log Events**:
- Notification event received
- Momento publish success/failure
- Token generation success/failure
- Subscription errors

### Alarms

**Critical Alarms**:
- Notification handler error rate > 5%
- Token refresh failure rate > 10%
- Momento publish failure rate > 5%

**Warning Alarms**:
- Token refresh requests > 1000/minute (potential token expiration issue)
- Subscription errors > 100/minute (potential connectivity issue)

