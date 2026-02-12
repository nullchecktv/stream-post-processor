# Momento Token Refresh Circuit Breaker - Implementation Tasks

## Task List

### 1. Core Circuit Breaker Implementation
- [x] 1.1 Create circuit breaker module
  - Create `frontend/src/utils/circuitBreaker.ts`
  - Define `CircuitState` enum (CLOSED, OPEN, HALF_OPEN)
  - Define `CircuitBreakerConfig` interface
  - Define `CircuitBreakerStatus` interface
  - Implement `MomentoCircuitBreaker` class with state machine
  - Implement `recordSuccess()` method
  - Implement `recordFailure()` method with 401 error detection
  - Implement `shouldAttempt()` method
  - Implement `getStatus()` method
  - Impl
 attempt reopens circuit
  - Test auto-recovery attempt limiting (max 3)
  - Test manual reset functionality
  - Test failure count resets on success
  - Test timer cleanup on state transitions

### 2. NotificationContext Integration
- [x] 2.1 Add circuit breaker to NotificationContext
  - Import `MomentoCircuitBreaker` class
  - Create circuit breaker instance with useRef
  - Add `circuitStatus` state variable
  - Add `circuitStatus` to context value interface
  - Add `retryConnection` to context value interface
  - Export circuit breaker instance for testing

- [x] 2.2 Implement token refresh wrapper
  - Create `refreshTokenWithCircuitBreaker()` function
  - Check `shouldAttempt()` before refresh
  - Call `recordSuccess()` on successful refresh
  - Call `recordFailure()` on 401 errors
  - Update circuit status state after each attempt
  - Show single toast notification when circuit opens
  - Return null when circuit is open (degraded mode)
  - Add logging for circuit breaker decisions

- [x] 2.3 Update subscription initialization logic
  - Modify `initializeSubscriptions()` to use circuit breaker wrapper
  - Handle null return from wrapper (degraded mode)
  - Skip subscription when circuit is open
  - Add logging for degraded mode entry
  - Ensure app continues functioning without subscription

- [x] 2.4 Implement manual retry function
  - Create `retryConnection()` callback
  - Call `manualReset()` on circuit breaker
  - Attempt token refresh with wrapper
  - Resubscribe on successful refresh
  - Show success toast on restoration
  - Show error toast on failure
  - Add logging for manual retry attempts

- [x] 2.5 Update subscribeTenant error handling
  - Check if subscription error is auth-related
  - Use circuit breaker for auth error tracking
  - Don't retry if circuit is open
  - Maintain existing network error handling

### 3. Circuit Breaker Hook
- [x] 3.1 Create useCircuitBreaker hook
  - Create `frontend/src/hooks/useCircuitBreaker.ts`
  - Import NotificationContext
  - Extract circuit status from context
  - Return `circuitStatus` object
  - Return `isCircuitOpen` boolean
  - Return `canRetry` boolean
  - Return `retryConnection` function
  - Add error handling for missing context

### 4. UI Component Updates
- [x] 4.1 Update ActivityBadge component
  - Import `useCircuitBreaker` hook
  - Add yellow warning dot when circuit is open
  - Position warning dot at bottom-right of badge
  - Style with yellow-500 background
  - Add border to separate from notification count
  - Ensure warning dot is visible in light and dark modes

- [x] 4.2 Update ActivityDropdown component
  - Import `useCircuitBreaker` hook
  - Import `AlertTriangle` icon from lucide-react
  - Add degraded mode banner after header
  - Show banner only when circuit is open
  - Display "Real-time updates unavailable" message
  - Add "Retry" button when `canRetry` is true
  - Wire retry button to `retryConnection` function
  - Style banner with yellow background
  - Ensure banner is visible in light and dark modes

- [x] 4.3 Update ActivityItem or activity feed
  - Import `useCircuitBreaker` hook
  - Add degraded mode message at top of feed
  - Show message only when circuit is open
  - Display explanation about manual refresh
  - Style with yellow background and icon
  - Ensure message is visible in light and dark modes

### 5. Error Classification
- [x] 5.1 Create error classification utility
  - Create `isAuthenticationError()` function in circuit breaker module
  - Check for ApiError with status 401
  - Check for Momento error codes (PERMISSION_ERROR, AUTHENTICATION_ERROR)
  - Return boolean indicating if error is auth-related
  - Add unit tests for error classification

### 6. Testing & Validation
- [ ] 6.1 Manual testing scenarios
  - Test circuit opens after 3 consecutive 401 errors
  - Test single toast notification appears when circuit opens
  - Test app continues working in degraded mode
  - Test warning indicator appears on notification badge
  - Test degraded mode banner appears in dropdown
  - Test retry button appears when circuit is open
  - Test manual retry restores connection
  - Test auto-recovery after 5-minute cooldown
  - Test circuit closes on successful recovery
  - Test max 3 auto-recovery attempts
  - Test network errors don't trigger circuit
  - Test page refresh resets circuit state

- [ ] 6.2 Integration testing
  - Test NotificationContext with circuit breaker
  - Test token refresh flow with circuit breaker
  - Test subscription flow when circuit is open
  - Test UI components respond to circuit state changes
  - Test manual retry end-to-end flow

### 7. Documentation & Cleanup
- [ ] 7.1 Add code comments
  - Document circuit breaker class and methods
  - Document state machine transitions
  - Document error classification logic
  - Document integration points in NotificationContext

- [x] 7.2 Update console logging
  - Ensure all state transitions are logged
  - Log failure counts and thresholds
  - Log recovery attempts
  - Log manual reset actions
  - Use consistent log prefix "[CircuitBreaker]"

## Task Dependencies

```
1.1 (Circuit Breaker Module)
  └─> 1.2 (Unit Tests)
  └─> 2.1 (Context Integration)
      └─> 2.2 (Token Refresh Wrapper)
      └─> 2.3 (Subscription Logic)
      └─> 2.4 (Manual Retry)
      └─> 2.5 (Error Handling)
      └─> 3.1 (Hook Creation)
          └─> 4.1 (ActivityBadge)
          └─> 4.2 (ActivityDropdown)
          └─> 4.3 (Activity Feed)

5.1 (Error Classification) can be done in parallel with 1.1

6.1 and 6.2 (Testing) should be done after all implementation tasks

7.1 and 7.2 (Documentation) should be done last
```

## Implementation Order

1. **Phase 1: Core Logic** (Tasks 1.1, 5.1)
   - Build circuit breaker module
   - Implement error classification
   - Write unit tests (1.2)

2. **Phase 2: Context Integration** (Tasks 2.1-2.5)
   - Integrate circuit breaker with NotificationContext
   - Update token refresh logic
   - Update subscription logic
   - Implement manual retry

3. **Phase 3: UI Layer** (Tasks 3.1, 4.1-4.3)
   - Create hook for components
   - Update ActivityBadge
   - Update ActivityDropdown
   - Update activity feed

4. **Phase 4: Testing** (Tasks 6.1-6.2)
   - Manual testing scenarios
   - Integration testing

5. **Phase 5: Polish** (Tasks 7.1-7.2)
   - Documentation
   - Logging cleanup

## Acceptance Criteria

### Functional Requirements
- ✓ Circuit opens after 3 consecutive 401 errors
- ✓ Circuit prevents further token refresh attempts when open
- ✓ Circuit automatically attempts recovery after 5 minutes
- ✓ Circuit limits auto-recovery to 3 attempts
- ✓ Manual retry button allows user-initiated recovery
- ✓ App continues functioning in degraded mode
- ✓ Single toast notification when circuit opens
- ✓ Visual indicators show degraded state

### Non-Functional Requirements
- ✓ No infinite retry loops
- ✓ Minimal performance impact (< 1KB memory, O(1) operations)
- ✓ Clear logging for debugging
- ✓ Backward compatible (no breaking changes)
- ✓ Works in light and dark modes

### User Experience Requirements
- ✓ Clear messaging about degraded functionality
- ✓ No repeated error toasts
- ✓ Retry button is discoverable
- ✓ Visual feedback on retry attempts
- ✓ Graceful degradation maintains core features

## Testing Checklist

### Unit Tests
- [ ] Circuit breaker state machine
- [ ] Failure counting and thresholds
- [ ] Timer-based recovery
- [ ] Manual reset
- [ ] Error classification

### Integration Tests
- [ ] NotificationContext integration
- [ ] Token refresh flow
- [ ] Subscription flow
- [ ] UI component updates

### Manual Tests
- [ ] Simulate 401 errors
- [ ] Verify circuit opens
- [ ] Verify degraded mode
- [ ] Verify auto-recovery
- [ ] Verify manual retry
- [ ] Verify UI indicators
- [ ] Verify app functionality

## Notes

- Circuit breaker state is in-memory only (resets on page refresh)
- Only 401 errors count toward circuit breaker
- Network errors and other HTTP codes don't affect circuit
- Manual retry is always available regardless of auto-recovery attempts
- Circuit breaker is specific to Momento token refresh (not other APIs)
