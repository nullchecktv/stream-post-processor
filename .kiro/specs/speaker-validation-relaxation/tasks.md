# Implementation Plan

- [x] 1. Remove speaker validation from clip creation tool





  - Remove `validateSpeakers` import from `functions/tools/create-clips.mjs`
  - Remove speaker validation logic (lines 74-106)
  - Remove speaker normalization mapping
  - Keep clip creation logic unchanged
  - Test that clips are created with any speaker names
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Remove speaker validation from quote creation tool





  - Remove `validateSpeakers` import from `functions/tools/create-quotes.mjs`
  - Remove speaker validation logic
  - Remove speaker normalization mapping
  - Keep quote creation logic unchanged
  - Test that quotes are created with any speaker names
  - _Requirements: 4.1, 4.2_

- [x] 3. Remove speaker validation from create-quote API endpoint





  - Remove `validateSpeakers` and `formatSpeakerValidationError` imports from `functions/quotes/create-quote.mjs`
  - Remove validation logic (lines 33-38)
  - Keep quote creation logic unchanged
  - Test API accepts any speaker name
  - _Requirements: 5.2_

- [x] 4. Remove speaker validation from update-quote API endpoint





  - Remove `validateSpeakers` and `formatSpeakerValidationError` imports from `functions/quotes/update-quote.mjs`
  - Remove validation logic (lines 51-56)
  - Keep quote update logic unchanged
  - Test API accepts any speaker name
  - _Requirements: 5.1_

- [x] 5. Remove speaker validation from create-track-upload API endpoint




  - Remove `validateSpeakers` and `formatSpeakerValidationError` imports from `functions/episodes/create-track-upload.mjs`
  - Remove validation logic (lines 37-42)
  - Keep track creation logic unchanged
  - Test API accepts any speaker names
  - _Requirements: 5.4_

- [x] 6. Remove speaker validation from update-track API endpoint





  - Remove `validateSpeakers` and `formatSpeakerValidationError` imports from `functions/episodes/update-track.mjs`
  - Remove validation logic (lines 38-43)
  - Keep track update logic unchanged
  - Test API accepts any speaker names
  - _Requirements: 5.3_

- [x] 7. Implement getEpisodeTracks utility function




  - Add `getEpisodeTracks` function to `functions/utils/track-selection.mjs`
  - Query DynamoDB for all tracks in an episode
  - Filter for processed tracks only
  - Return array of track objects with trackName, speaker, and status
  - Handle empty results gracefully
  - _Requirements: 2.1_

- [x] 8. Implement matchSpeakerToTrack utility function




  - Add `matchSpeakerToTrack` function to `functions/utils/track-selection.mjs`
  - Use Bedrock Converse API with amazon.nova-lite-v1:0 model
  - Implement system prompt for speaker matching
  - Parse JSON response with match result
  - Handle LLM errors gracefully
  - Return match object with confidence score
  - _Requirements: 2.2, 2.3_

- [x] 9. Implement selectTrackForSegment utility function





  - Add `selectTrackForSegment` function to `functions/utils/track-selection.mjs`
  - Implement exact match logic (case-insensitive)
  - Implement LLM fuzzy matching with confidence threshold
  - Implement fallback to 'main' track
  - Add comprehensive logging for all match types
  - Return track selection object with metadata
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3_

- [x] 10. Update segment extractor to use intelligent track selection




  - Import `selectTrackForSegment` in `functions/video/segment-extractor.mjs`
  - Replace simple track selection logic (lines 82-93) with new function
  - Pass segment, episodeId, and tenantId to selection function
  - Use returned trackName for video processing
  - Log track selection results
  - Handle selection errors gracefully
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4_

- [x] 11. Add track selection metadata to Step Functions workflow





  - Update clip-stitcher to collect track selection metadata from segments
  - Add trackSelections array to workflow output
  - Include original speaker, selected track, match type, and confidence
  - Log summary of track selections
  - _Requirements: 3.5_

- [x] 12. Update speaker utility module documentation



  - Add comments explaining that validateSpeakers is preserved for optional use
  - Document the new track selection functions
  - Add usage examples for selectTrackForSegment
  - Document fallback behavior and error handling
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Checkpoint - Ensure all tests pass



  - Ensure all tests pass, ask the user if questions arise.
