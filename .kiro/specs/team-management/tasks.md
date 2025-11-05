# Team Management Implementation Plan

- [x] 1. Implement team CRUD operations





- [x] 1.1 Create team creation function


  - Write `functions/teams/create-team.mjs` with inline validation and team metadata storage
  - Store team with creator as owner in team metadata
  - Add team name uniqueness validation within user scope
  - _Requirements: 1.1, 1.2, 7.1_

- [x] 1.2 Create team listing function


  - Write `functions/teams/list-teams.mjs` to return user's teams
  - Implement pagination support for team lists
  - Include basic team information in response
  - _Requirements: 1.3_

- [x] 1.3 Create team details function


  - Write `functions/teams/get-team.mjs` with team access validation
  - Include team metadata for authorized users
  - Implement proper access control for team information
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 1.4 Create team update function


  - Write `functions/teams/update-team.mjs` with inline validation and owner privilege validation
  - Implement optimistic locking for concurrent updates
  - Add inline validation for team settings and metadata changes
  - _Requirements: 1.4_

- [x] 1.5 Create team deletion function


  - Write `functions/teams/delete-team.mjs` with owner validation
  - Implement team data cleanup on deletion
  - Add safety checks to prevent accidental team deletion
  - _Requirements: 1.5_

- [x] 2. Implement user profile management




- [x] 2.1 Create user profile retrieval function


  - Write `functions/users/get-profile.mjs` to return user information
  - Include active team and owned teams in profile
  - Add user preferences and settings support
  - _Requirements: 3.1, 3.5_

- [x] 2.2 Create user profile update function


  - Write `functions/users/update-profile.mjs` with inline data validation
  - Implement profile field updates while preserving team associations
  - Add inline validation for user preferences and settings
  - _Requirements: 3.2, 3.3, 3.4_

- [x] 2.3 Create active team switching function


  - Write `functions/users/set-active-team.mjs` with team ownership validation
  - Implement team ownership verification before activation
  - Add support for clearing active team (individual mode)
  - _Requirements: 2.1, 2.2, 2.5_

- [x] 3. Enhance authentication and authorization






- [x] 3.1 Update authorizer for team context resolution

  - Modify `functions/auth/authorizer.mjs` to fetch user profile
  - Implement tenant context resolution logic (user ID vs active team ID)
  - Add team context information to authorizer response
  - _Requirements: 5.1, 5.2, 4.1, 4.2_

- [x] 3.2 Implement token invalidation mechanism


  - Update `functions/auth/pre-token-generation.mjs` to include team context
  - Add logic to force token refresh when team context changes
  - Implement Cognito user attribute updates for cache busting
  - _Requirements: 2.5, 5.3_

- [x] 3.3 Add backward compatibility for existing functions


  - Ensure all existing episode and clip functions work with team context
  - Validate that tenant context resolution doesn't break existing functionality
  - Test individual mode continues to work as before
  - _Requirements: 4.3, 5.4, 5.5_

- [x] 4. Add API Gateway endpoints and OpenAPI specification





- [x] 4.1 Define team management API endpoints


  - Add team CRUD endpoints to `openapi.yaml`
  - Include request/response schemas for team operations
  - Add proper error response definitions for team access control
  - _Requirements: 1.1, 1.3, 1.4, 1.5, 6.4, 6.5_

- [x] 4.2 Define user profile API endpoints


  - Add user profile endpoints to `openapi.yaml`
  - Include active team switching endpoint specification
  - Add request/response schemas for profile updates
  - _Requirements: 3.1, 3.2, 2.1, 2.2_

- [x] 4.3 Update SAM template with new functions


  - Add all team management functions to `template.yaml`
  - Configure proper IAM permissions for DynamoDB access
  - Add API Gateway integration for new endpoints
  - _Requirements: All requirements need proper deployment configuration_

- [ ] 5. Write comprehensive tests
- [ ] 5.1 Write unit tests for all functions
  - Create unit tests for all team CRUD operations
  - Write tests for user profile management functions
  - Add tests for authorizer team context resolution logic
  - Test error handling and access control scenarios
  - _Requirements: All requirements need test coverage_

- [ ] 5.2 Write integration tests
  - Create end-to-end tests for team creation and ownership workflows
  - Test team context switching and data isolation
  - Verify token invalidation and re-authentication flows
  - Test backward compatibility with existing functionality
  - _Requirements: 2.5, 4.1, 4.2, 4.3, 5.4, 5.5_
