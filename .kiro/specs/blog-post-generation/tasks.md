# Implementation Plan

- [ ] 1. Extend data models for brand voice configuration
  - Add voice object under branding in user profile schema with tone, writingStyle, and perspective fields
  - Add voice object under branding in team metadata schema with tone, writingStyle, and perspective fields
  - Update DynamoDB item structures to include new fields
  - Add perspective enum validation (first_person, third_person)
  - Set default perspective value to first_person
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.9, 2.1_

- [ ] 2. Create brand voice API endpoints
  - Implement PUT /users/profile endpoint to update user brand voice settings including perspective
  - Implement PUT /teams/{teamId} endpoint to update team brand voice settings including perspective
  - Add validation for tone, writingStyle, and perspective fields using Zod schemas
  - Add enum validation for perspective field (first_person, third_person)
  - Update existing GET endpoints to return brand voice data with perspective
  - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3. Implement buildBlogOutline tool
  - Create tool definition with Zod schema for episodeId and outline parameters
  - Implement tool handler to store outline in DynamoDB with correct pk/sk structure
  - Add status field management (outline_created)
  - Add timestamp tracking for createdAt and updatedAt
  - Publish BlogOutlineCreated event to EventBridge
  - Mark tool as multi-tenant with tenantId inference
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 4. Integrate buildBlogOutline tool with Clip Detector Agent
  - Add buildBlogOutline tool to Clip Detector Agent's tool array
  - Update agent system prompt to include blog outline generation instructions
  - Configure tool to be called after clip detection completes
  - _Requirements: 2.1_

- [x] 5. Create web search tool for blog generation
  - Define webSearch tool with Zod schema for query and maxResults
  - Implement search handler using AWS Bedrock Knowledge Base or external API
  - Add result formatting and sanitization
  - Configure search result limits and filtering
  - _Requirements: 3.2, 3.3_

- [ ] 6. Implement Blog Generator Agent Lambda function
  - Create new Lambda function at functions/agents/blog-generator.mjs
  - Configure EventBridge trigger for BlogOutlineCreated events
  - Implement agent initialization with amazon.nova-pro-v1:0 model
  - Add web search tool to agent's tool array
  - Load blog outline from DynamoDB
  - Load episode metadata and transcript context
  - Load tenant brand voice settings from user/team profile including perspective
  - Build system prompt with perspective-specific instructions
  - Add conditional logic for first_person vs third_person perspective in prompt
  - Default to first_person perspective if not configured
  - Update blog status to content_generating before generation
  - Invoke Bedrock converse with system prompt and context
  - Store generated content in DynamoDB with correct pk/sk structure
  - Update status to content_generated on success
  - Update status to failed on error with error details
  - Add comprehensive error handling and logging
  - _Requirements: 2.2, 2.3, 2.5, 2.6, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

- [x] 7. Create GET /episodes/{episodeId}/blog endpoint
  - Create Lambda function at functions/episodes/get-blog.mjs
  - Query DynamoDB for both outline and content records
  - Combine results into single response object
  - Include status, wordCount, and timestamps
  - Return 404 when blog doesn't exist
  - Return 200 with blog data when found
  - Add proper CORS headers using formatResponse utility
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

- [x] 8. Create PUT /episodes/{episodeId}/blog endpoint
  - Create Lambda function at functions/episodes/update-blog.mjs
  - Validate outline and content fields using Zod schema
  - Update outline record if outline provided
  - Update content record if content provided
  - Set status to outline_edited when outline modified
  - Set status to content_edited when content modified
  - Update timestamps on modification
  - Return 404 when blog doesn't exist
  - Return 200 with updated data on success
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8_

- [x] 9. Create DELETE /episodes/{episodeId}/blog endpoint
  - Create Lambda function at functions/episodes/delete-blog.mjs
  - Delete both outline and content records from DynamoDB
  - Use BatchWriteItem for atomic deletion
  - Return 204 on successful deletion
  - Return 404 when blog doesn't exist
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 10. Create POST /episodes/{episodeId}/blog endpoint
  - Create Lambda function at functions/episodes/regenerate-blog.mjs
  - Accept outline in request body
  - Store new outline in DynamoDB
  - Set status to regenerating
  - Publish BlogOutlineCreated event to trigger Blog Generator Agent
  - Return 202 Accepted with status message
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_

- [x] 11. Update SAM template with blog resources
  - Add Blog Generator Agent Lambda function definition
  - Configure EventBridge rule for BlogOutlineCreated events
  - Add API Gateway routes for blog endpoints (GET, PUT, DELETE, POST)
  - Configure Lambda permissions for DynamoDB access
  - Configure Lambda permissions for EventBridge publishing
  - Configure Lambda permissions for Bedrock model invocation
  - Set appropriate timeouts (900s for blog generation)
  - Add environment variables for table name and model ID
  - _Requirements: All_

- [x] 12. Update OpenAPI specification
  - Add /episodes/{episodeId}/blog path with GET, PUT, DELETE, POST methods
  - Define request schemas for PUT and POST operations
  - Define response schemas for all operations
  - Add error response definitions (400, 404, 409, 500)
  - Document brand voice configuration in user and team schemas
  - _Requirements: All_

- [x] 13. Create React blog management page
  - Create BlogPage component at src/pages/BlogPage.tsx
  - Implement route at /episodes/{episodeId}/blog
  - Add navigation link from episode detail page
  - Fetch blog data on component mount
  - Display loading state during data fetch
  - Display error state when fetch fails
  - _Requirements: 8.1_

- [x] 14. Implement blog view toggle components
  - Create ViewToggle component to switch between outline and content
  - Create FormatToggle component to switch between markdown and preview
  - Implement state management for viewMode (outline/content)
  - Implement state management for formatMode (markdown/preview)
  - Display outline when viewMode is 'outline'
  - Display content when viewMode is 'content'
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [x] 15. Implement markdown preview rendering
  - Add markdown rendering library (react-markdown or marked)
  - Create MarkdownPreview component
  - Render markdown as formatted HTML
  - Apply styling for headings, lists, code blocks
  - Make preview read-only (no editing)
  - Display preview when formatMode is 'preview'
  - _Requirements: 8.6, 8.7_

- [x] 16. Implement blog regeneration UI
  - Create RegenerateButton component
  - Track outline dirty state (isDirty flag)
  - Enable button when outline has been modified
  - Disable button when outline is unchanged
  - Send POST request to /episodes/{episodeId}/blog on click
  - Display loading indicator during regeneration
  - Poll for status updates every 5 seconds
  - Refresh content when status changes to content_generated
  - Reset isDirty flag after successful regeneration
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 17. Implement blog status indicator
  - Create StatusIndicator component
  - Display current status with appropriate styling
  - Show loading spinner for generating/regenerating states
  - Show success icon for generated states
  - Show error icon for failed state
  - Display status in user-friendly text
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6_

- [x] 18. Add brand voice configuration to onboarding flow
  - Add optional brand voice configuration step to user onboarding
  - Create form inputs for tone and writingStyle in onboarding
  - Add skip button to allow users to configure later
  - Store brand voice settings when provided during onboarding
  - _Requirements: 1.1, 1.6, 1.7_

- [ ] 19. Add brand voice configuration UI to settings
  - Add brand voice fields to user profile settings page
  - Add brand voice fields to team settings page
  - Create form inputs for tone, writingStyle, and perspective
  - Add perspective selector with radio buttons or dropdown (first_person, third_person)
  - Add clear explanation text for each perspective option
  - Display help text: "First Person: Write as if you're speaking directly (I, we, my, our). Best for personal blogs and direct engagement."
  - Display help text: "Third Person: Write from an outside perspective (they, the team, the author). Best for company blogs and professional content."
  - Add validation for required fields
  - Send PUT requests to update brand voice settings including perspective
  - Display success/error messages after save
  - _Requirements: 1.1, 1.2, 2.4_

- [x] 20. Implement error handling and user feedback
  - Add error boundary for blog page
  - Display toast notifications for API errors
  - Show inline error messages for validation failures
  - Preserve user edits in local storage on error
  - Add retry button for failed operations
  - Handle 404 errors with helpful message
  - _Requirements: All_

- [x] 21. Write unit tests for blog components
  - Test brand voice validation logic
  - Test buildBlogOutline tool handler with mocked DynamoDB
  - Test blog API endpoint handlers with mocked dependencies
  - Test markdown parsing and sanitization
  - Test status transition logic
  - _Requirements: All_

- [x] 22. Write integration tests for blog workflow
  - Test complete blog generation flow from outline to content
  - Test EventBridge event triggering
  - Test agent tool calling with mocked Bedrock responses
  - Test API CRUD operations
  - Test concurrent blog generation handling
  - _Requirements: All_
