# Team Context Token Refresh

## Overview

When a user changes their active team, their JWT token needs to be refreshed immediately to include the updated team context. This ensures that all subsequent API calls use the correct tenant context.

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

### 2. API Signals Token Refresh Required
The API response includes a `requiresTokenRefresh` flag:
```json
{
  "activeTeamId": "new-team-id",
  "message": "Active team updated successfully",
  "requiresTokenRefresh": true
}
```

### 3. Client Refreshes Token
When `requiresTokenRefresh` is true, the client should immediately refresh their token:

```javascript
if (result.requiresTokenRefresh) {
  // Using AWS Amplify
  const session = await Auth.currentSession();
  const newToken = session.getIdToken().getJwtToken();

  // Or using AWS Cognito SDK directly
  const cognitoUser = await Auth.currentAuthenticatedUser();
  const session = await cognitoUser.getSession();
  const newToken = session.getIdToken().getJwtToken();

  // Update stored token
  localStorage.setItem('authToken', newToken);
}
```

### 4. New Token Contains Updated Team Context
The refreshed token will include the new team information:
```json
{
  "sub": "user-123",
  "tenantId": "new-team-id",
  "activeTeamId": "new-team-id",
  "teamContextVersion": "2025-01-15T10:45:00Z",
  "exp": 1642248000
}
```

## Implementation Notes

### Pre-Token Generation Trigger
The `pre-token-generation.mjs` function automatically:
1. Fetches the user's current profile
2. Determines the correct tenant context (team ID or user ID)
3. Includes team context version for tracking changes
4. Adds claims to the JWT token

### Team Context Version
The `teamContextVersion` claim tracks when the user's team assignments change:
- Updated whenever `activeTeamId` is modified
- Used by clients to detect when team context has changed
- Helps with cache invalidation and state management

### Error Handling
If token refresh fails:
```javascript
try {
  const newToken = await refreshToken();
  // Continue with new token
} catch (error) {
  // Redirect to login or show error
  console.error('Token refresh failed:', error);
  redirectToLogin();
}
```

## Security Considerations

1. **Immediate Refresh**: Token refresh should happen immediately after team change
2. **Validation**: The authorizer validates team membership on every request
3. **Expiration**: Tokens have standard expiration times regardless of team changes
4. **Audit Trail**: Team changes are logged in DynamoDB with timestamps

## Client Implementation Example

```javascript
class TeamManager {
  async setActiveTeam(teamId) {
    try {
      const response = await this.apiCall('/me/teams', {
        method: 'POST',
        body: JSON.stringify({ teamId })
      });

      const result = await response.json();

      if (result.requiresTokenRefresh) {
        await this.refreshToken();
      }

      // Update UI state
      this.updateTeamContext(result.activeTeamId);

      return result;
    } catch (error) {
      console.error('Failed to set active team:', error);
      throw error;
    }
  }

  async refreshToken() {
    const session = await Auth.currentSession();
    const newToken = session.getIdToken().getJwtToken();

    // Update stored token
    this.setAuthToken(newToken);

    // Emit event for other components
    this.emit('tokenRefreshed', newToken);
  }
}
```
