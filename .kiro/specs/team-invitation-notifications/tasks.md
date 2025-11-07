# Implementation Plan

- [ ] 1. Set up Zod validation infrastructure








  - Create centralized schema definitions file
  - Implement Lambda Powertools validation integration
  - Create error handling utilities for validation failures
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 1.1 Create schema definitions file


  - Write comprehensive Zod schemas for all existing endpoints
  - Include body, path parameters, and query parameter schemas
  - Organize schemas by functional area (episodes, teams, users, notifications)
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 1.2 Implement validation error handling


  - Create utility to convert SchemaValidationError to simple message format
  - Ensure consistent 400 status codes for validation failures
  - Handle edge cases and provide meaningful error messages
  - _Requirements: 4.4, 4.5_

- [x] 2. Create notification system infrastructure





  - Implement notification data models and utilities
  - Create notification management functions
  - Add notification API endpoints to template and OpenAPI spec
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 2.1 Implement notification utilities


  - Create notification creation and management utilities
  - Implement notification query functions with pagination
  - Add TTL and cleanup functionality
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 2.2 Create GET /notifications endpoint


  - Implement paginated notification listing
  - Support filtering by read status
  - Return notifications sorted by creation date (newest first)
  - _Requirements: 5.1, 5.4, 5.5_

- [x] 2.3 Create DELETE /notifications/{notificationId} endpoint


  - Support both deletion and marking as read via isRead query parameter
  - Validate user ownership of notifications
  - Handle non-existent notifications gracefully
  - _Requirements: 5.2, 5.5_

- [x] 3. Enhance team invitation system for existing users





  - Modify team member addition to detect existing users
  - Create invitation decision endpoint
  - Integrate notification creation with invitation flow
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.1 Update team member addition logic


  - Check if invited email belongs to existing user
  - Create different invitation types for existing vs new users
  - Generate in-app notifications for existing users
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

- [x] 3.2 Create invitation decision endpoint


  - Implement POST /invitations/{invitationId}/decisions
  - Support accept and reject actions
  - Validate invitation ownership and expiration
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.3 Integrate notification cleanup with invitation actions


  - Remove notifications when invitations are accepted or rejected
  - Update invitation status appropriately
  - Handle edge cases and error conditions
  - _Requirements: 2.5, 3.2, 3.3_

- [x] 4. Update existing endpoints with Zod validation





  - Migrate all episode endpoints to use Zod validation
  - Migrate all team endpoints to use Zod validation
  - Migrate all user endpoints to use Zod validation
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Update episode endpoints



  - Add validation to create, get, update episode endpoints
  - Add validation to transcript and track upload endpoints
  - Add validation to clip management endpoints
  - _Requirements: 4.1, 4.2, 4.3_



- [x] 4.2 Update team endpoints

  - Add validation to team creation and management endpoints
  - Add validation to team member management endpoints
  - Add validation to team invitation endpoints

  - _Requirements: 4.1, 4.2, 4.3_

- [x] 4.3 Update user and authentication endpoints

  - Add validation to user profile endpoints
  - Add validation to team switching endpoints
  - Ensure consistent validation patterns across all endpoints
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 5. Implement automatic cleanup and TTL management




  - Set up TTL for notifications and invitations
  - Implement cleanup logic for expired invitations
  - Add monitoring for cleanup operations
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 5.1 Configure TTL for data cleanup


  - Set 30-day TTL for notifications
  - Set 7-day TTL for invitations
  - Ensure proper TTL field population in all creation operations
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 5.2 Add cleanup monitoring and logging


  - Log cleanup activities for debugging
  - Monitor cleanup performance and effectiveness
  - Handle cleanup edge cases and error conditions
  - _Requirements: 6.4, 6.5_

- [x] 6. Update API specification and infrastructure





  - Add new endpoints to OpenAPI specification
  - Update SAM template with new functions and permissions
  - Add necessary IAM permissions for notification system
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.1 Update OpenAPI specification


  - Add notification endpoints with proper schemas
  - Add invitation decision endpoint
  - Update existing endpoint schemas to reflect Zod validation
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.2 Update SAM template


  - Add new Lambda functions for notifications and invitations
  - Configure proper IAM permissions for DynamoDB access
  - Set up API Gateway integration for new endpoints
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 7. Create comprehensive tests





  - Write unit tests for validation utilities
  - _Requirements: 4.5, 5.5_

- [x] 7.1 Write validation system tests


  - Test Zod schema validation for all endpoint types
  - Test error handling and response formatting
  - Test edge cases and validation performance
  - _Requirements: 4.4, 4.5_



- [x] 7.2 Write notification system tests





  - Test notification creation, listing, and deletion
  - Test pagination and filtering functionality
  - Test TTL and cleanup operations


  - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 7.3 Write invitation system tests





  - Test enhanced invitation flow for existing users
  - Test invitation acceptance and rejection
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 3.1, 3.2, 3.3_
