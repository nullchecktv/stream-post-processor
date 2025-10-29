# Implementation Plan

- [ ] 1. Enhance track creation with speaker support






  - Modify create-track-upload function to accept optional speakers array
  - Add Zoidation for speakers field in request body
  - Update DynamoDB track record creation to include speakers field
  - _Requirements: 1.1, 1.3, 1.4, 1.5_

- [x] 1.1 Update track creation request validation


  - Add speakers array to existing Zod schema in create-track-upload.mjs
  - Implement speaker name validation (non-empty strings, trimmed)
  - Ensure backward compatibility with existing requests
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 1.2 Modify track record creation in DynamoDB


  - Update PutItemCommand in complete-track-upload.mjs to include speakers field
  - Set default empty array for speakers when not provided
  - Ensure speakers field is properly marshalled for DynamoDB storage
  - _Requirements: 1.3, 1.5_

- [x] 1.3 Update OpenAPI specification for track creation


  - Add speakers array to track creation request schema in openapi.yaml
  - Document speaker validation requirements and examples
  - Ensure API Gateway validation includes new field
  - _Requirements: 1.1, 1.4_

- [x] 2. Implement track update endpoint





  - Create new PUT endpoint for updating track metadata including speakers
  - Add route configuration in SAM template and OpenAPI specification
  - Implement validation and error handling for track updates
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.1 Create update-track Lambda function


  - Write new function at functions/episodes/update-track.mjs
  - Implement track existence validation and speaker array updates
  - Add proper error handling for missing tracks and invalid input
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 2.2 Add DynamoDB update operations


  - Implement UpdateItemCommand to modify speakers field in track records
  - Add conditional expression to ensure track exists before update
  - Handle speakers array replacement and empty array scenarios
  - _Requirements: 2.2, 2.4, 2.5_

- [x] 2.3 Configure API Gateway route for track updates


  - Add PUT /episodes/{episodeId}/tracks/{trackName} route to template.yaml
  - Configure Lambda integration and CORS headers
  - Add route to OpenAPI specification with request/response schemas
  - _Requirements: 2.1, 2.3_

- [x] 3. Enhance clip creation tool with speaker requirements





  - Update segment schema to require speaker field and remove text property
  - Make startTime and endTime required fields for all segments
  - Modify validation logic to enforce new segment requirements
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_



- [x] 3.1 Update segment validation schema





  - Modify segmentSchema in create-clips.mjs to require speaker field
  - Remove text property and its validation logic
  - Make startTime and endTime required without fallback options


  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 Update clip creation logic





  - Remove text-based segment processing code


  - Ensure speaker information is stored in clip records
  - Update segment validation to enforce time and speaker requirements
  - _Requirements: 3.2, 3.4, 3.5_

- [x] 3.3 Update clip data model storage





  - Modify DynamoDB PutItemCommand to include speaker data in segments
  - Ensure clip records properly store enhanced segment information
  - Update clip hash calculation to include speaker data
  - _Requirements: 3.5_

- [x] 4. Implement track selection algorithm





  - Create utility function to match speakers with available tracks
  - Add track querying logic for episode-based track lookup
  - Implement speaker matching and fallback behavior
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4.1 Create track selection utility function


  - Write new utility at functions/utils/track-selection.mjs
  - Implement track querying using DynamoDB with sort key prefix
  - Add speaker matching logic with first-match selection
  - _Requirements: 4.1, 4.2, 4.4_

- [x] 4.2 Add track caching for performance


  - Implement episode-level track caching during clip processing
  - Cache track list to avoid repeated DynamoDB queries
  - Add cache invalidation and memory management
  - _Requirements: 4.1, 4.5_

- [x] 4.3 Implement error handling and logging


  - Add comprehensive logging for speaker matching results
  - Log warnings when no tracks match required speakers
  - Handle cases where no tracks exist for an episode
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5. Integrate track selection with video processing





  - Update clip processing workflow to use speaker-based track selection
  - Modify segment extraction to work with selected tracks
  - Add graceful handling when speaker matching fails
  - _Requirements: 4.3, 4.4, 4.5, 5.5_

- [x] 5.1 Update create-clips tool integration


  - Modify clip processing to call track selection algorithm
  - Add track selection results to clip processing context
  - Handle scenarios where speaker matching fails gracefully
  - _Requirements: 4.3, 4.4, 5.5_

- [x] 5.2 Enhance segment extractor with track selection


  - Update segment-extractor.mjs to accept track selection input
  - Modify video processing to use speaker-matched tracks
  - Add error handling for missing or invalid track selections
  - _Requirements: 4.4, 5.5_

- [x] 5.3 Update video processing pipeline integration


  - Modify existing video processing workflow to use track selection
  - Ensure backward compatibility with existing clip processing
  - Add logging for track selection decisions in processing pipeline
  - _Requirements: 4.5, 5.4, 5.5_

- [x] 6. Add comprehensive testing and validation





  - Write unit tests for all new functions and enhanced functionality
  - Create integration tests for complete track-speaker workflow
  - Add API endpoint testing for track creation and updates
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 6.1 Write unit tests for track management


  - Test track creation with speakers array validation
  - Test track update functionality and error scenarios
  - Test speaker name validation and normalization
  - _Requirements: 1.4, 1.5, 2.3, 2.4_

- [x] 6.2 Write unit tests for clip creation enhancements


  - Test enhanced segment validation with required speaker field
  - Test removal of text property support and time requirements
  - Test clip creation with speaker data storage
  - _Requirements: 3.1, 3.2, 3.4, 3.5_

- [x] 6.3 Write unit tests for track selection algorithm


  - Test speaker matching with single and multiple tracks
  - Test fallback behavior when no matching tracks found
  - Test error handling for malformed track data
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 6.4 Write integration tests for complete workflow


  - Test end-to-end track creation and update with speakers
  - Test complete clip processing with speaker-track matching
  - Test API endpoints with various request scenarios
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 7. Update documentation and deployment configuration





  - Update OpenAPI specification with all new endpoints and schemas
  - Add new Lambda functions to SAM template configuration
  - Update environment variables and IAM permissions as needed
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_

- [x] 7.1 Complete OpenAPI specification updates


  - Add track update endpoint documentation
  - Update track creation schema with speakers field
  - Document all new request/response formats and error codes
  - _Requirements: 1.1, 2.1_



- [x] 7.2 Update SAM template configuration






  - Add UpdateTrackFunction to Lambda functions section
  - Configure API Gateway routes for new track update endpoint
  - Add necessary IAM permissions for DynamoDB track operations


  - _Requirements: 2.1, 2.3_

- [ ] 7.3 Update environment configuration




  - Ensure all functions have access to required environment variables
  - Add any new configuration parameters for track selection
  - Update deployment scripts and configuration files
  - _Requirements: 4.1, 5.1_
