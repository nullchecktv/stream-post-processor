# Requirements Document

## Introduction

This feature enhances the notification system with real-time updates using Momento Topics for pub/sub messaging. The system will provide immediate feedback to users when async operations complete and maintain a live notification badge showing unread activity counts.

## Glossary

- **Notification System**: The complete system for creating, delivering, and displaying notifications to users
- **Momento Topics**: A serverless pub/sub messaging service for real-time communication
- **Subscription ID**: A unique identifier for a resource included in task completion messages (e.g., clipId, quoteId, "{episodeId}_blog")
- **Tenant Topic**: A Momento topic named after the tenant ID for broadcasting general notifications to all team members
- **Tasks Topic**: A Momento topic named "{tenantId}_tasks" for operation-specific updates and async task completion notifications
- **Momento Auth Token**: A scoped authentication token that grants access to specific Momento topics based on user permissions
- **Activity**: A notification record stored in DynamoDB and displayed in the UI
- **Notification Handler**: A Lambda function that processes notification events and determines delivery method
- **Toast Notification**: A temporary UI message that appears to inform users of completed operations
- **Notification Badge**: A UI indicator showing the count of unread notifications

## Requirements

### Requirement 1: Real-Time Tenant Notifications

**User Story:** As a user, I want to receive real-time notifications about team activities so that I stay informed without refreshing the page

#### Acceptance Criteria

1. WHEN a user logs in, THE Notification System SHALL subscribe to Momento topics named with their active tenant ID and "{tenantId}_tasks"
2. WHEN a notification is published to the tenant topic, THE Notification System SHALL call GET /activities endpoint to refresh the notification list
3. WHEN new activities are retrieved, THE Notification System SHALL update the notification badge with the count of unread notifications
4. WHEN a user switches active teams, THE Notification System SHALL unsubscribe from the previous tenant and tasks topics
5. WHEN a user switches active teams, THE Notification System SHALL subscribe to the new tenant topic and new tasks topic
6. WHEN a user logs out, THE Notification System SHALL unsubscribe from all active Momento topic subscriptions

### Requirement 2: Task Completion Notifications

**User Story:** As a user, I want immediate feedback when async operations complete so that I know when results are ready

#### Acceptance Criteria

1. WHEN a message is received on the tasks topic, THE Notification System SHALL extract the subscription ID from the message
2. WHEN a task notification is received, THE Notification System SHALL check if the notification URL matches the current page URL
3. IF the notification URL matches the current page URL, THEN THE Notification System SHALL refresh the current page data
4. IF the notification URL differs from the current page URL, THEN THE Notification System SHALL display a toast notification with navigation option
5. WHEN displaying a toast for task completion, THE Notification System SHALL include the notification title and message
6. WHEN a user clicks a task completion toast, THE Notification System SHALL navigate to the notification URL

### Requirement 3: Automatic Task Topic Subscription

**User Story:** As a user, I want to automatically receive task completion notifications for my team so that I don't need to manually track operations

#### Acceptance Criteria

1. WHEN a user subscribes to a tenant topic, THE Notification System SHALL automatically subscribe to the corresponding tasks topic
2. WHEN subscribing to tasks topic, THE Notification System SHALL use the pattern "{tenantId}_tasks"
3. WHEN a user unsubscribes from a tenant topic, THE Notification System SHALL automatically unsubscribe from the corresponding tasks topic
4. WHEN a task completion notification is published, THE Notification System SHALL include the resource ID as the subscription identifier
5. WHERE a resource is a singleton per episode (blog or plan), THE Notification System SHALL use "{episodeId}_blog" or "{episodeId}_plan" as the subscription identifier
6. WHEN a task notification is received, THE Notification System SHALL process it regardless of whether the user initiated the operation

### Requirement 4: Centralized Notification Management

**User Story:** As a system administrator, I want notifications to be managed centrally so that delivery logic is consistent and maintainable

#### Acceptance Criteria

1. WHEN any Lambda function creates a notification, THE Notification System SHALL publish an EventBridge event with notification details
2. WHEN the Notification Handler receives a notification event, THE Notification System SHALL determine the appropriate delivery method
3. IF the notification should be persisted, THEN THE Notification System SHALL store the notification in DynamoDB
4. IF the notification should be delivered in real-time, THEN THE Notification System SHALL publish to the appropriate Momento topic
5. WHEN publishing to Momento, THE Notification System SHALL include notification metadata (type, title, message, url, subscriptionId, timestamp)
6. WHEN a notification is for general team awareness, THE Notification System SHALL publish to the tenant topic
7. WHEN a notification is for task completion, THE Notification System SHALL publish to the tasks topic with the subscription ID

### Requirement 5: Frontend Notification Context

**User Story:** As a user, I want the notification system to work seamlessly across the application so that I have a consistent experience

#### Acceptance Criteria

1. WHEN the application initializes, THE Notification System SHALL create a Momento client with the user's auth token
2. WHEN a user authenticates, THE Notification System SHALL establish subscriptions to the tenant topic and tasks topic
3. WHEN a user switches teams, THE Notification System SHALL unsubscribe from previous topics and subscribe to new tenant and tasks topics
4. WHEN the notification badge is clicked, THE Notification System SHALL navigate to the activities page
5. WHEN a toast notification is clicked, THE Notification System SHALL navigate to the notification URL
6. WHEN a Momento subscription returns a 401 or 403 error, THE Notification System SHALL call the token refresh endpoint
7. WHEN a new Momento auth token is received, THE Notification System SHALL re-establish all active subscriptions with the new token
8. WHEN network connectivity is lost, THE Notification System SHALL attempt to reconnect to Momento topics
9. WHEN network connectivity is restored, THE Notification System SHALL re-establish all active subscriptions

### Requirement 6: Momento Authentication Token Generation

**User Story:** As a user, I want secure access to real-time notifications so that only authorized team members receive updates

#### Acceptance Criteria

1. WHEN a user authenticates via Cognito, THE Notification System SHALL generate a Momento auth token in the pre-token generation trigger
2. WHEN generating a Momento auth token, THE Notification System SHALL scope permissions to the user's userId topic
3. WHEN generating a Momento auth token, THE Notification System SHALL scope permissions to all tenant topics for teams the user is a member of
4. WHEN generating a Momento auth token, THE Notification System SHALL scope permissions to all tasks topics for teams the user is a member of
5. WHEN generating a Momento auth token, THE Notification System SHALL set an appropriate expiration time
6. WHEN generating a Momento auth token, THE Notification System SHALL include the token in the Cognito JWT custom claims
7. WHEN a user's team memberships change, THE Notification System SHALL require token refresh to update topic permissions

### Requirement 7: Token Refresh Endpoint

**User Story:** As a user, I want my notification connection to remain active even after my token expires so that I don't miss updates

#### Acceptance Criteria

1. WHEN the frontend calls POST /tokens/refresh, THE Notification System SHALL validate the user's current authentication
2. WHEN generating a refreshed token, THE Notification System SHALL query the user's current team memberships
3. WHEN generating a refreshed token, THE Notification System SHALL create a new Momento auth token with updated permissions
4. WHEN generating a refreshed token, THE Notification System SHALL return the new Momento auth token in the response
5. WHEN a Momento subscription receives a 401 or 403 error, THE Notification System SHALL automatically call the token refresh endpoint
6. WHEN the token refresh succeeds, THE Notification System SHALL re-establish all active Momento subscriptions

### Requirement 8: Notification Event Schema

**User Story:** As a developer, I want a consistent event schema for notifications so that the system is predictable and maintainable

#### Acceptance Criteria

1. WHEN publishing a notification event, THE Notification System SHALL include a "type" field indicating the notification category
2. WHEN publishing a notification event, THE Notification System SHALL include a "tenantId" field for tenant isolation
3. WHEN publishing a notification event, THE Notification System SHALL include a "userId" field for user-specific notifications
4. WHEN publishing a notification event, THE Notification System SHALL include "title" and "message" fields for display
5. WHEN publishing a notification event, THE Notification System SHALL include a "url" field for navigation
6. WHEN publishing a notification event, THE Notification System SHALL include a "persist" boolean indicating whether to store in DynamoDB
7. WHEN publishing a notification event, THE Notification System SHALL include a "subscriptionId" field for task-specific notifications
8. WHEN publishing a notification event, THE Notification System SHALL include a "topic" field indicating whether to publish to tenant or tasks topic
9. WHEN publishing a notification event, THE Notification System SHALL include metadata specific to the notification type
