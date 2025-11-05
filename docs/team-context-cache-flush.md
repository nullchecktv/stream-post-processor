# Team Context Cache Flush

## Overview

When a user changes their active team, the API automatically flushes the API Gateway authorizer cache to ensure that the next request uses the correct tenant context. This provides immediate effect without requiring any special client-side handling.

## How It Works

### 1. User Changes Active Team
```javascript
const response = await fetch('/api/me/teams', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${currentToken}`
  },
  body: JSON.stringify({ teamId: 'new-team-id' })
});

const result = await response.json();
```

### 2. Server-Side Cache Flush
After successfully updating the user's active team in the database, the API automatically calls:
```javascript
await apiGateway.send(new FlushStageAuthorizersCacheCommand({
  restApiId: process.env.API_ID,
  stageName: 'api'
}));
```

### 3. Immediate Effect
The very next API request will:
1. Miss the authorizer cache (since it was flushed)
2. Execute the authorizer function fresh
3. Fetch the updated user profile from DynamoDB
4. Use the new team context for authorization

### 4. API Response
```json
{
  "activeTeamId": "new-team-id",
  "message": "Active team updated successfully",
  "requiresTokenRefresh": false
}
```

## Implementation Details

### IAM Permissions
The `SetActiveTeamFunction` has permission to flush the authorizer cache:
```yaml
- Effect: Allow
  Action:
    - apigateway:FlushStageAuthorizersCache
  Resource: !Sub "arn:${AWS::Partition}:apigateway:${AWS::Region}::/restapis/${Api}/stages/api/authorizers/cache"
```

### Error Handling
If the cache flush fails, the operation continues successfully:
```javascript
try {
  await apiGateway.send(new FlushStageAuthorizersCacheCommand({
    restApiId: process.env.API_ID,
    stageName: process.env.STAGE_NAME || 'api'
  }));
} catch (cacheError) {
  console.error('Failed to flush authorizer cache:', cacheError);
  // Don't fail the request if cache flush fails
}
```

### Authorizer Behavior
The authorizer always fetches fresh user profile data:
```javascript
// Fetch user profile to determine team context
const userProfile = await getUserProfile(userId);

// Resolve tenant context: use active team ID if set, otherwise fallback to token tenantId
const tenantId = userProfile?.activeTeamId || tokenTenantId;
const activeTeamId = userProfile?.activeTeamId || null;
```

## Benefits

1. **Immediate Effect**: Team context changes take effect on the very next API call
2. **Zero Client Changes**: No special headers or token refresh required
3. **Reliable**: Uses AWS API Gateway's built-in cache management
4. **Simple**: Single API call handles everything server-side
5. **Graceful Degradation**: If cache flush fails, the change still takes effect within the normal cache TTL (5 minutes)

## Client Implementation

No special handling required - just make the API call:

```javascript
class TeamManager {
  async setActiveTeam(teamId) {
    try {
      const response = await fetch('/api/me/teams', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ teamId })
      });

      const result = await response.json();

      if (response.ok) {
        // Team context change is immediately effective
        // No additional client-side actions needed
        this.updateUI(result.activeTeamId);
      }

      return result;
    } catch (error) {
      console.error('Failed to set active team:', error);
      throw error;
    }
  }
}
```

## Performance Considerations

- **Cache Flush Impact**: Flushing the cache affects all users temporarily, but the cache rebuilds quickly
- **API Gateway Limits**: FlushStageAuthorizersCache has standard AWS API rate limits
- **Fallback**: If cache flush fails, changes still take effect within the normal cache TTL

## Security Considerations

1. **Permission Scope**: The flush permission is scoped to the specific API and stage
2. **Team Validation**: User membership is still validated before making any changes
3. **Audit Trail**: All team changes are logged in DynamoDB with timestamps
4. **Token Validation**: The Authorization token is still fully validated on every request
