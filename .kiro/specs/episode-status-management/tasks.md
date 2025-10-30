# Implementation Plan

- [x] 1. Create status update Lambda function and API endpoint





  - Create new Lambda function `functions/episodes/update-episode-status.mjs` with status validation logic
  - Add API Gateway endpoint configuration in `template.yaml` for POST `/episodes/{episodeId}/statuses`
  - Implement prerequisite validation to check episode and track statuses
  - Add EventBridge event publishing for "Begin Clip Generation" events
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 2. Update data models to support status history







  - [x] 2.1 Modify episode data model to include statusHistory array





    - Update episode creation logic to initialize statusHistory array
    - Ensure backward compatibility by maintaining status field as computed value

    - _Requirements: 2.1, 2.2, 2.4, 5.4, 5.5_

  - [x] 2.2 Modify clip data model to include statusHistory array





    - Update clip creation and update logic to use statusHistory array
    - Ensure backward compatibility by maintaining status field as computed value
    - _Requirements: 4.1, 4.2, 4.4, 4.5_



  - [x] 2.3 Create utility functions for status history management





    - Write helper functions to add status entries and compute current status
    - Create migration logic for existing episodes/clips with single status field
    - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3_

- [x] 3. Update existing endpoints to return current status





  - [x] 3.1 Update list episodes endpoint to return current status

    - Modify `functions/episodes/list-episodes.mjs` to compute current status from statusHistory
    - Ensure response format remains consistent with existing API contracts
    - _Requirements: 5.1, 5.2, 5.4_


  - [x] 3.2 Update get episode endpoint to return current status





    - Modify episode retrieval logic to compute current status from statusHistory
    - Maintain backward compatibility with existing response format
    - _Requirements: 5.1, 5.4_


  - [x] 3.3 Update clip-related endpoints to return current status






    - Modify clip retrieval and listing logic to compute current status from statusHistory
    - Ensure consistent status representation across all clip endpoints
    - _Requirements: 5.3, 5.4_

- [x] 4. Update OpenAPI specification





  - Add new POST `/episodes/{episodeId}/statuses` endpoint definition
  - Add StatusHistoryEntry and PrerequisiteError schema definitions
  - Update existing episode and clip schemas to document status field behavior
  - _Requirements: 1.1, 1.4, 5.1, 5.2, 5.3_

- [x] 5. Update existing status update logic throughout the system







  - [x] 5.1 Update track upload completion to use status history

    - Modify `functions/episodes/complete-track-upload.mjs` to append to statusHistory
    - Update episode status to "tracks uploaded" when all tracks are uploaded


    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 5.2 Update preprocessing completion to use status history


    - Modify `functions/events/preprocessing-completed.mjs` to append to track statusHistory
    - Update track status to "processed" when MediaConvert job completes
    - _Requirements: 2.1, 2.2, 2.5_

  - [x] 5.3 Update clip detection and processing to use status history

    - Modify `functions/agents/clip-detector.mjs` to use statusHistory for clips
    - Update clip processing functions to append status changes to history
    - _Requirements: 4.1, 4.2, 4.5_

- [ ] 6. Add comprehensive testing
  - [x] 6.1 Write unit tests for status update function





    - Test prerequisite validation logic with various episode/track states
    - Test status history management and current status computation
    - Test error handling for all validation failure scenarios
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2_

  - [ ] 6.2 Write integration tests for status management flow
    - Test end-to-end flow from episode creation through clip generation trigger
    - Test EventBridge event publishing and downstream event handling
    - Test database consistency and status history maintenance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ] 6.3 Write tests for data model migration
    - Test migration of existing episodes/clips from single status to statusHistory
    - Test backward compatibility of API responses
    - Test status computation from statusHistory arrays
    - _Requirements: 2.4, 4.4, 5.4, 5.5_
