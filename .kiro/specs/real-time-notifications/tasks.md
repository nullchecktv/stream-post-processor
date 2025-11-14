  # Implementation Plan

- [x] 1. Set up Momento infructure and configuration





  - Add Momento API key and cache name parameters to SAM template
  - Configure environment variables for Lambda functions
  - Update samconfig files with Momento parameters
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2. Implement Momento token generation in pre-token generation trigger





  - [x] 2.1 Add Momento SDK dependency to package.json


    - Install @gomomento/sdk package
    - _Requirements: 6.1_

  - [x] 2.2 Implement team membership query logic


    - Query GSI1 for user's team memberships
    - Extract team IDs from membership records
    - _Requirements: 6.2, 6.7_

  - [x] 2.3 Generate Momento auth token with scoped permissions

    - Build permission list for userId, team topics, and task topics
    - Use subscribeonly role for all permissions
    - Set appropriate expiration time (1 hour)
    - _Requirements: 6.3, 6.4, 6.5_

  - [x] 2.4 Add Momento token to JWT custom claims

    - Add momentoToken to claimsToAddOrOverride
    - _Requirements: 6.6_

- [x] 3. Create token refresh endpoint




  - [x] 3.1 Create refresh-token Lambda function


    - Create functions/tokens/refresh-token.mjs
    - Extract userId from JWT authorization header
    - _Requirements: 7.1, 7.2_

  - [x] 3.2 Implement token generation logic

    - Query user's current team memberships
    - Generate new Momento auth token with updated permissions
    - Return token and expiration in response
    - _Requirements: 7.3, 7.4_

  - [x] 3.3 Add API Gateway endpoint


    - Add POST /tokens/refresh to openapi.yaml
    - Configure Lambda integration in template.yaml
    - Set appropriate IAM permissions
    - _Requirements: 7.1_

- [x] 4. Create centralized notification handler





  - [x] 4.1 Create notification-handler Lambda function


    - Create functions/events/notification-handler.mjs
    - Set up EventBridge trigger for Notification events
    - _Requirements: 4.1, 4.2_

  - [x] 4.2 Implement notification persistence logic

    - Check persist flag in event detail
    - Call createNotification utility if persist is true
    - _Requirements: 4.3_

  - [x] 4.3 Implement Momento publishing logic

    - Determine topic name based on topic field (tenant vs tasks)
    - Publish message to appropriate Momento topic
    - Include type, title, message, url, subscriptionId, timestamp
    - Handle errors gracefully without failing
    - _Requirements: 4.4, 4.5, 4.6, 4.7_

  - [x] 4.4 Add Lambda function to SAM template


    - Configure EventBridge trigger with Notification detail-type
    - Set environment variables (TABLE_NAME, MOMENTO_API_KEY, MOMENTO_CACHE_NAME)
    - Configure IAM permissions for DynamoDB and Momento
    - _Requirements: 4.1_

- [x] 5. Update notification utilities





  - [x] 5.1 Create publishNotificationEvent utility function


    - Add to functions/utils/notifications.mjs
    - Accept parameters: type, tenantId, userId, title, message, url, persist, topic, subscriptionId, metadata
    - Publish event to EventBridge default bus
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9_

  - [x] 5.2 Update existing publishNotification function


    - Mark as deprecated or remove if no longer needed
    - Migrate any existing usages to publishNotificationEvent
    - _Requirements: 4.1_

- [x] 6. Update async operation endpoints to publish notification events





  - [x] 6.1 Update clip generation endpoint


    - Call publishNotificationEvent when clip processing completes
    - Set topic to 'tasks' and subscriptionId to clipId
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.2 Update blog generation endpoint


    - Call publishNotificationEvent when blog generation completes
    - Set topic to 'tasks' and subscriptionId to '{episodeId}_blog'
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.3 Update plan generation endpoint


    - Call publishNotificationEvent when plan generation completes
    - Set topic to 'tasks' and subscriptionId to '{episodeId}_plan'
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.4 Update quote graphic generation endpoint


    - Call publishNotificationEvent when graphic generation completes
    - Set topic to 'tasks' and subscriptionId to quoteId
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 6.5 Update video preprocessing endpoint


    - Call publishNotificationEvent when preprocessing completes
    - Set topic to 'tasks' and subscriptionId to track identifier
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

- [x] 7. Implement frontend Momento client





  - [x] 7.1 Add Momento SDK to frontend dependencies


    - Install @gomomento/sdk-web package
    - _Requirements: 5.1_

  - [x] 7.2 Create NotificationContext


    - Create frontend/src/contexts/NotificationContext.tsx
    - Define NotificationContextValue interface
    - Define MomentoMessage interface
    - _Requirements: 5.1, 5.2_

  - [x] 7.3 Implement Momento client initialization

    - Extract Momento token from JWT custom claims
    - Create TopicClient with token
    - Implement getTopicClient singleton pattern
    - _Requirements: 5.1_

  - [x] 7.4 Implement tenant and tasks topic subscription

    - Subscribe to {tenantId} topic on login
    - Subscribe to {tenantId}_tasks topic automatically
    - Store subscription references for cleanup
    - _Requirements: 1.1, 3.1, 3.2_

  - [x] 7.5 Implement message handlers

    - Handle tenant topic messages (call GET /activities, update badge)
    - Handle tasks topic messages (check URL, refresh or show toast)
    - Validate message structure before processing
    - _Requirements: 1.2, 1.3, 2.2, 2.3, 2.4, 2.5, 2.6_

  - [x] 7.6 Implement team switch logic

    - Unsubscribe from old tenant and tasks topics
    - Subscribe to new tenant and tasks topics
    - _Requirements: 1.4, 1.5_

  - [x] 7.7 Implement token refresh logic

    - Track refresh attempts with max of 3
    - Call POST /tokens/refresh on 401/403 errors
    - Re-establish subscriptions with new token
    - Redirect to login after max attempts
    - _Requirements: 5.6, 5.7, 7.5, 7.6_

  - [x] 7.8 Implement cleanup on logout

    - Unsubscribe from all active topics
    - Clear subscription references
    - Reset refresh attempt counter
    - _Requirements: 1.6, 5.9_

  - [x] 7.9 Implement reconnection logic

    - Handle network connectivity loss
    - Attempt reconnection with exponential backoff
    - Re-establish subscriptions on connectivity restore
    - _Requirements: 5.8, 5.9_

- [x] 8. Update authentication flow





  - [x] 8.1 Extract Momento token from JWT


    - Update AuthContext to extract momentoToken from JWT claims
    - Store Momento token in auth state
    - _Requirements: 5.1_

  - [x] 8.2 Initialize Momento subscriptions on login


    - Call NotificationContext subscribe method after successful login
    - Pass tenantId and Momento token
    - _Requirements: 1.1, 5.2_

  - [x] 8.3 Handle team switch in UI


    - Update NotificationContext when active team changes
    - Trigger unsubscribe/subscribe flow
    - _Requirements: 1.4, 1.5, 5.3_

- [x] 9. Create token refresh API client




  - [x] 9.1 Add refreshMomentoToken function to API client


    - Create frontend/src/api/tokens.ts
    - Implement POST /tokens/refresh call
    - Return new Momento token
    - _Requirements: 7.5_

  - [x] 9.2 Integrate with NotificationContext


    - Call refreshMomentoToken from context
    - Update stored token in auth state
    - Re-establish subscriptions
    - _Requirements: 7.6_

- [x] 10. Update UI components




  - [x] 10.1 Update notification badge


    - Connect to NotificationContext unreadCount
    - Update count when tenant messages received
    - _Requirements: 1.2, 1.3_

  - [x] 10.2 Implement toast notifications for tasks


    - Show toast when task message received and URL differs from current page
    - Include navigation button in toast
    - _Requirements: 2.4, 2.5, 2.6_

  - [x] 10.3 Implement page refresh for tasks

    - Refresh current page data when task message URL matches current page
    - _Requirements: 2.3_

- [ ] 11. Deploy and test infrastructure
  - [ ] 11.1 Deploy SAM template with Momento configuration
    - Add Momento parameters to deployment
    - Verify Lambda functions deployed
    - Verify EventBridge rules created
    - _Requirements: 6.1, 6.2, 6.3_

  - [ ] 11.2 Test pre-token generation trigger
    - Verify Momento token added to JWT
    - Verify token has correct permissions
    - Verify token expiration set correctly
    - _Requirements: 6.3, 6.4, 6.5, 6.6_

  - [ ] 11.3 Test token refresh endpoint
    - Verify endpoint returns new token
    - Verify token has updated permissions
    - Verify error handling for invalid requests
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [ ] 11.4 Test notification handler
    - Publish test notification event to EventBridge
    - Verify notification persisted in DynamoDB
    - Verify message published to Momento topic
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

  - [ ] 11.5 Test end-to-end notification flow
    - Trigger async operation (e.g., generate clip)
    - Verify notification event published
    - Verify frontend receives Momento message
    - Verify UI updates appropriately
    - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6_

