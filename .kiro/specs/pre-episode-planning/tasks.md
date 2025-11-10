# Implementation Plan

- [x] 1. Create data validation schemas
  - Create Zod schemas for plan input validation (objectives, concepts, notes)
  - Create Zod schema for recommendations validation
  - Add validation helper functions
  - _Requirements: 1.4, 1.5, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Implement plan management Lambda functions
  - [x] 2.1 Create add-plan Lambda function
    - Write handler to accept POST requests with plan data
    - Validate input using Zod schemas
    - Store plan entity in DynamoDB with pk/sk pattern
    - Update episode status history with "plan_added"
    - Publish EventBridge event for AI processing
    - Return plan data with 201 status
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

  - [x] 2.2 Create update-plan Lambda function
    - Write handler to accept PUT requests with plan data
    - Validate episodeId and check plan exists
    - Update plan entity in DynamoDB
    - Update episode status history with "plan_updated"
    - Publish EventBridge event for AI processing
    - Return updated plan data with 200 status
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [x] 2.3 Create get-plan Lambda function
    - Write handler to accept GET requests
    - Query DynamoDB for plan entity (sk="plan")
    - Query DynamoDB for recommendations entity (sk="recommendations")
    - Return combined plan and recommendations data
    - Return 404 if plan doesn't exist
    - _Requirements: 4.1, 4.2, 4.5_

- [x] 3. Implement setPlanRecommendations tool Lambda function
  - [x] 3.1 Create tool handler function
    - Write Lambda handler to accept tool invocation from Bedrock agent
    - Validate all required parameters (episodeId, suggestedFlow, proposedTitle, proposedDescription, keyLearningMoments)
    - Validate Mermaid diagram syntax in suggestedFlow
    - Validate title length (10-200 characters)
    - Validate description length (50-1000 characters)
    - Validate keyLearningMoments is non-empty array
    - _Requirements: 6.1, 6.2, 6.3, 3.2, 3.3, 3.4, 3.5_

  - [x] 3.2 Store recommendations in DynamoDB
    - Create recommendations entity with pk/sk pattern
    - Store all recommendation fields
    - Add generatedAt timestamp
    - Update episode status history with "recommendations_generated"
    - Return success response to Bedrock agent
    - _Requirements: 6.4, 6.5, 2.4, 3.1_

- [x] 4. Implement AI Planning Agent Lambda function
  - [x] 4.1 Create agent invocation handler
    - Write Lambda handler triggered by EventBridge
    - Extract plan data from event detail
    - Retrieve episode metadata from DynamoDB
    - _Requirements: 2.1_

  - [x] 4.2 Invoke Bedrock agent with plan context
    - Construct system prompt for episode planning
    - Include objectives, concepts, and notes in prompt
    - Invoke Bedrock agent with amazon.nova-pro-v1:0 model
    - Register setPlanRecommendations tool with agent
    - Handle agent response and tool invocations
    - _Requirements: 2.2, 2.3_

  - [x] 4.3 Handle agent errors
    - Catch Bedrock invocation errors
    - Log error details with structured logging
    - Update episode status history with "recommendations_failed"
    - Implement retry logic for transient failures
    - _Requirements: 2.5_

- [x] 5. Update SAM template with new resources
  - [x] 5.1 Add Lambda function definitions
    - Define AddPlanFunction with API Gateway trigger
    - Define UpdatePlanFunction with API Gateway trigger
    - Define GetPlanFunction with API Gateway trigger
    - Define SetPlanRecommendationsFunction with appropriate permissions
    - Define PlanningAgentFunction with EventBridge trigger
    - Configure environment variables for all functions
    - _Requirements: All_

  - [x] 5.2 Add IAM permissions
    - Grant DynamoDB read/write permissions to plan functions
    - Grant EventBridge PutEvents permission to plan functions
    - Grant Bedrock InvokeModel permission to agent function
    - Grant DynamoDB permissions to tool function
    - _Requirements: All_

  - [x] 5.3 Add EventBridge rule
    - Create rule to match "Episode Plan Updated" events
    - Configure rule to trigger PlanningAgentFunction
    - _Requirements: 2.1_

- [x] 6. Update OpenAPI specification
  - Add POST /episodes/{episodeId}/plan endpoint
  - Add PUT /episodes/{episodeId}/plan endpoint
  - Add GET /episodes/{episodeId}/plan endpoint
  - Define request/response schemas for all endpoints
  - Add error response definitions
  - _Requirements: 1.1, 4.1, 4.2, 5.1_

- [x] 7. Create frontend components for plan management
  - [x] 7.1 Create PlanForm component
    - Build form with objectives, concepts, and notes fields
    - Implement form validation
    - Handle form submission to API
    - Show success/error messages
    - _Requirements: 1.1, 5.1_

  - [x] 7.2 Create PlanRecommendations component
    - Display proposed title and description
    - Render key learning moments as list
    - Show loading state while recommendations generate
    - Handle case when recommendations don't exist yet
    - _Requirements: 4.2, 4.5_

  - [x] 7.3 Create MermaidDiagram component
    - Install and configure react-mermaid library
    - Render Mermaid sequence diagram from suggestedFlow
    - Handle diagram rendering errors gracefully
    - Add diagram zoom/pan controls if needed
    - _Requirements: 4.3_

  - [x] 7.4 Integrate components into episode detail page
    - Add plan section to episode detail page
    - Show plan form if no plan exists
    - Show plan data and recommendations if plan exists
    - Add "Edit Plan" functionality
    - Display status history with plan-related statuses
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ] 8. Create API client functions
  - Add createPlan function to episodes API client
  - Add updatePlan function to episodes API client
  - Add getPlan function to episodes API client
  - Handle API errors and return user-friendly messages
  - _Requirements: 1.1, 4.1, 5.1_

- [ ] 9. Update status history utility
  - Add "plan_added" status to status constants
  - Add "plan_updated" status to status constants
  - Add "recommendations_generated" status to status constants
  - Add "recommendations_failed" status to status constants
  - Update status display logic to show plan-related statuses
  - _Requirements: 1.3, 2.4, 2.5, 5.3_

- [ ] 10. Deploy and verify
  - Run sam build to compile all functions
  - Deploy to development environment
  - Test plan creation via API
  - Verify EventBridge event triggers agent
  - Verify recommendations are generated and stored
  - Test frontend plan form and recommendations display
  - Verify Mermaid diagram renders correctly
  - _Requirements: All_
