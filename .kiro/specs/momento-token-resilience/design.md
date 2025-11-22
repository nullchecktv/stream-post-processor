# Design Document

## Overview

This design enhances the Momento token management system to handle the mismatch between Momento token expiration (15 minutes) and JWT expiration (1 day). The solution uses localStorage as a fallback token store, implements proactive token refresh, and ensures immediate Cognito JWT refresh when switching teams to update tenant context.

## Architecture

### Token Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Authentication                           │
│  - Cognito returns JWT with Momento token in custom claims      │
│  - Momento token valid for 15 minutes                            │
│  - JWT valid for 1 day                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Initial Subscription Establishment                  │
│  1. Extract Momento token from JWT                               │
│  2. Store token in localStorage with expiration                  │
│  3. Subscribe to tenant and tasks topics                         │
│  4. Set up proactive refresh timer (13 minutes)                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Token Expiration Scenarios                      │
└─────────────────────────────────────────────────────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ Proactive Refresh│  │ Subscription Fail│  │  Team Switch     │
│ (13 min timer)   │  │ (401/403 error)  │  │  (immediate)     │
└──────────────────┘  └──────────────────┘  └──────────────────┘
         │                    │                    │
         └────────────────────┴────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Token Refresh Flow                            │
│  1. Check localStorage for valid token                           │
│  2. If valid, use localStorage token                             │
│  3. If invalid/missing, call /tokens/refresh                     │
│  4. Store new token in localStorage                              │
│  5. Re-establish subscriptions                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Team Switch Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Switches Team                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Call Cognito Token Refresh                          │
│  - Use stored refresh token                                      │
│  - Triggers pre-token generation Lambda                          │
│  - New JWT has updated tenantId and Momento token                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Update Authentication State                         │
│  1. Store new JWT and ID token                                   │
│  2. Extract new tenantId from claims                             │
│  3. Extract new Momento token from claims                        │
│  4. Update localStorage with new token                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Update Momento Subscriptions                        │
│  1. Unsubscribe from old tenant topics                           │
│  2. Subscribe to new tenant topics with new token                │
│  3. Reset proactive refresh timer                                │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. Token Storage Manager

**Location**: `frontend/src/utils/tokenStorage.ts`

**Purpose**: Centralized management of Momento token storage in localStorage

**Interface**:
```typescript
interface StoredToken {
  token: string;
  expiresAt: number; // Unix timestamp
  issuedAt: number;  // Unix timestamp
}

export const tokenStorage = {
  save: (token: string, expiresInSeconds: number) => void;
  get: () => StoredToken | null;
  isValid: () => boolean;
  isExpiringSoon:sholdSeconds: number) => boolean;
  clear: () => void;
};
```

**Implementation Details**:
```typescript
const STORAGE_KEY = 'momento_token';
const TOKEN_LIFETIME_SECONDS = 15 * 60; // 15 minutes

export const tokenStorage = {
  save(token: string, expiresInSeconds: number = TOKEN_LIFETIME_SECONDS) {
    const now = Date.now();
    const stored: StoredToken = {
      token,
      expiresAt: now + (expiresInSeconds * 1000),
      issuedAt: now
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  },

  get(): StoredToken | null {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (!item) return null;
      return JSON.parse(item);
    } catch {
      this.clear();
      return null;
    }
  },

  isValid(): boolean {
    const stored = this.get();
    if (!stored) return false;
    return Date.now() < stored.expiresAt;
  },

  isExpiringSoon(thresholdSeconds: number = 120): boolean {
    const stored = this.get();
    if (!stored) return true;
    const timeUntilExpiry = stored.expiresAt - Date.now();
    return timeUntilExpiry < (thresholdSeconds * 1000);
  },

  clear() {
    localStorage.removeItem(STORAGE_KEY);
  }
};
```

### 2. Enhanced NotificationContext

**Location**: `frontend/src/contexts/NotificationContext.tsx`

**New State**:
```typescript
interface NotificationState {
  unreadCount: number;
  currentTenantId: string | null;
  isSubscribed: boolean;
  refreshAttempts: number;
  proactiveRefreshTimer: NodeJS.Timeout | null;
}
```

**Enhanced Methods**:

#### `initializeSubscriptions`
```typescript
const initializeSubscriptions = async (tenantId: string, jwtToken: string) => {
  try {
    // Extract Momento token from JWT
    const momentoToken = extractMomentoToken(jwtToken);

    // Store in localStorage
    tokenStorage.save(momentoToken);

    // Subscribe to topics
    await subscribeToTopics(tenantId, momentoToken);

    // Set up proactive refresh (13 minutes)
    setupProactiveRefresh();

    setState(prev => ({
      ...prev,
      currentTenantId: tenantId,
      isSubscribed: true,
      refreshAttempts: 0
    }));
  } catch (error) {
    console.error('Failed to initialize subscriptions:', error);
    throw error;
  }
};
```

#### `handleSubscriptionError`
```typescript
const handleSubscriptionError = async (error: any) => {
  // Check if it's an auth error
  if (error.statusCode !== 401 && error.statusCode !== 403) {
    throw error;
  }

  // Increment refresh attempts
  const attempts = state.refreshAttempts + 1;
  setState(prev => ({ ...prev, refreshAttempts: attempts }));

  // Max 3 attempts
  if (attempts > 3) {
    showToast('Session expired. Please log in again.', 'error');
    navigate('/login');
    return;
  }

  try {
    // Try localStorage token first
    if (tokenStorage.isValid()) {
      const stored = tokenStorage.get();
      if (stored) {
        await reestablishSubscriptions(stored.token);
        setState(prev => ({ ...prev, refreshAttempts: 0 }));
        return;
      }
    }

    // Call refresh endpoint
    const newToken = await refreshMomentoToken();
    tokenStorage.save(newToken);

    // Re-establish subscriptions
    await reestablishSubscriptions(newToken);

    // Reset attempts on success
    setState(prev => ({ ...prev, refreshAttempts: 0 }));
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
    // Will retry on next error if under max attempts
  }
};
```

#### `setupProactiveRefresh`
```typescript
const setupProactiveRefresh = () => {
  // Clear existing timer
  if (state.proactiveRefreshTimer) {
    clearTimeout(state.proactiveRefreshTimer);
  }

  // Set timer for 13 minutes (2 minutes before expiration)
  const timer = setTimeout(async () => {
    try {
      const newToken = await refreshMomentoToken();
      tokenStorage.save(newToken);
      await reestablishSubscriptions(newToken);

      // Set up next refresh
      setupProactiveRefresh();
    } catch (error) {
      console.error('Proactive refresh failed:', error);
      // Will be handled on next subscription error
    }
  }, 13 * 60 * 1000); // 13 minutes

  setState(prev => ({ ...prev, proactiveRefreshTimer: timer }));
};
```

#### `handleTeamSwitch`
```typescript
const handleTeamSwitch = async (newTenantId: string) => {
  try {
    // Refresh Cognito JWT to get new claims
    const newJwt = await refreshCognitoToken();

    // Update auth state with new JWT
    updateAuthState(newJwt);

    // Extract new Momento token
    const newMomentoToken = extractMomentoToken(newJwt);

    // Store new token
    tokenStorage.save(newMomentoToken);

    // Unsubscribe from old topics
    await unsubscribeFromTopics(state.currentTenantId);

    // Subscribe to new topics
    await subscribeToTopics(newTenantId, newMomentoToken);

    // Reset proactive refresh timer
    setupProactiveRefresh();

    setState(prev => ({
      ...prev,
      currentTenantId: newTenantId,
      refreshAttempts: 0
    }));
  } catch (error) {
    console.error('Team switch failed:', error);
    showToast('Failed to switch teams. Please try again.', 'error');
    throw error;
  }
};
```

### 3. Cognito Token Refresh

**Location**: `frontend/src/api/auth.ts`

**New Function**:
```typescript
export const refreshCognitoToken = async (): Promise<string> => {
  const { Auth } = await import('@aws-amplify/auth');

  try {
    // Get current session
    const session = await Auth.currentSession();

    // Force refresh
    const cognitoUser = await Auth.currentAuthenticatedUser();
    const newSession = await cognitoUser.refreshSession(
      session.getRefreshToken()
    );

    // Return new JWT
    return newSession.getIdToken().getJwtToken();
  } catch (error) {
    console.error('Cognito token refresh failed:', error);
    throw new Error('Failed to refresh authentication');
  }
};
```

### 4. Enhanced AuthContext Integration

**Location**: `frontend/src/contexts/AuthContext.tsx`

**New Method**:
```typescript
const refreshAuthToken = async () => {
  try {
    const newJwt = await refreshCognitoToken();

    // Parse JWT to extract claims
    const payload = parseJwt(newJwt);

    // Update state
    setUser(prev => ({
      ...prev,
      tenantId: payload['custom:tenantId'],
      momentoToken: payload['custom:momentoToken']
    }));

    // Store new JWT
    localStorage.setItem('jwt_token', newJwt);

    return newJwt;
  } catch (error) {
    console.error('Auth token refresh failed:', error);
    // Log out user
    await signOut();
    throw error;
  }
};
```

### 5. Team Switch Handler

**Location**: `frontend/src/api/teams.ts`

**Enhanced Function**:
```typescript
export const setActiveTeam = async (teamId: string) => {
  try {
    // Call backend to update active team
    await apiClient.put(`/users/me/active-team`, { teamId });

    // Refresh Cognito token to get new claims
    const { refreshAuthToken } = useAuth();
    await refreshAuthToken();

    // Notification context will handle subscription updates
    const { handleTeamSwitch } = useNotifications();
    await handleTeamSwitch(teamId);

    return true;
  } catch (error) {
    console.error('Failed to set active team:', error);
    throw error;
  }
};
```

## Data Models

### LocalStorage Token Structure

```typescript
interface StoredToken {
  token: string;        // Momento auth token
  expiresAt: number;    // Unix timestamp (milliseconds)
  issuedAt: number;     // Unix timestamp (milliseconds)
}

// Example
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": 1705329600000,  // 15 minutes from issuedAt
  "issuedAt": 1705328700000
}
```

### JWT Custom Claims

```typescript
interface JwtClaims {
  'custom:tenantId': string;
  'custom:momentoToken': string;
  'custom:userId': string;
  'custom:role': string;
  // ... other standard JWT claims
}
```

## Error Handling

### Subscription Error Handling

```typescript
const handleSubscriptionError = async (error: any) => {
  // Not an auth error - propagate
  if (error.statusCode !== 401 && error.statusCode !== 403) {
    console.error('Subscription error:', error);
    showToast('Connection error. Retrying...', 'warning');
    return;
  }

  // Check retry limit
  if (state.refreshAttempts >= 3) {
    showToast('Session expired. Please log in again.', 'error');
    navigate('/login');
    return;
  }

  // Increment attempts
  setState(prev => ({ ...prev, refreshAttempts: prev.refreshAttempts + 1 }));

  try {
    // Try localStorage first
    if (tokenStorage.isValid()) {
      const stored = tokenStorage.get();
      if (stored) {
        await reestablishSubscriptions(stored.token);
        setState(prev => ({ ...prev, refreshAttempts: 0 }));
        return;
      }
    }

    // Call refresh endpoint
    const newToken = await refreshMomentoToken();
    tokenStorage.save(newToken);
    await reestablishSubscriptions(newToken);
    setState(prev => ({ ...prev, refreshAttempts: 0 }));
  } catch (refreshError) {
    console.error('Token refresh failed:', refreshError);
    // Will retry on next error if under limit
  }
};
```

### Team Switch Error Handling

```typescript
const handleTeamSwitch = async (newTenantId: string) => {
  const previousTenantId = state.currentTenantId;

  try {
    // Refresh Cognito token
    const newJwt = await refreshCognitoToken();
    updateAuthState(newJwt);

    // Extract and store new Momento token
    const newMomentoToken = extractMomentoToken(newJwt);
    tokenStorage.save(newMomentoToken);

    // Update subscriptions
    await unsubscribeFromTopics(previousTenantId);
    await subscribeToTopics(newTenantId, newMomentoToken);

    setState(prev => ({ ...prev, currentTenantId: newTenantId }));
  } catch (error) {
    console.error('Team switch failed:', error);

    // Revert to previous tenant
    showToast('Failed to switch teams. Please try again.', 'error');

    // Keep user on current team
    setState(prev => ({ ...prev, currentTenantId: previousTenantId }));

    throw error;
  }
};
```

### Corrupted Token Handling

```typescript
const getValidToken = (): string | null => {
  try {
    const stored = tokenStorage.get();

    if (!stored) return null;

    // Check expiration
    if (Date.now() >= stored.expiresAt) {
      tokenStorage.clear();
      return null;
    }

    // Validate token format (basic check)
    if (!stored.token || typeof stored.token !== 'string') {
      tokenStorage.clear();
      return null;
    }

    return stored.token;
  } catch (error) {
    console.error('Token validation failed:', error);
    tokenStorage.clear();
    return null;
  }
};
```

## Testing Strategy

### Unit Tests

1. **Token Storage Tests** (`tokenStorage.test.ts`)
   - Test save/get/clear operations
   - Test expiration checking
   - Test corrupted data handling
   - Test isExpiringSoon logic

2. **NotificationContext Tests** (`NotificationContext.test.tsx`)
   - Test subscription initialization
   - Test subscription error handling
   - Test proactive refresh timer
   - Test team switch flow
   - Mock Momento SDK and API calls

3. **Auth Integration Tests** (`auth.test.ts`)
   - Test Cognito token refresh
   - Test JWT parsing
   - Test auth state updates

### Integration Tests

1. **Token Lifecycle Test**
   - Initialize subscriptions
   - Wait for token to expire
   - Verify automatic refresh
   - Verify subscriptions maintained

2. **Team Switch Test**
   - Switch active team
   - Verify Cognito token refreshed
   - Verify new subscriptions established
   - Verify old subscriptions closed

3. **Error Recovery Test**
   - Simulate subscription failure
   - Verify localStorage fallback
   - Verify refresh endpoint called
   - Verify subscriptions re-established

## Performance Considerations

### Proactive Refresh Timing

**Strategy**: Refresh 2 minutes before expiration (at 13 minutes)

**Rationale**:
- Provides buffer for network latency
- Prevents subscription interruptions
- Balances refresh frequency with token lifetime

### LocalStorage Access

**Optimization**: Cache token in memory after first read

```typescript
let cachedToken: StoredToken | null = null;
let cacheTime: number = 0;
const CACHE_TTL = 5000; // 5 seconds

const getToken = (): StoredToken | null => {
  const now = Date.now();

  // Use cache if fresh
  if (cachedToken && (now - cacheTime) < CACHE_TTL) {
    return cachedToken;
  }

  // Read from localStorage
  cachedToken = tokenStorage.get();
  cacheTime = now;

  return cachedToken;
};
```

### Subscription Re-establishment

**Strategy**: Minimize subscription churn

```typescript
const reestablishSubscriptions = async (newToken: string) => {
  // Only re-establish if currently subscribed
  if (!state.isSubscribed || !state.currentTenantId) {
    return;
  }

  // Unsubscribe and re-subscribe with new token
  await unsubscribeFromTopics(state.currentTenantId);
  await subscribeToTopics(state.currentTenantId, newToken);
};
```

## Security Considerations

### Token Storage

**Risk**: LocalStorage accessible to JavaScript

**Mitigation**:
- Tokens are short-lived (15 minutes)
- Tokens are scoped to specific topics
- XSS protection via Content Security Policy
- Regular security audits

### Token Refresh

**Risk**: Refresh endpoint could be abused

**Mitigation**:
- Requires valid JWT for authentication
- Rate limiting on endpoint
- Tokens are scoped to user's actual team memberships

### Team Switch

**Risk**: User could attempt to switch to unauthorized team

**Mitigation**:
- Backend validates team membership before updating
- Cognito pre-token generation only includes authorized teams
- Frontend validates response before updating state

## Migration Path

### Phase 1: Add Token Storage
1. Create tokenStorage utility
2. Update NotificationContext to use localStorage
3. Test with existing token refresh flow

### Phase 2: Add Proactive Refresh
1. Implement proactive refresh timer
2. Test refresh timing
3. Monitor refresh frequency

### Phase 3: Add Team Switch Enhancement
1. Implement Cognito token refresh
2. Update team switch handler
3. Test subscription updates

### Phase 4: Testing and Rollout
1. Test all error scenarios
2. Monitor token refresh metrics
3. Gradually roll out to users

## Monitoring

### Metrics to Track

1. **Token Refresh Frequency**
   - Proactive refreshes per hour
   - Error-triggered refreshes per hour
   - Failed refresh attempts

2. **Subscription Health**
   - Subscription failures per hour
   - Re-establishment success rate
   - Average time to recover from failure

3. **Team Switch Performance**
   - Average team switch duration
   - Team switch failure rate
   - Cognito refresh success rate

### Logging

**Key Events to Log**:
- Token stored in localStorage
- Token retrieved from localStorage
- Token expired/invalid
- Proactive refresh triggered
- Subscription error occurred
- Token refresh called
- Team switch initiated
- Cognito token refreshed

