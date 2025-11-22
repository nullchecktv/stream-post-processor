# Requirements Document

## Introduction

This feature enhances the Momento token management system to handle token expiration gracefully and ensure notification subscriptions remain active across token lifecycle events. The system addresses the mismatch between Momento token expiration (15 minutes) and JWT expiration (1 day), and ensures immediate token refresh when switching teams.

## Glossary

- **Momento Auth Token**: A short-lived authentication token (15 minutes) that grants access to Momento topics, embedded in the JWT custom claims
- **JWT Token**: A long-lived authentication token (1 day) issued by AWS Cognito containing user identity and custom claims
- **Local Storage Token**: A Momento auth token stored in browser localStorage as a fallback when the JWT token's embedded Momento token expires
- **Token Refresh**: The process of obtaining a new Momento auth token by calling the `/tokens/refresh` endpoint
- **Subscription Failure**: When a Momento topic subscription returns a 401 or 403 error due to token expiration
- **Team Switch**: When a user changes their active team, requiring new JWT claims with updated tenant context
- **Cognito Token Refresh**: The process of obtaining a new JWT from Cognito with updated custom claims

## Requirements

### Requirement 1: Local Storage Token Fallback

**User Story:** As a user, I want my notification connection to remain active even after the JWT's embedded Momento token expires so that I don't lose real-time updates

#### Acceptance Criteria

1. WHEN a Momento subscription fails with 401 or 403 error, THE Notification System SHALL attempt to use the Momento token from localStorage
2. IF a localStorage token exists, THEN THE Notification System SHALL re-establish subscriptions using the localStorage token
3. IF the localStorage token also fails, THEN THE Notification System SHALL call the `/tokens/refresh` endpoint
4. WHEN a new Momento token is received from `/tokens/refresh`, THE Notification System SHALL store the token in localStorage
5. WHEN storing a token in localStorage, THE Notification System SHALL include an expiration timestamp
6. WHEN retrieving a token from localStorage, THE Notification System SHALL check if the token has expired
7. IF the localStorage token is expired, THEN THE Notification System SHALL skip the localStorage attempt and call `/tokens/refresh` directly

### Requirement 2: Automatic Token Refresh on Subscription Failure

**User Story:** As a user, I want the system to automatically refresh my Momento token when it expires so that I don't experience interruptions in notifications

#### Acceptance Criteria

1. WHEN a Momento subscription returns a 401 error, THE Notification System SHALL initiate the token refresh flow
2. WHEN a Momento subscription returns a 403 error, THE Notification System SHALL initiate the token refresh flow
3. WHEN initiating token refresh, THE Notification System SHALL first check for a valid localStorage token
4. IF no valid localStorage token exists, THEN THE Notification System SHALL call POST `/tokens/refresh`
5. WHEN `/tokens/refresh` succeeds, THE Notification System SHALL store the new token in localStorage with expiration
6. WHEN a new token is obtained, THE Notification System SHALL re-establish all active subscriptions
7. WHEN re-establishing subscriptions, THE Notification System SHALL use the new token for authentication
8. IF token refresh fails after 3 attempts, THEN THE Notification System SHALL display an error message and stop retry attempts

### Requirement 3: Immediate Cognito Token Refresh on Team Switch

**User Story:** As a user, I want my JWT to be immediately refreshed when I switch teams so that my tenant context is always current

#### Acceptance Criteria

1. WHEN a user switches active teams, THE Notification System SHALL call the Cognito token refresh endpoint
2. WHEN refreshing the Cognito token, THE Notification System SHALL use the current refresh token
3. WHEN the new JWT is received, THE Notification System SHALL extract the updated tenantId from custom claims
4. WHEN the new JWT is received, THE Notification System SHALL extract the new Momento token from custom claims
5. WHEN the new JWT is received, THE Notification System SHALL update the stored authentication state
6. WHEN the new JWT is received, THE Notification System SHALL unsubscribe from old Momento topics
7. WHEN the new JWT is received, THE Notification System SHALL subscribe to new Momento topics using the new token
8. IF Cognito token refresh fails, THEN THE Notification System SHALL display an error and revert the team switch

### Requirement 4: Token Expiration Tracking

**User Story:** As a developer, I want to track token expiration times so that the system can proactively refresh tokens before they expire

#### Acceptance Criteria

1. WHEN storing a Momento token in localStorage, THE Notification System SHALL calculate and store the expiration timestamp
2. WHEN the Momento token is 2 minutes from expiration, THE Notification System SHALL proactively call `/tokens/refresh`
3. WHEN proactively refreshing, THE Notification System SHALL update localStorage with the new token
4. WHEN proactively refreshing, THE Notification System SHALL re-establish subscriptions with the new token
5. WHEN checking localStorage token validity, THE Notification System SHALL compare current time against stored expiration
6. IF the localStorage token is within 1 minute of expiration, THEN THE Notification System SHALL treat it as expired

### Requirement 5: Subscription State Management

**User Story:** As a user, I want the system to maintain my notification subscriptions across token refreshes so that I don't miss any updates

#### Acceptance Criteria

1. WHEN subscriptions are established, THE Notification System SHALL store the current tenantId in memory
2. WHEN a token refresh occurs, THE Notification System SHALL preserve the current tenantId
3. WHEN re-establishing subscriptions after token refresh, THE Notification System SHALL use the preserved tenantId
4. WHEN a team switch occurs, THE Notification System SHALL update the stored tenantId
5. WHEN unsubscribing, THE Notification System SHALL clear all subscription references
6. WHEN the user logs out, THE Notification System SHALL clear the localStorage token

### Requirement 6: Error Handling and User Feedback

**User Story:** As a user, I want clear feedback when token refresh fails so that I know what action to take

#### Acceptance Criteria

1. WHEN token refresh fails after max attempts, THE Notification System SHALL display a toast notification
2. WHEN displaying token refresh error, THE Notification System SHALL include a message "Session expired. Please log in again."
3. WHEN token refresh fails permanently, THE Notification System SHALL redirect the user to the login page
4. WHEN a team switch fails due to token refresh error, THE Notification System SHALL display an error toast
5. WHEN a team switch fails, THE Notification System SHALL keep the user on their current team
6. WHEN localStorage token is corrupted or invalid, THE Notification System SHALL remove it and attempt fresh token refresh

### Requirement 7: Cognito Token Refresh Integration

**User Story:** As a user, I want the system to seamlessly refresh my Cognito JWT when needed so that my session remains valid

#### Acceptance Criteria

1. WHEN the user switches teams, THE Notification System SHALL call the Cognito refresh token endpoint
2. WHEN calling Cognito refresh, THE Notification System SHALL use the stored refresh token from authentication
3. WHEN Cognito refresh succeeds, THE Notification System SHALL update the stored JWT in authentication state
4. WHEN Cognito refresh succeeds, THE Notification System SHALL update the stored ID token
5. WHEN Cognito refresh succeeds, THE Notification System SHALL trigger the pre-token generation Lambda
6. WHEN pre-token generation runs, THE Notification System SHALL generate a new Momento token with current team memberships
7. WHEN Cognito refresh fails, THE Notification System SHALL log the user out and redirect to login

