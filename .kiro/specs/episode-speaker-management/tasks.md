# Implementation Plan

- [ ] 1. Add speakers array to episode schema and API




  - Update episode schema to include speakers array field
  - Modify episode creation and update endpoints to handle speakers
  - Add validation for speaker names and deduplication logic
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.1 Update episode schema with speakers field


  - Add speakers array to EpisodeCreateSchema in schemas/episodes.mjs
  - Add validation for speaker names (non-empty strings, max length 100)
  - Ensure speakers field is optional with empty array default
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 1.2 Enhance episode creation handler


  - Modify functions/episodes/create-episode.mjs to accept speakers array
  - Add speaker normalization logic (trim whitespace, deduplicate)
  - Store speakers array in episode DynamoDB record
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 1.3 Enhance episode update handler


  - Modify functions/episodes/update-episode.mjs to handle speakers updates
  - Add speakerlidation and normalization for updates
  - Preserve other episode properties during speaker updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 1.4 Update OpenAPI specification for episodes


  - Add speakers array to episode request/response schemas in openapi.yaml
  - Document speaker validation rules and examples
  - Update episode endpoints documentation
  - _Requirements: 1.1, 2.1_


- [x] 2. Create speaker utilities

  - Implement single utility file with all speaker functions
  - Add validation, extraction, and matching in one place
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 2.1 Create speaker utilities file

  - Write functions/utils/speakers.mjs with validateSpeakers and extractAndMatchSpeakers functions
  - Implement case-insensitive speaker matching and normalization
  - Use LLM to extract speakers from transcript and match to episode speakers in one call
  - Return consistent error formats for validation failures
  - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.2, 4.5, 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 3. Add speaker validation to track management



  - Integrate speaker validation into track creation endpoint
  - Add validation to track update endpoint
  - Return detailed error messages for invalid speakers
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 4.1, 4.2, 4.3, 4.4, 4.5_



- [x] 3.1 Enhance track creation with validation





  - Modify functions/episodes/create-track-upload.mjs to validate speakers


  - Call validateSpeakers before creating track record
  - Return 400 error with invalid speakers if validation fails
  - Use normalized speakers from validation result
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 3.2 Enhance track update with validation


  - Modify functions/episodes/update-track.mjs to validate speakers
  - Call validateSpeakers before updating track record
  - Return detailed error for invalid speakers
  - Preserve other track metadata during speaker updates
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_



- [ ] 4. Integrate speaker analysis with transcript upload

  - Enhance transcript upload endpoint to extract and match speakers using single utility
  - Return speaker analysis in upload response
  - Provide suggestions for unmatched speakers
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 4.1 Enhance transcript upload handler
  - Modify functions/episodes/upload-transcript.mjs to call extractAndMatchSpeakers from speakers.mjs
  - Include speakerAnalysis in response with speakers, matches, and unmatched
  - Add suggestion message for unmatched speakers
  - _Requirements: 5.1, 5.2, 5.3, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [ ] 4.2 Update transcript upload response schema
  - Add speakerAnalysis field to response in openapi.yaml
  - Document speakers, matched, and unmatched structures
  - Include confidence scores in response documentation
  - _Requirements: 5.3, 6.3, 7.1, 7.4_



- [ ] 5. Add speaker validation to clip segment creation

  - Validate segment speakers against episode list in clip creation tool
  - Normalize speaker names in segments
  - Return detailed errors for invalid speakers
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5.1 Enhance clip creation tool validation
  - Modify functions/tools/create-clips.mjs to validate all segment speakers
  - Call validateSpeakers from speakers.mjs with unique speakers from all segments
  - Return error with invalid speakers if validation fails
  - Normalize speaker names in segments using validation result
  - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

- [ ] 5.2 Update segment schema documentation
  - Document speaker validation requirement in tool description
  - Add examples of valid and invalid speaker references
  - Update error response documentation
  - _Requirements: 8.1, 8.2_

- [ ] 6. Add speaker validation to quote creation

  - Validate quote speaker against episode list
  - Normalize speaker name in quote record
  - Handle optional speaker attribution
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6.1 Enhance quote creation endpoint validation
  - Modify functions/quotes/create-quote.mjs to validate speaker
  - Call validateSpeakers from speakers.mjs if speaker is provided
  - Return error with invalid speaker if validation fails
  - Use normalized speaker name in quote record
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 6.2 Enhance quote creation tool validation
  - Modify functions/tools/create-quotes.mjs to validate speakers
  - Add validation for all quotes in batch creation
  - Normalize speaker names before storing quotes
  - _Requirements: 9.1, 9.2, 9.3, 9.5_

- [ ] 6.3 Update quote update endpoint validation
  - Modify functions/quotes/update-quote.mjs to validate speaker changes
  - Call validateSpeakers when speaker is updated
  - Allow removing speaker attribution (set to null)
  - _Requirements: 9.1, 9.2, 9.4, 9.5_

- [ ] 7. Update SAM template and permissions

  - Add IAM permissions for Bedrock Nova Lite invocations
  - Update environment variables for speaker matching
  - Configure Lambda function settings for new utilities
  - _Requirements: 6.1, 6.2_

- [ ] 7.1 Add Bedrock permissions to IAM policies
  - Add bedrock:InvokeModel permission for Nova Lite to relevant functions
  - Scope permissions to amazon.nova-lite-v1:0 model
  - Add permissions to transcript upload function
  - _Requirements: 6.1_

- [ ] 7.2 Update environment variables
  - Add SPEAKER_MATCHING_MODEL_ID environment variable
  - Set default to amazon.nova-lite-v1:0
  - Ensure transcript upload function has access to model ID
  - _Requirements: 6.1, 6.2_

- [x] 8. Add comprehensive testing






  - Write unit tests for speaker utilities
  - Write integration tests for enhanced endpoints
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1, 6.1, 8.1, 9.1_

- [ ]* 8.1 Write unit tests for episode speaker management
  - Test episode creation with speakers array
  - Test episode update with speaker modifications
  - Test speaker deduplication and normalization
  - Test empty speakers array handling
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ]* 8.2 Write unit tests for speaker utilities
  - Test validateSpeakers with valid and invalid speakers
  - Test case-insensitive matching and normalization
  - Test extractAndMatchSpeakers with various transcript formats
  - Test confidence scoring and unmatched speaker identification
  - Test error handling for S3 and Bedrock failures
  - _Requirements: 3.1, 3.2, 3.5, 4.1, 4.2, 4.5, 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.4, 7.5, 10.1, 10.2, 10.5_

- [ ]* 8.3 Write unit tests for handler functions
  - Test track creation handler with speaker validation logic
  - Test track update handler with speaker validation
  - Test transcript upload handler with speaker analysis
  - Test clip creation tool with segment speaker validation
  - Test quote creation/update handlers with speaker validation
  - Mock speaker utility functions and verify correct calls
  - _Requirements: 3.1, 3.2, 4.1, 5.1, 6.1, 8.1, 9.1_

- [ ]* 8.4 Write integration tests for enhanced endpoints
  - Test track creation API with speaker validation
  - Test transcript upload API with speaker analysis response
  - Test clip creation with segment speaker validation
  - Test quote creation with speaker validation
  - Test end-to-end episode speaker workflow
  - _Requirements: 3.1, 4.1, 5.1, 6.1, 8.1, 9.1_

- [x] 9. Update frontend components

  - Add speaker management UI to episode creation/edit forms
  - Display speaker validation errors in track upload
  - Show speaker matching results in transcript upload
  - Add speaker selection dropdowns for tracks and quotes
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 7.1, 9.1_

- [x] 9.1 Create episode speaker management component

  ✅ COMPLETED
  - Built speaker management directly into EpisodeHeader component
  - Added to episode edit form with tag-based UI
  - Implemented speaker input with Enter key to add
  - Shows speaker list with remove buttons (× icon)
  - Includes validation for max 20 speakers and 100 char limit
  - Displays speakers in read-only view with blue badges
  - _Requirements: 1.1, 2.1_

- [x] 9.2 Enhance track upload with speaker selection

  - Modify TrackUploader component to fetch episode speakers
  - Add multi-select dropdown for speaker selection
  - Display validation errors for invalid speakers
  - Show episode speakers as available options
  - _Requirements: 3.1, 3.2_

- [x] 9.3 Display speaker matching results

  - Show speaker analysis after transcript upload
  - Display matched speakers with confidence levels
  - Show unmatched speakers with suggestion to add to episode
  - Add button to quickly add unmatched speakers to episode
  - _Requirements: 6.1, 7.1, 7.3_

- [x] 9.4 Add speaker selection to quote forms

  - Modify quote creation/edit forms to include speaker dropdown
  - Fetch episode speakers for selection
  - Allow optional speaker attribution
  - Display validation errors for invalid speakers
  - _Requirements: 9.1, 9.2, 9.4_

- [x] 10. Update API client and TypeScript types

  - Add speakers field to episode types
  - Update API client methods for speaker validation
  - Add types for speaker matching responses
  - Update error handling for speaker validation failures
  - _Requirements: 1.1, 2.1, 3.1, 6.1_

- [x] 10.1 Update TypeScript types for episodes

  - Add speakers array to Episode interface in frontend types
  - Update EpisodeCreate and EpisodeUpdate types
  - Add SpeakerValidationError type
  - Add SpeakerMatchResult type
  - _Requirements: 1.1, 2.1, 6.1_

- [x] 10.2 Update API client methods

  - Modify episode creation/update methods to handle speakers
  - Add error handling for speaker validation failures
  - Parse and return speaker matching results from transcript upload
  - Update track and quote creation methods with speaker validation
  - _Requirements: 1.1, 2.1, 3.1, 6.1, 8.1, 9.1_

