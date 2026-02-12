# Momento Token Refresh Circuit Breaker - Design Document

## Architecture Overview

The circuit breaker will be implemented as a standalone module that wraps the Momento token refresh logic. It will track failures, manage state transitions, and provide hooks for UI feedback.

### Component Structure

```
frontend/src/
├── utils/
│   └── circuitBreaker.ts          # Core circuit breaker logic
├── contexts/
│   └── NotificationContext.tsx    # Updated with circuit breaker integration
├── hooks/
│   └── useCircuitBreaker.ts       # Hook for accessing circuit state
└── components/
    └── activity/
        └── ActivityDropdown.tsx   # Updated with retry button
```

## Core Components

### 1. Circuit Breaker Module (`utils/circuitBreaker.ts`)

**Purpose**: Encapsulate circuit breaker state machine and logic

**Interface**:
```typescript
enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  maxAutoRecoveryAttempts: number;
}

interface CircuitBreakerStatus {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  autoRecoveryAttempts: number;
  canRetry: boolean;
}

class MomentoCircuitBreaker {
  constructor(config: CircuitBreakerConfig);

  recordSuccess(): void;
  recordFailure(error: Error): boolean;
  shouldAttempt(): boolean;
  getStatus(): CircuitBreakerStatus;
  manualReset(): void;

  private transitionToOpen(): void;
  private transitionToHalfOpen(): void;
  private transitionToClosed(): void;
  private scheduleRecovery(): void;
}
```

**State Machine**:
```
CLOSED (normal operation)
  ├─ 3 consecutive 401s → OPEN
  └─ Any success → reset counter

OPEN (circuit tripped)
  ├─ After 5min cooldown → HALF_OPEN
  ├─ Manual reset → HALF_OPEN
  └─ shouldAttempt() returns false

HALF_OPEN (testing recovery)
  ├─ Success → CLOSED
  ├─ Failure → OPEN (increment auto-recovery count)
  └─ shouldAttempt() returns true (once)
```

**Implementation Details**:
- Only 401 errors increment failure count
- Network errors and other HTTP codes don't affect circuit
- Timer-based automatic recovery after cooldown
- Max 3 auto-recovery attempts before requiring manual action
- Thread-safe state transitions (single-threaded JS, but defensive)

### 2. NotificationContext Integration

**Changes Required**:
```typescript
// Add circuit breaker instance
const circuitBreakerRef = useRef<MomentoCircuitBreaker>(
  new MomentoCircuitBreaker({
    failureThreshold: 3,
    cooldownMs: 5 * 60 * 1000,
    maxAutoRecoveryAttempts: 3
  })
);

// Add circuit state to context value
const [circuitStatus, setCircuitStatus] = useState<CircuitBreakerStatus>(
  circuitBreakerRef.current.getStatus()
);

// Update context value interface
interface NotificationContextValue {
  unreadCount: number;
  subscribe: (tenantId: string, token: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  refreshToken: () => Promise<void>;
  handleTeamSwitch: (newTenantId: string) => Promise<void>;
  circuitStatus: CircuitBreakerStatus;
  retryConnection: () => Promise<void>;
}
```

**Token Refresh Wrapper**:
```typescript
const refreshTokenWithCircuitBreaker = async (): Promise<string | null> => {
  if (!circuitBreakerRef.current.shouldAttempt()) {
    console.log('Circuit breaker is open, skipping token refresh');
    return null;
  }

  try {
    const response = await refreshMomentoToken();
    circuitBreakerRef.current.recordSuccess();
    setCircuitStatus(circuitBreakerRef.current.getStatus());
    return response.momentoToken;
  } catch (error) {
    const shouldNotify = circuitBreakerRef.current.recordFailure(error);
    setCircuitStatus(circuitBreakerRef.current.getStatus());

    if (shouldNotify) {
      showToast(
        'Real-time notifications unavailable',
        'error'
      );
    }

    throw error;
  }
};
```

**Subscription Logic Update**:
```typescript
const initializeSubscriptions = async () => {
  // ... existing checks ...

  try {
    let tokenToUse = momentoToken;

    if (!tokenToUse || !tokenStorage.isValid()) {
      const freshToken = await refreshTokenWithCircuitBreaker();
      if (!freshToken) {
        console.log('Circuit breaker prevented token refresh, entering degraded mode');
        return;
      }
      tokenToUse = freshToken;
      updateMomentoToken(tokenToUse);
      tokenStorage.save(tokenToUse);
    }

    await subscribe(tenantId, tokenToUse);
  } catch (error) {
    console.error('Failed to initialize subscriptions:', error);
  }
};
```

**Manual Retry Function**:
```typescript
const retryConnection = useCallback(async () => {
  try {
    circuitBreakerRef.current.manualReset();
    setCircuitStatus(circuitBreakerRef.current.getStatus());

    const freshToken = await refreshTokenWithCircuitBreaker();
    if (!freshToken) {
      throw new Error('Token refresh failed');
    }

    const tenantId = user?.tenantId;
    if (tenantId) {
      await subscribe(tenantId, freshToken);
      showToast('Real-time notifications restored', 'success');
    }
  } catch (error) {
    console.error('Manual retry failed:', error);
    showToast('Failed to restore connection', 'error');
  }
}, [user?.tenantId, subscribe, showToast, updateMomentoToken]);
```

### 3. Circuit Breaker Hook (`hooks/useCircuitBreaker.ts`)

**Purpose**: Provide easy access to circuit breaker status in components

```typescript
export function useCircuitBreaker() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useCircuitBreaker must be used within NotificationProvider');
  }

  return {
    circuitStatus: context.circuitStatus,
    isCircuitOpen: context.circuitStatus.state === CircuitState.OPEN,
    canRetry: context.circuitStatus.canRetry,
    retryConnection: context.retryConnection
  };
}
```

### 4. UI Components

#### ActivityDropdown Updates

**Add Retry Button**:
```typescript
const { isCircuitOpen, canRetry, retryConnection } = useCircuitBreaker();

// In dropdown header, after notification count
{isCircuitOpen && (
  <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm text-yellow-800 dark:text-yellow-200">
        <AlertTriangle className="w-4 h-4" />
        <span>Real-time updates unavailable</span>
      </div>
      {canRetry && (
        <button
          onClick={retryConnection}
          className="text-xs px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700"
        >
          Retry
        </button>
      )}
    </div>
  </div>
)}
```

#### ActivityBadge Updates

**Add Warning Indicator**:
```typescript
const { isCircuitOpen } = useCircuitBreaker();

// Modify badge rendering
<div className="relative">
  <Bell className="w-5 h-5" />
  {unreadCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
      {unreadCount > 9 ? '9+' : unreadCount}
    </span>
  )}
  {isCircuitOpen && (
    <span className="absolute -bottom-1 -right-1 bg-yellow-500 rounded-full w-3 h-3 border-2 border-white dark:border-gray-800" />
  )}
</div>
```

#### Activity Feed Updates

**Add Degraded Mode Message**:
```typescript
const { isCircuitOpen } = useCircuitBreaker();

// At top of activity feed
{isCircuitOpen && (
  <div className="px-4 py-3 bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
      <div className="text-sm text-yellow-800 dark:text-yellow-200">
        <p className="font-medium">Real-time updates paused</p>
        <p className="text-xs mt-1">Activity feed will update when you refresh the page.</p>
      </div>
    </div>
  </div>
)}
```

## Error Handling Strategy

### Error Classification

```typescript
function isAuthenticationError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 401;
  }

  if (error && typeof error === 'object' && 'errorCode' in error) {
    const code = (error as any).errorCode?.();
    return code === 'PERMISSION_ERROR' || code === 'AUTHENTICATION_ERROR';
  }

  return false;
}
```

### Error Handling Flow

1. **Token Refresh Fails**:
   - Check if error is 401/auth error
   - If yes, call `circuitBreaker.recordFailure()`
   - If circuit opens, show single toast notification
   - Return null to indicate degraded mode

2. **Subscription Fails**:
   - Check if error is auth-related
   - If yes and circuit is closed, attempt token refresh
   - If circuit is open, skip retry and continue in degraded mode

3. **Network Errors**:
   - Don't count toward circuit breaker
   - Use existing reconnection logic
   - Circuit breaker only cares about auth failures

## State Management

### Circuit Breaker State

```typescript
interface CircuitBreakerState {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  autoRecoveryAttempts: number;
  recoveryTimer: NodeJS.Timeout | null;
}
```

**State Persistence**: In-memory only, resets on page refresh (acceptable)

**State Updates**: Synchronous within circuit breaker, async callbacks for UI updates

### Context State Updates

```typescript
// Update circuit status whenever circuit breaker state changes
const updateCircuitStatus = () => {
  setCircuitStatus(circuitBreakerRef.current.getStatus());
};

// Call after recordSuccess(), recordFailure(), manualReset()
```

## Logging Strategy

### Console Logging

```typescript
// Circuit state transitions
console.log('[CircuitBreaker] State transition:', {
  from: previousState,
  to: newState,
  failureCount,
  autoRecoveryAttempts
});

// Failure recording
console.log('[CircuitBreaker] Failure recorded:', {
  failureCount,
  threshold: config.failureThreshold,
  willOpen: failureCount >= config.failureThreshold
});

// Recovery attempts
console.log('[CircuitBreaker] Recovery attempt:', {
  attempt: autoRecoveryAttempts,
  maxAttempts: config.maxAutoRecoveryAttempts
});

// Manual reset
console.log('[CircuitBreaker] Manual reset triggered');
```

### Error Logging

```typescript
// Only log auth errors that affect circuit
if (isAuthenticationError(error)) {
  console.error('[CircuitBreaker] Authentication error:', {
    error: error.message,
    failureCount: circuitBreaker.getStatus().failureCount
  });
}
```

## Testing Strategy

### Unit Tests

**Circuit Breaker Logic**:
- State transitions (closed → open → half-open → closed)
- Failure counting and threshold
- Cooldown timer behavior
- Auto-recovery attempt limiting
- Manual reset functionality

**Test Cases**:
```typescript
describe('MomentoCircuitBreaker', () => {
  it('should remain closed with fewer than 3 failures', () => {});
  it('should open after 3 consecutive 401 errors', () => {});
  it('should not count non-401 errors', () => {});
  it('should transition to half-open after cooldown', () => {});
  it('should close on successful half-open attempt', () => {});
  it('should reopen on failed half-open attempt', () => {});
  it('should limit auto-recovery attempts to 3', () => {});
  it('should allow manual reset at any time', () => {});
  it('should reset failure count on success', () => {});
});
```

### Integration Tests

**NotificationContext Integration**:
- Token refresh with circuit breaker
- Subscription behavior when circuit is open
- Manual retry functionality
- UI state updates on circuit changes

### Manual Testing

**Scenarios**:
1. Simulate 3 consecutive 401 errors → verify circuit opens
2. Wait 5 minutes → verify auto-recovery attempt
3. Click retry button → verify manual recovery
4. Verify app continues working in degraded mode
5. Verify toast notification appears once when circuit opens
6. Verify visual indicators in UI

## Performance Considerations

### Memory Usage
- Single circuit breaker instance per NotificationContext
- Minimal state (< 1KB)
- One timer for recovery scheduling

### CPU Usage
- State checks are O(1)
- No polling or continuous monitoring
- Timer-based recovery (minimal overhead)

### Network Impact
- Reduces unnecessary token refresh attempts
- Prevents retry storms
- Graceful degradation reduces server load

## Security Considerations

### Token Handling
- Circuit breaker doesn't store tokens
- Only tracks failure counts and timing
- Existing token security measures unchanged

### Error Information
- Don't expose sensitive error details in UI
- Generic "unavailable" messaging for users
- Detailed errors only in console logs

## Rollout Strategy

### Phase 1: Core Implementation
- Implement circuit breaker module
- Integrate with NotificationContext
- Add basic logging

### Phase 2: UI Updates
- Add retry button to ActivityDropdown
- Add warning indicator to ActivityBadge
- Add degraded mode message to activity feed

### Phase 3: Testing & Refinement
- Manual testing with simulated failures
- Adjust thresholds if needed
- Monitor production behavior

## Monitoring & Metrics

### Key Metrics
- Circuit open events per day
- Average time in open state
- Auto-recovery success rate
- Manual retry usage
- User impact (sessions affected)

### Logging for Analysis
```typescript
// Circuit opens
console.log('[Metrics] Circuit opened', {
  timestamp: Date.now(),
  failureCount,
  lastError: error.message
});

// Circuit closes
console.log('[Metrics] Circuit closed', {
  timestamp: Date.now(),
  wasManual: isManualReset,
  autoRecoveryAttempts
});
```

## Future Enhancements

### Potential Improvements
1. Persist circuit state to localStorage (survive page refresh)
2. Exponential backoff for recovery attempts
3. Circuit breaker for other API endpoints
4. Analytics dashboard for circuit breaker events
5. Configurable thresholds per environment
6. Health check endpoint to test before recovery

### Not Planned
- Backend circuit breaker (frontend only for now)
- Automatic logout on repeated failures
- Circuit breaker for non-Momento APIs
- Complex recovery strategies

## Dependencies

### External Libraries
- None (vanilla TypeScript implementation)

### Internal Dependencies
- NotificationContext
- useToast hook
- ActivityDropdown component
- ActivityBadge component
- API client (for error types)

## Migration Notes

### Breaking Changes
- None (additive changes only)

### Backward Compatibility
- Existing functionality unchanged
- New features are opt-in via UI
- Graceful degradation maintains core features

## Open Questions

1. Should circuit state persist across page refreshes?
   - **Decision**: No, fresh page load should retry naturally

2. Should we show a more prominent warning when circuit opens?
   - **Decision**: Single toast + persistent badge indicator is sufficient

3. Should manual retry have a cooldown?
   - **Decision**: No, user-initiated actions should always be allowed

4. Should we track circuit breaker metrics in analytics?
   - **Decision**: Future enhancement, console logging sufficient for now
