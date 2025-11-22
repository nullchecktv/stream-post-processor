# Implementation Plan

- [x] 1. Create token storage utility





  - Create `frontend/src/utils/tokenStorage.ts` with save, get, isValid, isExpiringSoon, and clear methods
  - Implement StoredToken interface with token, expiresAt, and issuedAt fields
  - Add error handling for corrupted localStorage data
  - Set TOKEN_LIFETIME_SECONDS constant to 900 (15 minutes)
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 4.1, 4.5_

- [x] 2. Enhance NotificationContext with token management





  - [x] 2.1 Add new state fields


    - Add currentTenantId, isSubscribed, refreshAttempts, and proactiveRefreshTimer to state
    - Initialize all fields with appropriate default values
    - _Requirements: 5.1, 5.2_

  - [x] 2.2 Update subscription initialization


    - Extract Momento token from JWT in initializeSubscriptions
    - Call tokenStorage.save() with extracted token
    - Store currentTenantId in state
    - Set isSubscribed to true after successful subscription
    - _Requirements: 1.4, 5.1_

  - [x] 2.3 Implement subscription error handler


    - Check if error is 401 or 403 in handleSubscriptionError
    - Increment refreshAttempts counter
    - Check if refreshAttempts exceeds 3, show error and redirect to login
    - Try tokenStorage.get() if valid token exists
    - Call refreshMomentoToken() if localStorage token invalid
    - Call reestablishSubscriptions() with new token
    - Reset refreshAttempts to 0 on success
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 6.1, 6.2, 6.3_

  - [x] 2.4 Implement proactive refresh timer


    - Create setupProactiveRefresh() method
    - Clear existing timer if present
    - Set setTimeout for 13 minutes (780000ms)
    - Call refreshMomentoToken() in timer callback
    - Store new token in localStorage
    - Call reestablishSubscriptions() with new token
    - Recursively call setupProactiveRefresh() to set next timer
    - Store timer reference in state
    - _Requirements: 4.2, 4.3, 4.4_

  - [x] 2.5 Implement subscription re-establishment

    - Create reestablishSubscriptions() method accepting new token
    - Check if currently subscribed and tenantId exists
    - Unsubscribe from current topics
    - Subscribe to topics with new token
    - Preserve currentTenantId throughout process
    - _Requirements: 5.2, 5.3_

  - [x] 2.6 Update cleanup on logout


    - Call tokenStorage.clear() in unsubscribe method
    - Clear proactiveRefreshTimer if exists
    - Reset all state fields to defaults
    - _Requirements: 5.5, 5.6_

- [x] 3. Implement Cognito token refresh




  - [x] 3.1 Create auth API function


    - Create `frontend/src/api/auth.ts` if it doesn't exist
    - Implement refreshCognitoToken() function
    - Use Auth.currentSession() to get current session
    - Use Auth.currentAuthenticatedUser() to get user
    - Call refreshSession() with refresh token
    - Return new JWT from getIdToken().getJwtToken()
    - Add error handling for refresh failures
    - _Requirements: 3.1, 3.2, 8.1, 8.2, 8.3, 8.4_

  - [x] 3.2 Add JWT parsing utility

    - Create parseJwt() helper function in auth.ts
    - Decode JWT payload without verification (client-side)
    - Extract custom claims from payload
    - Return typed claims object
    - _Requirements: 3.3, 3.4_

- [x] 4. Enhance AuthContext with token refresh





  - [x] 4.1 Add refreshAuthToken method


    - Call refreshCognitoToken() to get new JWT
    - Parse JWT to extract claims
    - Update user state with new tenantId and momentoToken
    - Store new JWT in localStorage
    - Return new JWT for use by callers
    - _Requirements: 3.3, 3.4, 3.5_

  - [x] 4.2 Handle refresh failures


    - Catch errors from refreshCognitoToken()
    - Log error details
    - Call signOut() to log user out
    - Redirect to login page
    - _Requirements: 8.7_

- [x] 5. Implement team switch with token refresh





  - [x] 5.1 Create handleTeamSwitch in NotificationContext


    - Accept newTenantId parameter
    - Store previousTenantId for error recovery
    - Call refreshCognitoToken() from AuthContext
    - Extract new Momento token from new JWT
    - Call tokenStorage.save() with new token
    - Unsubscribe from old tenant topics
    - Subscribe to new tenant topics with new token
    - Call setupProactiveRefresh() to reset timer
    - Update currentTenantId in state
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 5.4_

  - [x] 5.2 Add error handling for team switch

    - Wrap team switch logic in try-catch
    - Show error toast on failure
    - Revert to previousTenantId on error
    - Keep user on current team if switch fails
    - _Requirements: 3.8, 6.4, 6.5_

  - [x] 5.3 Update setActiveTeam API function


    - Call backend PUT /users/me/active-team endpoint
    - Call refreshAuthToken() from AuthContext after backend success
    - Call handleTeamSwitch() from NotificationContext
    - Handle errors and show appropriate messages
    - _Requirements: 3.1, 3.2_

- [x] 6. Add token validation helpers




  - [x] 6.1 Implement getValidToken helper

    - Try to get token from tokenStorage
    - Check if token exists
    - Check if token is expired
    - Validate token format (basic string check)
    - Clear storage if token invalid
    - Return token or null
    - _Requirements: 1.6, 1.7, 6.6_

  - [x] 6.2 Add token expiration checking

    - Use tokenStorage.isExpiringSoon() with 120 second threshold
    - Treat tokens expiring within 1 minute as expired
    - _Requirements: 4.6_

- [x] 7. Update subscription initialization flow





  - [x] 7.1 Extract Momento token from JWT


    - Parse JWT in AuthContext on login
    - Extract custom:momentoToken claim
    - Store in auth state
    - Pass to NotificationContext
    - _Requirements: 1.4, 5.1_

  - [x] 7.2 Initialize subscriptions with token storage


    - Call tokenStorage.save() before subscribing
    - Subscribe to tenant and tasks topics
    - Call setupProactiveRefresh() after successful subscription
    - Set isSubscribed state to true
    - _Requirements: 1.4, 4.1, 4.2_

- [x] 8. Add error recovery for corrupted tokens




  - Wrap tokenStorage.get() in try-catch
  - Clear localStorage on JSON parse errors
  - Return null for corrupted data
  - Log corruption errors for monitoring
  - _Requirements: 6.6_

- [x] 9. Update team switch UI integration




  - Update ProfilePage team switch handler to use new flow
  - Update TeamsListPage team switch handler to use new flow
  - Show loading state during team switch
  - Show error toast if team switch fails
  - _Requirements: 3.1, 6.4, 6.5_

- [ ] 10. Add unit tests for token storage
  - Test save() stores token with correct expiration
  - Test get() retrieves stored token
  - Test isValid() checks expiration correctly
  - Test isExpiringSoon() with various thresholds
  - Test clear() removes token from storage
  - Test corrupted data handling
  - _Requirements: 1.4, 1.5, 1.6, 1.7, 4.1, 4.5, 4.6_

- [ ] 11. Add unit tests for NotificationContext
  - Test subscription initialization with token storage
  - Test handleSubscriptionError with localStorage fallback
  - Test handleSubscriptionError with refresh endpoint
  - Test proactive refresh timer setup and execution
  - Test handleTeamSwitch flow
  - Test cleanup on logout
  - Mock Momento SDK and API calls
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 12. Add integration tests
  - Test token lifecycle from login to expiration
  - Test automatic refresh on subscription failure
  - Test team switch with Cognito token refresh
  - Test error recovery scenarios
  - Test proactive refresh timing
  - _Requirements: All requirements_
