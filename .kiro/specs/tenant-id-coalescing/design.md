# Design Document

## Overview

This design updates the authentication and authorization flow to deprecate the `custom:tenantId` Cognito attribute and implement a coalescing strategy where `tenantId` is derived from either `activeTeamId` or `userId`. The change ensures users always have a valid tenant context and that Momento tokens grant access to all relevant notification topics (personal and all teams).

## Architecture

### Current State

- Authorizer reads `custom:tenantId` from Cognito attributes and falls back to `userId`
- Pre-token generation sets `tenantId` claim based on `activeTeamId` or `userId`
- Momento token generation creates permissions for the current `tenantId` and all teams
- Refresh token handler generates new Momento tokens with team permissions

### Proposed Changes

1. **Authorizer**: Remove dependency on `custom:tenantId`, always coalesce from `activeTeamId` or `userId`
2. **Pre-Token Generation**: Continue current behavior (already correct)
3. **Momento Token Generation**: Update to always include userId topic plus all team topics
4. **Refresh Token Handler**: Continue current behavior (already correct)

## Components and Interfaces

### 1. Authorizer Function (`functions/auth/authorizer.mjs`)

**Current Logic:**
```javascript
const tokenTenantId = userInfo['custom:tenantId'] || decoded.tenantId || userId;
const tenantId = userProfile?.activeTeamId || tokenTenantId;
```

**Updated Logic:**
```javascript
const tenantId = userProfile?.activeTeamId || userId;
```

**Changes:**
- Remove reading of `custom:tenantId` attribute
- Simplify coalescing to: `activeTeamId` → `userId`
- Continue fetching user profile from DynamoDB
- Continue passing `tenantId`, `userId`, and `activeTeamId` in context

**Interface:**
- **Input**: API Gateway request event with Authorization header
- **Output**: IAM policy with context containing `tenantId`, `userId`, `activeTeamId`, `email`

### 2. Pre-Token Generation Trigger (`functions/auth/pre-token-generation.mjs`)

**Current Logic:**
```javascript
const tenantId = userProfile?.activeTeamId || userId;
const activeTeamId = userProfile?.activeTeamId || null;
```

**Status:** Already correct, no changes needed

**Behavior:**
- Fetches user profile from DynamoDB
- Coalesces `tenantId` from `activeTeamId` or `userId`
- Adds `tenantId` and `activeTeamId` claims to JWT
- Generates Momento token with permissions for all teams

### 3. Momento Token Generator (`functions/utils/momento.mjs`)

**Current Logic:**
```javascript
const permissions = [
  { role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: tenantId },
  { role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: `${tenantId}_tasks` }
];

for (const team of teams) {
  if (team.teamId !== tenantId) {
    permissions.push({ role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: team.teamId });
    permissions.push({ role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: `${team.teamId}_tasks` });
  }
}
```

**Updated Logic:**
```javascript
const permissions = [
  { role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: userId },
  { role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: `${userId}_tasks` }
];

for (const team of teams) {
  permissions.push({ role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: team.teamId });
  permissions.push({ role: TopicRole.SubscribeOnly, cache: CACHE_NAME, topic: `${team.teamId}_tasks` });
}
```

**Changes:**
- Always create permissions for `userId` topic (personal namespace)
- Always create permissions for `userId_tasks` topic
- Create permissions for all team topics (remove conditional check)
- Remove dependency on `tenantId` parameter for personal topic

**Interface:**
- **Input**: `tenantId` (for logging), `userId`, `teams` array
- **Output**: Momento auth token string or null

### 4. Refresh Token Handler (`functions/tokens/refresh-token.mjs`)

**Current Logic:**
```javascript
const teams = await getUserTeams(userId);
const momentoToken = await generateMomentoToken(tenantId, userId, teams);
```

**Status:** Already correct, no changes needed

**Behavior:**
- Retrieves all active team memberships
- Generates Momento token with permissions for all teams
- token with expiration timestamp

## Data Models

### User Profile
```javascript
{
  pk: "user#{userId}",
  sk: "profile",
  email: "user@example.com",
  name: "John Doe",
  activeTeamId: "team-uuid" | null,  // Used for tenantId coalescing
  // ... other fields
}
```

### Team Membership
```javascript
{
  pk: "team#{teamId}",
  sk: "member#{userId}",
  GSI1PK: "user#{userId}#teams",
  GSI1SK: "{timestamp}#{teamId}",
  userId: "user-uuid",
  teamId: "team-uuid",
  role: "owner|administrator|member",
  status: "active|removed",  // Only active memberships used for permissions
  // ... other fields
}
```

### Authorization Context
```javascript
{
  tenantId: "team-uuid" | "user-uuid",  // Coalesced value
  userId: "user-uuid",                   // Always present
  activeTeamId: "team-uuid" | null,      // Present if user has active team
  email: "user@example.com"
}
```

### JWT Claims
```javascript
{
  sub: "user-uuid",
  email: "user@example.com",
  tenantId: "team-uuid" | "user-uuid",  // Custom claim
  activeTeamId: "team-uuid" | null,      // Custom claim
  momentoToken: "token-string",          // Custom claim
  // ... standard claims
}
```

### Momento Permissions
```javascript
[
  { role: "SubscribeOnly", cache: "cache-name", topic: "user-uuid" },
  { role: "SubscribeOnly", cache: "cache-name", topic: "user-uuid_tasks" },
  { role: "SubscribeOnly", cache: "cache-name", topic: "team-uuid-1" },
  { role: "SubscribeOnly", cache: "cache-name", topic: "team-uuid-1_tasks" },
  { role: "SubscribeOnly", cache: "cache-name", topic: "team-uuid-2" },
  { role: "SubscribeOnly", cache: "cache-name", topic: "team-uuid-2_tasks" }
]
```

## Error Handling

### Authorizer Errors
- **Missing Authorization header**: Return "Unauthorized" error
- **Invalid token format**: Return "Unauthorized" error
- **Token verification failure**: Return "Unauthorized" error
- **Missing userId**: Return "Unauthorized" error
- **DynamoDB errors**: Log error, continue with userId as tenantId

### Pre-Token Generation Errors
- **DynamoDB errors**: Log error, use userId as tenantId
- **Momento token generation failure**: Log error, continue without momentoToken claim
- **Missing userId**: Throw error to prevent authentication

### Refresh Token Handler Errors
- **Missing userId or tenantId**: Return 401 Unauthorized
- **DynamoDB errors**: Log error, return empty teams array
- **Momento token generation failure**: Return 500 Internal Server Error

### Momento Token Generator Errors
- **API key missing**: Log error, return null
- **Token generation failure**: Log error, return null
- **Invalid permissions**: Log error, return null

## Testing Strategy

### Unit Tests

#### Authorizer Tests
1. Test tenantId coalescing when activeTeamId is present
2. Test tenantId coalescing when activeTeamId is null
3. Test tenantId coalescing when user profile doesn't exist
4. Test authorization context includes correct values
5. Test error handling for missing Authorization header
6. Test error handling for invalid token format

#### Pre-Token Generation Tests
1. Test tenantId claim when activeTeamId is present
2. Test tenantId claim when activeTeamId is null
3. Test activeTeamId claim is included when present
4. Test activeTeamId claim is null when not present
5. Test Momento token generation with multiple teams
6. Test error handling when user profile fetch fails

#### Momento Token Generator Tests
1. Test permissions include userId topic
2. Test permissions include userId_tasks topic
3. Test permissions include all team topics
4. Test permissions include all team task topics
5. Test no duplicate permissions are created
6. Test token generation with empty teams array
7. Test token generation with single team
8. Test token generation with multiple teams

#### Refresh Token Handler Tests
1. Test Momento token generation with user teams
2. Test error handling when userId is missing
3. Test error handling when team fetch fails
4. Test response includes token and expiration

### Integration Tests

#### End-to-End Authentication Flow
1. User logs in with Cognito
2. Pre-token generation adds custom claims
3. JWT token includes tenantId and activeTeamId
4. Authorizer validates token and sets context
5. Downstream functions receive correct tenantId

#### Team Switching Flow
1. User switches active team
2. User refreshes authentication
3. New JWT includes updated tenantId
4. Authorizer uses new activeTeamId
5. Momento token includes all team permissions

#### Notification Subscription Flow
1. User authenticates and receives Momento token
2. Frontend subscribes to userId topic
3. Frontend subscribes to all team topics
4. Notifications are received on correct topics
5. Token refresh maintains subscriptions

### Manual Testing

#### Scenarios to Test
1. New user with no teams (tenantId = userId)
2. User with one team, team is active (tenantId = teamId)
3. User with multiple teams, one is active (tenantId = activeTeamId)
4. User switches teams (tenantId updates)
5. User leaves active team (tenantId falls back to userId)
6. User receives notifications on personal topic
7. User receives notifications on team topics
8. Token refresh maintains access to all topics

## Migration Considerations

### Backward Compatibility
- `custom:tenantId` attribute will remain in Cognito but will not be read
- Existing tokens with `custom:tenantId` will continue to work until expiration
- No database migration required
- No frontend changes required

### Deployment Strategy
1. Deploy updated Lambda functions
2. Verify authorizer uses activeTeamId/userId coalescing
3. Verify pre-token generation adds correct claims
4. Verify Momento tokens include all team permissions
5. Monitor CloudWatch logs for errors
6. Test with multiple user scenarios

### Rollback Plan
- Revert Lambda function code to previous version
- No data changes to rollback
- Existing tokens remain valid

## Performance Considerations

### DynamoDB Queries
- Authorizer: 1 GetItem per request (user profile)
- Pre-token generation: 1 GetItem + 1 Query per authentication (user profile + teams)
- Refresh token: 1 Query per request (user teams)

### Caching Opportunities
- User profile could be cached in Lambda memory (with TTL)
- Team memberships could be cached in Lambda memory (with TTL)
- Not implementing initially to keep logic simple

### Momento Token Size
- Each team adds 2 permissions (standard + tasks topic)
- User with 10 teams = 22 permissions (2 for user + 20 for teams)
- Token size should remain within Momento limits

## Security Considerations

### Authorization
- tenantId always derived from trusted sources (DynamoDB user profile)
- Cannot be manipulated by client
- Authorizer validates JWT before setting context

### Data Isolation
- Each team has isolated notification topic
- Users only receive permissions for teams they belong to
- Personal namespace (userId) is always accessible

### Token Security
- Momento tokens expire after 15 minutes
- Refresh endpoint requires valid JWT
- SubscribeOnly role prevents publishing to topics

## Logging and Monitoring

### Key Metrics
- Authorizer invocations and errors
- Pre-token generation invocations and errors
- Momento token generation success/failure rate
- Refresh token endpoint usage

### Log Events
- Authorizer: Log tenantId coalescing decision
- Pre-token generation: Log team count and Momento token generation
- Momento generator: Log permission count and topics
- Refresh token: Log team retrieval and token generation

### Alerts
- High authorizer error rate
- Momento token generation failures
- Refresh token endpoint errors
- Missing user profiles

