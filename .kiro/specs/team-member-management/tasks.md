# Team Member Management Implementation Plan

- [x] 1. Implement team member CRUD operations





- [x] 1.1 Create add team member function


  - Write `functions/teams/add-member.mjs` with role-based permission validation
  - Implement inline validation for email format and role values
  - Creembership record using existing structure (pk: team#{teamId}, sk: user#{userId})
  - Add duplicate membership prevention logic
  - Publish "Team Member Added" EventBridge event for email notifications
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 1.2 Create remove team member function


  - Write `functions/teams/remove-member.mjs` with role-based permission validation
  - Implement team membership deletion using existing record structure
  - Add logic to clear user's active team if it matches the removed team
  - Prevent team owners from removing themselves
  - Publish "Team Member Removed" EventBridge event for email notifications
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.3 Create list team members function


  - Write `functions/teams/list-members.mjs` with team membership validation
  - Query team members using existing access pattern (pk: team#{teamId}, sk begins with user#)
  - Include role information and join dates in response
  - Show pending invitations only to owners and administrators
  - Implement pagination support for large member lists
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 1.4 Create update member role function


  - Write `functions/teams/update-member-role.mjs` with owner-only validation
  - Update member role in existing membership record structure
  - Prevent owners from changing their own role
  - Default new members to "member" role unless specified
  - Publish "Team Member Role Updated" EventBridge event
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 1.5 Create leave team function


  - Write `functions/teams/leave-team.mjs` for voluntary member departure
  - Remove membership record and clear active team if applicable
  - Prevent team owners from leaving their own team
  - Publish "Team Member Left" EventBridge event for notifications
  - Send confirmation email to departing member and notification to owner
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 2. Implement email notification system





- [x] 2.1 Create email notification function


  - Write `functions/events/send-team-email.mjs` to process EventBridge team events
  - Handle "Team Member Added", "Team Member Removed", "Team Member Role Updated" events
  - Implement email template selection based on event type
  - Use Amazon SES for email delivery with proper error handling
  - Log email delivery status for monitoring
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2.2 Create Handlebars email templates

  - Create `templates/emails/team-invitation.hbs` template with {{userName}}, {{teamName}}, {{inviterName}}, and {{appUrl}} variables
  - Create `templates/emails/team-removal.hbs` template with {{userName}}, {{teamName}}, and {{appUrl}} variables
  - Create `templates/emails/role-change.hbs` template with {{userName}}, {{teamName}}, {{newRole}}, and {{appUrl}} variables
  - Create `templates/emails/welcome-auto-link.hbs` template with {{userName}}, {{teamName}}, and {{appUrl}} variables
  - Add Handlebars dependency and create template compilation utility in email notification function
  - All templates include professional styling, team branding, and direct link to the application
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 2.3 Implement email delivery error handling






  - Add retry logic with exponential backoff for temporary SES failures
  - Handle permanent email delivery failures gracefully without blocking operations
  - Implement dead letter queue for failed email notifications
  - Add CloudWatch metrics for email delivery success rates
  - Log email failures for monitoring and debugging
  - _Requirements: 3.5, 11.2, 11.5_

- [x] 3. Implement pending invitation system





- [x] 3.1 Create pending invitation records


  - Modify add-member function to create invitation records for non-registered users
  - Store invitation with email, team details, role, and expiration (30 days TTL)
  - Use invitation record structure: pk: invitation#{email}, sk: team#{teamId}
  - Include GSI for team-based invitation queries
  - Send invitation email immediately upon creation
  - _Requirements: 1.1, 1.2, 4.1_

- [x] 3.2 Create registration hook for auto-linking


  - Write `functions/auth/post-confirmation.mjs` for Cognito post-confirmation trigger
  - Query pending invitations by user email during registration
  - Auto-link user to all teams with pending invitations
  - Create team membership records using existing structure
  - Remove pending invitation records after successful linking
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 3.3 Implement invitation management
  - Add invitation listing to list-members function for owners/administrators
  - Create invitation cancellation endpoint for owners/administrators
  - Implement invitation expiration cleanup using DynamoDB TTL
  - Add invitation resend functionality for expired invitations
  - Track invitation status and delivery in invitation records
  - _Requirements: 5.4, 4.4_

- [x] 4. Implement comprehensive asset cleanup system





- [x] 4.1 Create team asset cleanup function


  - Write `functions/events/cleanup-team-assets.mjs` triggered by "Team Deleted" EventBridge event
  - Query all episodes associated with the deleted team using tenant context
  - Identify all clips, transcripts, and video tracks for team episodes
  - Delete all DynamoDB records for team episodes, clips, transcripts, and tracks
  - Remove all S3 objects associated with team content (videos, transcripts, clips)
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 4.2 Implement batch deletion operations






  - Use DynamoDB batch delete operations for efficient record removal
  - Implement S3 batch delete API for multiple object removal
  - Handle pagination for large datasets during cleanup
  - Add error handling to continue cleanup despite individual failures
  - Implement progress tracking and monitoring for cleanup operations
  - _Requirements: 6.5, 11.3_



- [x] 4.3 Add member and invitation cleanup





  - Delete all team membership records during asset cleanup
  - Remove all pending invitation records for the deleted team
  - Clear active team from user profiles if it matches deleted team
  - Send final notification emails to removed members
  - Complete cleanup within reasonable time limits
  - _Requirements: 6.4, 6.5_

- [-] 5. Enhance existing user profile endpoint


- [x] 5.1 Update get-profile function for role information



  - Modify `functions/users/get-profile.mjs` to include role information for each team
  - Query user's team memberships using existing GSI pattern
  - Include role details (owner, administrator, member) in team list
  - Maintain backward compatibility with existing client applications
  - Show team hierarchy with owned teams vs member teams
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ]* 5.2 Optimize team membership queries
  - Implement efficient querying using GSI1PK: user#{userId}#teams pattern
  - Add caching for frequently accessed team membership data
  - Minimize DynamoDB calls for team role resolution
  - Use batch operations for multiple team membership queries
  - Optimize authorizer performance for team context resolution
  - _Requirements: 8.5_

- [x] 6. Add API Gateway endpoints and OpenAPI specification





- [x] 6.1 Define member management API endpoints


  - Add POST /teams/{teamId}/members endpoint for adding members
  - Add DELETE /teams/{teamId}/members/{userId} endpoint for removing members
  - Add GET /teams/{teamId}/members endpoint for listing team members
  - Add PUT /teams/{teamId}/members/{userId}/role endpoint for role updates
  - Add DELETE /teams/{teamId}/members/me endpoint for leaving teams
  - _Requirements: 1.1, 2.1, 5.1, 10.1, 7.1_

- [ ]* 6.2 Define invitation management API endpoints
  - Add GET /teams/{teamId}/invitations endpoint for listing pending invitations
  - Add DELETE /teams/{teamId}/invitations/{email} endpoint for canceling invitations
  - Add POST /teams/{teamId}/invitations/{email}/resend endpoint for resending invitations
  - Include proper request/response schemas for all invitation operations
  - Add error response definitions for invitation-related failures
  - _Requirements: 5.4, 4.4_

- [x] 6.3 Update OpenAPI specification


  - Add request/response schemas for all member management operations
  - Include role-based permission documentation in endpoint descriptions
  - Add proper error response definitions for unauthorized operations
  - Document email notification behavior in endpoint descriptions
  - Include examples for all new API endpoints
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 6.4 Update SAM template configuration


  - Add all new Lambda functions to `template.yaml`
  - Configure proper IAM permissions for DynamoDB, SES, and EventBridge access
  - Add API Gateway integration for all new endpoints
  - Configure EventBridge rules for team-related events
  - Add Cognito post-confirmation trigger configuration
  - _Requirements: All requirements need proper deployment configuration_

- [x] 7. Implement comprehensive error handling and validation





- [x] 7.1 Add input validation for all endpoints


  - Implement email format validation for member operations
  - Add role value validation (owner, administrator, member)
  - Validate team and user existence before operations
  - Prevent duplicate membership creation
  - Add request body validation for all endpoints
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.2 Implement role-based permission validation


  - Create permission validation utility for role-based access control
  - Validate user permissions before all member management operations
  - Return appropriate 403 Forbidden responses for unauthorized operations
  - Implement team membership validation for all team operations
  - Add audit logging for all permission-related operations
  - _Requirements: 1.3, 2.3, 5.3, 10.3_

- [x] 7.3 Add comprehensive error responses






  - Return clear error messages for all validation failures
  - Implement proper HTTP status codes for different error types
  - Add specific error handling for email delivery failures
  - Handle resource not found scenarios with appropriate responses
  - Provide actionable error messages for client applications
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 8. Add monitoring and logging
- [ ]* 8.1 Implement operation logging
  - Log all member addition and removal operations with context
  - Track email notification delivery status and failures
  - Monitor asset cleanup operations with progress tracking
  - Log auto-linking operations during user registration
  - Add structured logging for all member management operations
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [ ]* 8.2 Add CloudWatch metrics
  - Create custom metrics for member operation success rates
  - Track email delivery rates and bounce rates
  - Monitor asset cleanup duration and success rates
  - Add metrics for permission denial rates
  - Implement alerting for high error rates and failures
  - _Requirements: 11.5_

- [ ]* 8.3 Configure monitoring dashboards
  - Create CloudWatch dashboard for member management operations
  - Add email delivery monitoring with SES metrics
  - Monitor asset cleanup operations with progress tracking
  - Set up alerts for critical failures and high error rates
  - Include performance metrics for API response times
  - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 9. Write comprehensive tests






- [x]* 9.1 Write unit tests for member management functions


  - Test role-based permission validation logic
  - Test member addition with duplicate prevention
  - Test member removal with active team clearing
  - Test role update operations with owner restrictions
  - Test leave team functionality with owner prevention
  - _Requirements: All member management requirements need test coverage_

- [x]* 9.2 Write unit tests for email and cleanup functions


  - Test email notification event processing
  - Test email template selection and rendering
  - Test asset cleanup with batch operations
  - Test invitation auto-linking during registration
  - Test error handling for all failure scenarios
  - _Requirements: All email and cleanup requirements need test coverage_
