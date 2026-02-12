# Momento Token Refresh Circuit Breaker

## Overview

Implement a circuit breaker pattern for Momento token refresh to prevent infinite retry loops and provide graceful degradation when authentication repeatedly fails. After 3 consecutive 401 errors, the system should abandon real-time notifications and operate in a degraded mode.

## Problem Statement

Currently, if Momento token refresh fails with a 401 error, the system may enter an infinite retry loop or fail silently. Users need a resilient system that:
- Detects repeated authentication failures
- Stops retrying after a reasonable threshold
- Provides clear feedback about degraded functionality
- Allows recovery when authentication is restored

## User Stories

### 1. Circuit Breaker Activation
**As a** user with authentication issues
**I want** the system to stop retrying after 3 failed attempts
**So that** I don't experience performance degradation from infinite loops

**Acceptance Criteria:**
- System tracks consecutive 401 errors for Momento token refresh
- After 3 consecutive 401 errors, circuit breaker opens
- No further token refresh attempts are made while circuit is open
- User is notified that real-time features are unavailable

### 2. Degraded Mode Operation
**As a** user in degraded mode
**I want** the application to continue working without real-time notifications
**So that** I can still use core features even when real-time is unavailable

**Acceptance Criteria:**
- Application continues to function without Momento subscription
- Notification badge shows a warning indicator
- User can still view notifications via polling/manual refresh
- No error toasts spam the user repeatedly
- Activity feed shows a "real-time unavailable" message

### 3. Circuit Recovery
**As a** user whose authentication is restored
**I want** the system to automatically retry after a cooldown period
**So that** real-time features resume without manual intervention

**Acceptance Criteria:**
- Circuit breaker enters "half-open" state after 5 minutes
- One retry attempt is made in half-open state
- On success, circuit closes and normal operation resumes
- On failure, circuit reopens for another cooldown period
- Maximum of 3 recovery attempts before requiring manual action

### 4. Manual Recovery
**As a** user in degraded mode
**I want** a way to manually retry the connection
**So that** I can restore real-time features when I know auth is fixed

**Acceptance Criteria:**
- "Retry Connection" button appears in notification dropdown
- Button is only visible when circuit is open
- Clicking button attempts to refresh token and resubscribe
- Success closes circuit and restores real-time features
- Failure shows error message but doesn't increment auto-retry count

### 5. Developer Visibility
**As a** developer
**I want** clear logging of circuit breaker state changes
**So that** I can debug authentication issues

**Acceptance Criteria:**
- Circuit state changes are logged (closed → open → half-open)
- Each 401 error is logged with attempt count
- Recovery attempts are logged with outcomes
- Circuit breaker metrics are available in console

## Technical Requirements

### Circuit Breaker States
1. **Closed**: Normal operation, token refresh works
2. **Open**: Too many failures, no retry attempts
3. **Half-Open**: Testing if service recovered, single retry allowed

### Configuration
- **Failure Threshold**: 3 consecutive 401 errors
- **Cooldown Period**: 5 minutes before half-open
- **Max Auto-Recovery Attempts**: 3 before requiring manual action
- **Reset on Success**: Any successful token refresh resets failure count

### Error Handling
- Only 401 errors count toward circuit breaker
- Network errors (timeout, connection refused) don't trigger circuit
- Other HTTP errors (500, 503) don't trigger circuit
- Circuit state persists in memory only (resets on page refresh)

### User Experience
- Single toast notification when circuit opens
- Persistent visual indicator in notification badge
- Clear messaging about degraded functionality
- No repeated error messages while circuit is open

## Out of Scope

- Persisting circuit breaker state across page refreshes
- Circuit breaker for other API endpoints (only Momento token refresh)
- Automatic logout on repeated auth failures
- Backend circuit breaker implementation
- Metrics/analytics tracking of circuit breaker events

## Success Metrics

- Zero infinite retry loops in production
- Circuit breaker activates within 30 seconds of repeated failures
- Users can continue using app in degraded mode
- 90% of circuits recover automatically within 10 minutes
- Clear user feedback when real-time features are unavailable

## Dependencies

- Existing NotificationContext implementation
- Existing token refresh mechanism in api/client.ts
- Toast notification system
- Activity feed components

## Risks and Mitigations

**Risk**: Circuit breaker triggers on temporary network issues
**Mitigation**: Only 401 errors trigger circuit, network errors don't count

**Risk**: Users don't notice degraded mode
**Mitigation**: Clear visual indicators and single notification

**Risk**: Circuit never recovers automatically
**Mitigation**: Manual retry button always available

**Risk**: Page refresh bypasses circuit breaker
**Mitigation**: Acceptable - fresh page load should retry auth naturally
