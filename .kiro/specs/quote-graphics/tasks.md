# Implementation Plan

- [x] 1. Create quote data model and utilities





  - Create `functions/utils/quotes.mjs`e key generation and validation functions
  - Implement `createQuoteKey`, `createQuoteGSIKey`, `generateQuoteS3Key` functions
  - Add quote status constants and validation logic
  - _Requirements: 1.1, 1.2, 1.3, 1.5_

- [x] 2. Implement quote tool for AI agent





  - Create `functions/tools/create-quotes.mjs` with Zod schema for quote validation
  - Implement tool handler to store quotes in DynamoDB with proper keys and GSI
  - Add tenant validation and UUID generation for quote IDs
  - Set default values for showSpeaker (true) and showEpisodeTitle (true) flags
  - Fetch episode metadata for title
  - Publish `Generate Quote Graphic` EventBridge event for each quote with full data
  - Integrate tool into clip detector agent by adding to tools array
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 3. Add branding configuration to data models




  - Update team metadata schema to include branding field with colors and fontFamily
  - Update user profile schema to include branding field with colors and fontFamily
  - Add validation for hex color codes in team and user schemas
  - Update `functions/utils/schemas.mjs` with branding validation rules
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 4. Implement branding resolution utility





  - Create `functions/utils/branding.mjs` with branding resolution logic
  - Implement `resolveBranding(tenantId)` function to fetch tenant branding
  - Add default branding constants (primary, secondary, background, text colors, font)
  - Handle fallback to system defaults when tenant branding not configured
  - _Requirements: 2.5_

- [x] 5. Create quote API endpoints




- [x] 5.1 Implement create quote endpoint


  - Create `functions/quotes/create-quote.mjs` Lambda function
  - Validate request body with Zod schema
  - Store quote in DynamoDB with proper keys and GSI
  - Fetch episode metadata for title
  - Publish `Generate Quote Graphic` EventBridge event with full quote and episode data
  - Return 201 Created with quote ID
  - _Requirements: 4.1_

- [x] 5.2 Implement list quotes endpoint


  - Create `functions/quotes/list-quotes.mjs` Lambda function
  - Query DynamoDB by episode with pagination support
  - Generate presigned S3 URLs for quote images
  - Return paginated list with nextToken cursor
  - _Requirements: 4.2_

- [x] 5.3 Implement update quote endpoint


  - Create `functions/quotes/update-quote.mjs` Lambda function
  - Update quote metadata in DynamoDB
  - Fetch updated quote and episode data if visual fields changed
  - Publish `Generate Quote Graphic` EventBridge event to trigger graphic regeneration
  - Return 204 No Content on success
  - _Requirements: 4.3, 4.6, 4.7_

- [x] 5.4 Implement delete quote endpoint


  - Create `functions/quotes/delete-quote.mjs` Lambda function
  - Delete S3 object if exists
  - Delete DynamoDB record
  - Return 204 No Content (idempotent)
  - _Requirements: 4.4, 4.5_

- [x] 6. Implement quote graphics generator




- [x] 6.1 Create graphic generation Lambda function


  - Create `functions/quotes/generate-graphic.mjs` Lambda function
  - Configure EventBridge trigger for `Generate Quote Graphic` events
  - Extract quote and episode data from event detail (no DynamoDB lookup)
  - Resolve tenant branding using branding utility
  - Generate 1920x1080 PNG with @napi-rs/canvas library
  - _Requirements: 3.1, 3.3, 3.4_

- [x] 6.2 Implement canvas image composition

  - Create 20-pixel border in primary brand color using fillRect
  - Render inner content area with background color
  - Draw quote text with proper font, size, and color
  - Conditionally draw speaker name based on showSpeaker flag
  - Conditionally draw episode title based on showEpisodeTitle flag
  - Apply font family and colors from branding configuration
  - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

- [x] 6.3 Implement S3 upload and status update

  - Upload generated PNG to S3 with key pattern `{tenantId}/{episodeId}/quotes/{quoteId}.png`
  - Update quote record with s3Key, fileSize, and status='generated'
  - Handle errors and update status to 'failed' on failure
  - Overwrite existing S3 object when regenerating
  - _Requirements: 3.8, 4.7_

- [x] 7. Add @napi-rs/canvas Lambda layer to infrastructure





  - Add @napi-rs/canvas Lambda layer ARN (arn:aws:lambda:us-east-1:205979422636:layer:napi-rs-canvas:888) to template.yaml
  - Configure graphic generator function to use @napi-rs/canvas layer
  - Set memory to 1024 MB and timeout to 30 seconds for graphic generator
  - Add S3 PutObject and GetObject permissions for quote functions
  - _Requirements: 3.1, 3.8_

- [x] 8. Add quote API routes to OpenAPI spec





  - Add POST /episodes/{episodeId}/quotes endpoint definition
  - Add GET /episodes/{episodeId}/quotes endpoint with pagination parameters
  - Add PUT /episodes/{episodeId}/quotes/{quoteId} endpoint definition
  - Add DELETE /episodes/{episodeId}/quotes/{quoteId} endpoint definition
  - Define Quote schemas in components section
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 9. Add quote Lambda functions to SAM template





  - Add CreateQuoteFunction with API Gateway event and EventBridge PutEvents permission
  - Add ListQuotesFunction with API Gateway event
  - Add UpdateQuoteFunction with API Gateway event and EventBridge PutEvents permission
  - Add DeleteQuoteFunction with API Gateway event
  - Add GenerateQuoteGraphicFunction with EventBridge trigger for Generate Quote Graphic events
  - Configure IAM policies for DynamoDB, S3, and EventBridge access
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 3.8_

- [x] 10. Update team settings API to support branding





  - Update `functions/teams/update-team.mjs` to accept branding field
  - Validate branding colors as hex codes
  - Validate fontFamily as non-empty string
  - Store branding in team metadata
  - _Requirements: 2.1, 2.2, 2.4_

- [x] 11. Update user profile API to support branding





  - Update `functions/users/update-profile.mjs` to accept branding field
  - Validate branding colors as hex codes
  - Validate fontFamily as non-empty string
  - Store branding in user profile
  - _Requirements: 2.3, 2.4_

- [x] 12. Create frontend quote card component





  - Create `frontend/src/components/episodes/QuoteCard.tsx` component
  - Display quote text, speaker, and timestamp
  - Show thumbnail preview of generated graphic
  - Add download button with presigned URL
  - Add delete button with confirmation dialog
  - Add regenerate button for failed graphics
  - Display status indicator (detected, generated, approved, rejected)
  - _Requirements: 5.2, 5.3_

- [x] 13. Create episode quotes page and add to routing









  - Create `frontend/src/pages/EpisodeQuotesPage.tsx` component
  - Add route `/episodes/:id/quotes` to App.tsx under EpisodeLayout
  - Fetch quotes from API on page load
  - Display quote cards in grid layout (3 columns on large screens)
  - Implement pagination for large quote lists
  - Add loading and error states
  - Add page header with episode title
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [x] 14. Add quotes navigation to episode sidebar








  - Update `frontend/src/components/layout/Sidebar.tsx` to add Quotes link in EPISODE section
  - Add icon for Quotes (use MessageSquareQuote from lucide-react)
  - Position after Clips navigation item
  - Link to `/episodes/${episodeId}/quotes`
  - _Requirements: 5.1_

- [x] 15. Create team branding settings UI





  - Update `frontend/src/pages/TeamDetailPage.tsx` to add Branding tab
  - Add color picker inputs for primary, secondary, background, and text colors
  - Add font family dropdown with common web fonts (Inter, Roboto, Open Sans, Lato, Montserrat)
  - Add preview panel showing sample quote graphic with current branding
  - Implement save functionality to update team branding via API
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 16. Create user profile branding settings UI




  - Update `frontend/src/pages/ProfilePage.tsx` to add Personal Branding section
  - Add checkbox "Use team branding" (default checked)
  - Show color pickers and font selector when checkbox unchecked
  - Add preview panel for personal branding
  - Implement save functionality to update user profile branding via API
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 17. Create quote API client functions




  - Create `frontend/src/api/quotes.ts` with API client functions
  - Implement `createQuote`, `listQuotes`, `updateQuote`, `deleteQuote` functions
  - Implement `generateQuoteGraphic` function for manual generation
  - Add TypeScript interfaces for quote data types
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 18. Update clip detector agent prompt





  - Update system prompt in `functions/agents/clip-detector.mjs` to include quote detection instructions
  - Add guidance on identifying memorable, shareable quotes
  - Specify quote selection criteria (relevance, standalone value, theme alignment)
  - Add instructions to use createQuote tool for detected quotes
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 19. Refactor generate-graphic to use EventBridge events






  - Update `functions/quotes/generate-graphic.mjs` to extract data from event detail
  - Remove DynamoDB GetItem calls for quote and episode data
  - Use quote and episode data directly from event.detail
  - Keep branding resolution, canvas generation, and S3 upload logic
  - Update error handling to work with event-driven architecture
  - _Requirements: 3.1, 3.3, 3.4, 3.8_

- [x] 20. Update create-quote to publish EventBridge events





  - Add EventBridge client import to `functions/quotes/create-quote.mjs`
  - Fetch episode metadata after storing quote
  - Publish Generate Quote Graphic event with full quote and episode data
  - Add EventBridge PutEvents permission to function IAM policy
  - Handle EventBridge errors gracefully (log but don't fail request)
  - _Requirements: 4.1_
- [x] 21. Update create-quotes tool to publish EventBridge events




- [ ] 21. Update create-quotes tool to publish EventBridge events


  - Add EventBridge client import to `functions/tools/create-quotes.mjs`
  - Fetch episode metadata once before processing quotes
  - Publish Generate Quote Graphic event for each successfully created quote
  - Add EventBridge PutEvents permission to function IAM policy
  - Handle EventBridge errors gracefully (log but don't fail tool execution)
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_

- [x] 22. Update update-quote to publish EventBridge events





  - Replace Lambda InvokeCommand with EventBridge PutEventsCommand
  - Fetch updated quote and episode data when regeneration needed
  - Publish Generate Quote Graphic event with full data
  - Remove Lambda client import and GENERATE_QUOTE_GRAPHIC_FUNCTION_NAME env var
  - Add EventBridge PutEvents permission to function IAM policy
  - _Requirements: 4.3, 4.6, 4.7_


- [x] 23. Update SAM template for EventBridge integration





  - Add EventBridge rule for Generate Quote Graphic events
  - Configure rule to trigger GenerateQuoteGraphicFunction
  - Add event pattern matching source=nullcheck and detail-type=Generate Quote Graphic
  - Remove API Gateway event from GenerateQuoteGraphicFunction
  - Add EventBridge PutEvents permissions to CreateQuoteFunction, UpdateQuoteFunction, and CreateQuotesToolFunction
  - Remove GENERATE_QUOTE_GRAPHIC_FUNCTION_NAME environment variable from UpdateQuoteFunction
  - _Requirements: 3.1, 4.1, 4.3_


- [x] 24. Remove manual generate endpoint from OpenAPI spec



  - Remove POST /episodes/{episodeId}/quotes/{quoteId}/generate endpoint definition
  - Update API documentation to reflect automatic graphic generation
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

