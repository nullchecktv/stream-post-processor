# Requirements Document

## Introduction

This feature extends the team management system to handle invitations for users who already have accounts in the system. When an existing user is invited to join a team, they should receive an in-app notification and be able to accept or reject the invitation. Additionally, this feature implements comprehensive Zod type verification across all existing API endpoints to establish clean, extensible validation patterns.

## Glossary

- **Existing User**: A user who already has an account in the system
- **Team Invitation**: A request for an existing user to join a team
- **In-App Notification**: A notification displayed within the application interface
- **Notification System**: The infrastructure for managing and delivering notifications to users
- **Zod Validation**: Runtime type checking and validation using the Zod library
- **API Endpoint**: A specific URL path that accepts HTTP requests and returns responses

## Requirements

### Requirement 1

**User Story:** As a team owner, I want to invite existing users to my team so that they can collaborate on content creation.

#### Acceptance Criteria

1. WHEN a team owner invites an existing user, THE System SHALL create a team invitation notification for the target user
2. WHEN a team invitation is created, THE System SHALL store the invitation with pending status in the database
3. THE System SHALL prevent duplicate invitations for the same user and team combination
4. WHEN an invitation is created, THE System SHALL include team details and inviter information in the notification
5. THE System SHALL set an expiration date for team invitations of 7 days from creation

### Requirement 2

**User Story:** As an existing user, I want to receive in-app notifications when I'm invited to join a team so that I'm aware of collaboration opportunities.

#### Acceptance Criteria

1. WHEN I am invited to join a team, THE System SHALL create an in-app notification visible in my notification list
2. THE System SHALL display the team name, inviter name, and invitation date in the notification
3. WHEN I view my notifications, THE System SHALL show unread notifications prominently
4. THE System SHALL allow me to mark notifications as read without taking action on the invitation
5. THE System SHALL automatically mark invitation notifications as read when I accept or reject the invitation

### Requirement 3

**User Story:** As an invited user, I want to accept or reject team invitations so that I can control which teams I join.

#### Acceptance Criteria

1. WHEN I receive a team invitation notification, THE System SHALL provide accept and reject action options
2. WHEN I accept an invitation, THE System SHALL add me to the team with the role specified in the invitation
3. WHEN I reject an invitation, THE System SHALL mark the invitation as rejected and remove the notification
4. WHEN I accept an invitation, THE System SHALL mark the invitation as accepted and remove the notification
5. THE System SHALL prevent action on expired invitations and display appropriate error messages

### Requirement 4

**User Story:** As a developer, I want comprehensive Zod validation on all API endpoints so that input validation is consistent and maintainable.

#### Acceptance Criteria

1. THE System SHALL implement Zod schema validation for all existing API endpoint request bodies
2. THE System SHALL implement Zod schema validation for all existing API endpoint path parameters
3. THE System SHALL implement Zod schema validation for all existing API endpoint query parameters
4. WHEN validation fails, THE System SHALL return standardized error responses with specific field-level error details
5. THE System SHALL use a centralized validation utility that can be extended for new endpoints

### Requirement 5

**User Story:** As a user, I want to manage my notifications through API endpoints so that I can view and organize my notifications.

#### Acceptance Criteria

1. THE System SHALL provide a GET /notifications endpoint that returns paginated notification lists
2. THE System SHALL provide a DELETE /notifications/{notificationId} endpoint for removing notifications
3. THE System SHALL support an isRead query parameter on the DELETE endpoint for marking notifications as read
4. WHEN I request notifications, THE System SHALL return notifications sorted by creation date with newest first
5. THE System SHALL filter notifications to show only those belonging to the authenticated user

### Requirement 6

**User Story:** As a system administrator, I want automatic cleanup of expired invitations so that the system maintains data hygiene.

#### Acceptance Criteria

1. THE System SHALL automatically remove expired team invitations after 7 days
2. THE System SHALL remove associated notifications when invitations are automatically cleaned up
3. THE System SHALL use DynamoDB TTL for automatic cleanup without requiring scheduled processes
4. WHEN an invitation expires, THE System SHALL not allow acceptance or rejection actions
5. THE System SHALL log cleanup activities for monitoring and debugging purposes
