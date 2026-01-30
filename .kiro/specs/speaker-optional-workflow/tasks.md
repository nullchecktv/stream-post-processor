# Implementation Plan

- [x] 1. Add episode metadata fields for track count and speaker detection









  - Add trackCount, hasSpeakers fields to episode schema
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 1.1 Update episode schema




  - Add trackCount field (ber, default 0)
  - Add hasSpeakers field (boolean, default false)
  - Update EpisodeSchema in schemas/episodes.mjs
  - Ensure backward compatibility with existing episodes
  - _Requirements: 8.1, 8.2_


- [x] 1.2 Create utility function to calculate track count



  - Create calculateTrackCount(episodeId, tenantId) function
  - Query tracks with status "uploaded" or "processed"
  - Return count of valid tracks
  - _Requirements: 8.1_



- [x] 1.3 Create utility function to detect speakers in transcript


  - Create detectSpeakersInTranscript(transcriptContent) function
  - Parse SRT entries and check for speaker attribution pattern
  - Return boolean indicating if speakers are present
  - Extract array of unique speaker names
  - _Requirements: 8.1, 8.2_

- [ ]* 1.4 Write unit tests for metadata utilities
  - Test calculateTrackCount with various track counts
  - Test detectSpeakersInTranscript with speaker-attributed transcripts
  - Test detectSpeakersInTranscript with non-attributed transcripts
  - Test speaker name extraction
  - _Requirements: 8.1, 8.2_

- [x] 2. Update track upload handlers to maintain trackCount





  - Update track upload completion to increment trackCount
  - Update track deletion to decrement trackCount
  - _Requirements: 8.1, 8.4_

- [x] 2.1 Update complete-track-upload handler


  - After successful track upload, calculate trackCount
  - Update episode metadata with new trackCount
  - Log trackCount update
  - _Requirements: 8.1, 8.4_

- [x] 2.2 Update track deletion handler (if exists)


  - After track deletion, recalculate trackCount
  - Update episode metadata with new trackCount
  - Log trackCount update
  - _Requirements: 8.1, 8.4_

- [ ]* 2.3 Write unit tests for track count updates
  - Test trackCount increments on upload
  - Test trackCount decrements on deletion
  - Test trackCount accuracy with multiple operations
  - _Requirements: 8.1, 8.4_

- [x] 3. Update transcript-added handler to detect speakers




  - Detect speaker attribution when transcript is processed
  - Update episode metadata with hasSpeakers and speakers array
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [x] 3.1 Add speaker detection to transcript-added handler

  - After loading transcript, detect speakers
  - Extract speaker names array
  - Update episode metadata with hasSpeakers flag
  - Update episode metadata with speakers array
  - Log speaker detection results
  - _Requirements: 8.1, 8.2, 8.3_

- [ ]* 3.2 Write unit tests for transcript speaker detection
  - Test detection with speaker-attributed transcript
  - Test detection with non-attributed transcript
  - Test speaker name extraction
  - Test metadata updates
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 4. Update clip schema to make speaker field optional





  - Modify clip segment validation to allow null speakers
  - Update createClipTool schema
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 4.1 Update clip segment schema


  - Change speaker field from required to optional in Zod schema
  - Allow null values for speaker field
  - Update schema in schemas/clips.mjs
  - Ensure backward compatibility with existing clips
  - _Requirements: 3.2, 3.3, 3.5_


- [x] 4.2 Update createClipTool validation

  - Update tool schema to accept null speakers
  - Update validation logic in tools/create-clips.mjs
  - Ensure clips with null speakers pass validation
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [ ]* 4.3 Write unit tests for optional speaker validation
  - Test clip creation with speakers
  - Test clip creation with null speakers
  - Test clip creation with mixed segments (some null, some with speakers)
  - Test schema validation passes for all cases
  - _Requirements: 3.2, 3.3, 3.4, 3.5_

- [x] 5. Update clip detector agent to handle optional speakers




  - Modify system prompt to explain speaker attribution is optional
  - Add context about track count and speaker requirements
  - Include speaker guidance in response
  - _Requirements: 3.1, 3.2, 3.3, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 5.1 Update clip detector system prompt


  - Add section explaining speaker attribution is optional
  - Explain single-track vs multi-track scenarios
  - Instruct agent to include speakers when present, omit when not
  - Update prompt in agents/clip-detector.mjs
  - _Requirements: 3.1, 3.2, 10.1, 10.2_

- [x] 5.2 Add episode context to clip detector


  - Load trackCount and hasSpeakers from episode metadata
  - Pass context to agent in user prompt
  - _Requirements: 10.1, 10.2_

- [x] 5.3 Add speaker guidance to clip detector response


  - Generate guidance message based on trackCount and hasSpeakers
  - Include guidance in response object
  - Provide reassurance for single-track episodes
  - Provide suggestions for multi-track episodes without speakers
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

- [ ]* 5.4 Write unit tests for clip detector updates
  - Test prompt generation with single-track context
  - Test prompt generation with multi-track context
  - Test guidance generation for various scenarios
  - Test clip generation with and without speakers
  - _Requirements: 3.1, 3.2, 10.1, 10.2, 10.3, 10.4_

- [x] 6. Update segment extractor with intelligent track selection





  - Implement single-track fast path
  - Implement speaker-based track matching for multi-track
  - Implement fallback strategy for multi-track without speakers
  - Record track selection metadata
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3, 6.4_

- [x] 6.1 Implement track selection logic


  - Create selectTrackForSegment(segment, episodeId, tenantId) function
  - Check track count first
  - If single track: return that track immediately
  - If multi-track with speaker: attempt speaker matching
  - If multi-track without speaker or match fails: use fallback
  - Return track selection with metadata (matchType, confidence, reasoning)
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_



- [x] 6.2 Implement fallback track selection strategy

  - Prefer track named "main" if available
  - Otherwise use first available track
  - Record fallback reason in metadata
  - Add warning message for fallback cases
  - Ensure consistency: same fallback track for all segments in a clip
  - _Requirements: 4.4, 6.1, 6.2, 6.3, 6.4_


- [x] 6.3 Update segment extractor to use new track selection

  - Replace existing track selection with new logic
  - Record track selection metadata in segment results
  - Log track selection decisions
  - Handle errors gracefully
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2_

- [ ]* 6.4 Write unit tests for track selection logic
  - Test single-track selection (always uses only track)
  - Test multi-track with speaker (matches correct track)
  - Test multi-track without speaker (uses fallback)
  - Test fallback consistency across segments
  - Test metadata recording
  - Test error handling
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.2, 6.3_

- [ ]* 6.5 Write property test for single-track determinism
  - **Property 1: Single-track episodes never require speakers**
  - **Validates: Requirements 1.1, 1.2, 1.3**

- [ ]* 6.6 Write property test for track selection method recording
  - **Property 7: Track selection method recording**
  - **Validates: Requirements 4.5, 6.2, 6.4**

- [ ]* 6.7 Write property test for graceful degradation
  - **Property 9: Graceful degradation**
  - **Validates: Requirements 6.1, 6.2**

- [x] 7. Add frontend components for track status display





  - Create TrackStatus component
  - Create TranscriptUploadGuidance component
  - Create ClipQualityIndicator component
  - _Requirements: 1.5, 2.2, 2.3, 2.4, 5.1, 5.2, 5.3, 5.4, 5.5, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 7.1 Create TrackStatus component


  - Display track count
  - Display speaker attribution status
  - Show success indicator for single-track
  - Show success indicator for multi-track with speakers
  - Show warning for multi-track without speakers
  - Include help text and guidance link
  - Create component in frontend/src/components/episodes/
  - _Requirements: 1.5, 5.1, 5.2, 5.3_


- [x] 7.2 Create TranscriptUploadGuidance component

  - Show contextual guidance based on track count
  - For single-track: explain speakers are optional
  - For multi-track: explain speakers are recommended
  - Include expandable example of speaker attribution format
  - Create component in frontend/src/components/episodes/
  - _Requirements: 2.2, 2.3, 2.4, 9.1, 9.2, 9.3, 9.4_

- [x] 7.3 Create ClipQualityIndicator component


  - Show quality indicator for each clip
  - No indicator for single-track episodes
  - Success indicator for multi-track with optimal selection
  - Warning indicator for fallback selection
  - Include tooltip with explanation
  - Create component in frontend/src/components/clips/
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 7.4 Create SpeakerGuidanceModal component


  - Display detailed guide on adding speaker attribution
  - Show SRT format examples
  - Explain benefits for multi-track episodes
  - Include dismissible flag
  - Create component in frontend/src/components/common/
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 8. Integrate track status components into episode pages





  - Add TrackStatus to episode overview page
  - Add TranscriptUploadGuidance to transcript upload flow
  - Add ClipQualityIndicator to clip list
  - _Requirements: 1.5, 2.2, 2.3, 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 8.1 Update episode overview page


  - Add TrackStatus component to episode header
  - Display track count and speaker status prominently
  - Update EpisodeOverviewPage.tsx
  - _Requirements: 1.5, 5.1, 5.2_

- [x] 8.2 Update transcript upload page


  - Add TranscriptUploadGuidance component
  - Show guidance before upload
  - Update TranscriptUploadPage.tsx or equivalent
  - _Requirements: 2.2, 2.3, 2.4_


- [x] 8.3 Update clip list page

  - Add ClipQualityIndicator to each clip card
  - Show quality status for multi-track episodes
  - Update ClipListPage.tsx or equivalent
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Implement transcript re-upload with speaker updates




  - Detect when transcript is re-uploaded
  - Compare speaker attribution with previous version
  - Trigger clip re-processing if speakers added
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 9.1 Update transcript-added handler for re-uploads


  - Detect if transcript already exists for episode
  - Compare hasSpeakers flag with new transcript
  - If speakers added: set flag to trigger re-processing
  - Update episode metadata
  - _Requirements: 7.1, 7.2, 7.3_

- [x] 9.2 Create clip re-processing trigger


  - When speakers are added, trigger clip re-processing
  - Re-run segment extraction with new speaker information
  - Update track selections for all segments
  - Maintain clip IDs and other metadata
  - _Requirements: 7.3, 7.4_

- [x] 9.3 Add notification for clip updates


  - Send notification when clips are re-processed
  - Explain that track selections have been improved
  - Include link to updated clips
  - _Requirements: 7.5_

- [ ]* 9.4 Write unit tests for re-upload workflow
  - Test detection of re-upload
  - Test speaker comparison logic
  - Test re-processing trigger
  - Test notification sending
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ]* 9.5 Write property test for re-processing with updated speakers
  - **Property 10: Re-processing with updated speakers**
  - **Validates: Requirements 7.3, 7.4, 7.5**

- [ ] 10. Add monitoring and logging for track selection
  - Add CloudWatch metrics for track selection patterns
  - Add logging for fallback cases
  - Create dashboard for monitoring
  - _Requirements: 6.2, 6.4_

- [ ] 10.1 Add CloudWatch metrics
  - Metric: SingleTrackEpisodes
  - Metric: MultiTrackEpisodes
  - Metric: EpisodesWithSpeakers
  - Metric: EpisodesWithoutSpeakers
  - Metric: FallbackTrackSelections
  - Metric: SpeakerMatchSuccessRate
  - Add metrics to segment-extractor.mjs
  - _Requirements: 6.2, 6.4_

- [ ] 10.2 Add structured logging
  - Log track selection decisions with context
  - Log fallback cases with warnings
  - Include episodeId, trackCount, speaker, matchType
  - Update segment-extractor.mjs and clip-detector.mjs
  - _Requirements: 6.2, 6.4_

- [ ] 10.3 Create CloudWatch dashboard
  - Dashboard showing track selection metrics
  - Graphs for fallback rate over time
  - Alarms for high fallback rates
  - Create dashboard definition in infrastructure
  - _Requirements: 6.2, 6.4_

- [ ] 11. Update documentation
  - Update user documentation about speaker attribution
  - Update API documentation for new fields
  - Create migration guide for existing users
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11.1 Update user documentation
  - Explain when speakers are needed
  - Provide examples of speaker attribution
  - Explain single-track vs multi-track scenarios
  - Update docs/user-guide.md or equivalent
  - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [ ] 11.2 Update API documentation
  - Document new episode metadata fields (trackCount, hasSpeakers)
  - Document nullable speaker field in clip segments
  - Document track selection metadata
  - Update openapi.yaml
  - _Requirements: 8.1, 8.2, 3.2_

- [ ] 11.3 Create migration guide
  - Explain changes for existing users
  - Provide backfill script for existing episodes
  - Explain backward compatibility
  - Create docs/migration-speaker-optional.md
  - _Requirements: 8.1, 8.2_

- [ ] 12. Integration testing
  - Test complete workflows end-to-end
  - _Requirements: All_

- [ ] 12.1 Test single-track workflow
  - Upload single track
  - Upload transcript without speakers
  - Verify clip generation succeeds
  - Verify all segments use single track
  - Verify no warnings displayed
  - Verify UI shows "speaker attribution optional"
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 12.2 Test multi-track with speakers workflow
  - Upload multiple tracks with speaker assignments
  - Upload transcript with speaker attribution
  - Verify clip generation succeeds
  - Verify segments match to correct tracks
  - Verify UI shows success indicators
  - Verify optimal quality indicators on clips
  - _Requirements: 2.1, 4.1, 5.1, 5.2, 5.3, 5.4_

- [ ] 12.3 Test multi-track without speakers workflow
  - Upload multiple tracks
  - Upload transcript without speakers
  - Verify warning is displayed
  - Verify clip generation succeeds with fallback
  - Verify fallback track selection is used
  - Verify warning indicators on clips
  - Verify guidance is provided
  - _Requirements: 2.2, 2.3, 2.4, 2.5, 4.3, 4.4, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3_

- [ ] 12.4 Test re-upload with speakers workflow
  - Upload transcript without speakers
  - Generate clips
  - Re-upload same transcript with speakers added
  - Verify clips are re-processed
  - Verify track selections updated
  - Verify quality indicators updated
  - Verify notification sent
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [ ] 12.5 Test speaker guidance workflow
  - View episode with multiple tracks
  - See speaker guidance
  - Click "Learn how to add speakers"
  - View detailed guide
  - Dismiss guide (stored in localStorage)
  - Verify guide doesn't show again
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

