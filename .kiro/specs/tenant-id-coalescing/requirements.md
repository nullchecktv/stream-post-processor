# Requirements Document

## Introduction

This feature updates the authentication and authorization flow to deprecate the `custom:tenantId` Cognito attribute and instead use a coalesced value based on the user's `activeTeamId` or `userId`. The system will always pass a `tenantId` in the authorizer context, and permission generation will include all teams plus the user's personal namespace.

## Glossary

- **Authorizer**: Lambda function that validates JWT tokens and generates IAM policies for API Gateway requests
- **Pre-Token Generation**: Cognito trigger that adds custom claims to JWT tokens during authentication
- **Refresh Token Handler**: Lambda function that generates new Momento tokens for real-time notifications
- **tenantId**: The active context identifier used for data isolation (either activeTeamId or userId)
- **activeTeamId**: The currently selected team ID from the user's profile
- **Momento Token**: Short-lived token for subscribing to real-time notification topics
- **custom:tenantId**: Deprecated Cognito custom attribute (no longer used)

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the authorizer to use activeTeamId or userId as the tenantId, so that users always have a valid tenant context regardless of team membership.

#### Acceptance Criteria

1. WHEN the Authorizer validates a JWT token, THE Authorizer SHALL retrieve the user profile from DynamoDB
2. WHEN the user profile contains an activeTeamId value, THE Authorizer SHALL set tenantId to the activeTeamId value
3. WHEN the user profile does not contain an activeTeamId value or activeTeamId is null, THE Authorizer SHALL set tenantId to the userId value
4. THE Authorizer SHALL include tenantId in the authorization context for all downstream Lambda functions
5. THE Authorizer SHALL include userId in the authorization context for all downstream Lambda functions
6. WHERE the user has an activeTeamId, THE Authorizer SHALL include activeTeamId in the authorization context

### Requirement 2

**User Story:** As a system administrator, I want the pre-token generation trigger to add tenantId and activeTeamId claims to JWT tokens, so that clients can access these values without additional API calls.

#### Acceptance Criteria

1. WHEN the Pre-Token Generation trigger executes, THE Pre-Token Generation trigger SHALL retrieve the user profile from DynamoDB
2. WHEN the user profile contains an activeTeamId value, THE Pre-Token Generation trigger SHALL set the tenantId claim to the activeTeamId value
3. WHEN the user profile does not contain an activeTeamId value or activeTeamId is null, THE Pre-Token Generation trigger SHALL set the tenantId claim to the userId value
4. THE Pre-Token Generation trigger SHALL add the tenantId claim to the JWT token
5. WHERE the user has an activeTeamId, THE Pre-Token Generation trigger SHALL add the activeTeamId claim to the JWT token
6. THE Pre-Token Generation trigger SHALL ignore the custom:tenantId Cognito attribute

### Requirement 3

**User Story:** As a user, I want Momento tokens to grant me access to all my teams' notification topics plus my personal topic, so that I receive notifications from all contexts I belong to.

#### Acceptance Criteria

1. WHEN the Pre-Token Generation trigger generates a Momento token, THE Pre-Token Generation trigger SHALL create permissions for the userId topic
2. WHEN the Pre-Token Generation trigger generates a Momento token, THE Pre-Token Generation trigger SHALL create permissions for all active team topics the user belongs to
3. THE Pre-Token Generation trigger SHALL create permissions for both standard and task topics for each context
4. THE Pre-Token Generation trigger SHALL pass the userId and all team IDs to the Momento token generator
5. THE Momento token generator SHALL create SubscribeOnly permissions for each topic

### Requirement 4

**User Story:** As a user, I want the refresh token endpoint to generate Momento tokens with access to all my teams, so that I can continue receiving notifications after token expiration.

#### Acceptance Criteria

1. WHEN the Refresh Token handler executes, THE Refresh Token handler SHALL retrieve all active team memberships for the user
2. THE Refresh Token handler SHALL generate a Momento token with permissions for the userId topic
3. THE Refresh Token handler SHALL generate a Momento token with permissions for all active team topics
4. THE Refresh Token handler SHALL create permissions for both standard and task topics for each context
5. THE Refresh Token handler SHALL return the new Momento token with expiration timestamp

### Requirement 5

**User Story:** As a system administrator, I want the Momento token generator to create permissions for the user's personal namespace and all team namespaces, so that notification routing works correctly for all contexts.

#### Acceptance Criteria

1. WHEN the Momento token generator receives a userId, THE Momento token generator SHALL create permissions for the userId topic
2. WHEN the Momento token generator receives a list of teams, THE Momento token generator SHALL create permissions for each team's topic
3. THE Momento token generator SHALL create permissions for task topics using the pattern `{contextId}_tasks`
4. THE Momento token generator SHALL use SubscribeOnly role for all topic permissions
5. THE Momento token generator SHALL set token expiration to 15 minutes
