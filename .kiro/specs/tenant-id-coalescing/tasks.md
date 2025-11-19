# Implementation Plan

- [x] 1. Update Authorizer to remove custom:tenantId dependency





  - Remove reading of `custom:tenantId` from Cognito user attributes
  - Simplify tenantId coalescing to use only `activeTeamId` or `userId`
  - Ensure authorization context includes `tenantId`, `userId`, `activeTeamId`, and `email`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 2. Update Momento token generator to include userId namespace





  - Modify `generateMomentoToken` function to always create permissions for userId topic
  - Add permissions for `userId_tasks` topic
  - Remove conditional check that excludes tenantId from team permissions
  - Ensure all team topics receive permissions regardless of tenantId value
  - Update logging to reflect new permission structure
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 3. Add unit tests for updated functions





  - [x] 3.1 Write tests for Authorizer tenantId coalescing


    - Test with activeTeamId present
    - Test with activeTeamId null
    - Test with missing user profile
    - Test authorization context values
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

  - [x] 3.2 Write tests for Momento token generator


    - Test userId topic permissions are created
    - Test userId_tasks topic permissions are created
    - Test all team topics receive permissions
    - Test no duplicate permissions
    - Test with empty teams array
    - Test with multiple teams
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 4. Verify pre-token generation and refresh token handlers





  - Review pre-token generation logic (should already be correct)
  - Review refresh token handler logic (should already be correct)
  - Confirm both functions pass correct parameters to Momento token generator
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 5. Integration testing
  - [ ] 5.1 Test authentication flow with new tenantId coalescing
    - Test user with no teams (tenantId = userId)
    - Test user with active team (tenantId = teamId)
    - Test user switching teams
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3_

  - [ ] 5.2 Test Momento token permissions
    - Verify userId topic is accessible
    - Verify all team topics are accessible
    - Verify task topics are accessible
    - Test token refresh maintains permissions
    - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
