# Implementation Plan

- [x] 1. Create transcript cleaning utilities





  - Create utility functions for parsing and cleaning SRT transcripts
  - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 8.1, 8.2, 8.3_

- [x] 1.1 Implement SRT parsing function


  - Create `parseSrtFile(content)` that splits SRT into entries
  - Parse sequence number, timestamps, and text from each entry
  - Handle entries separated by blank lines
  - Return array of parsed entries
  - _Requirements: 1.2_

- [x] 1.2 Write property test for SRT parsing


  - **Property 1: SRT parsing preserves all dialogue**
  - **Validates:ments 1.2**

- [x] 1.3 Implement speaker detection function

  - Create `detectSpeaker(text)` that identifies "Name: dialogue" pattern
  - Extract speaker name and separate from dialogue text
  - Return object with speaker and dialogue fields
  - Handle cases with no speaker attribution
  - _Requirements: 1.3, 1.4, 8.1, 8.2, 8.3_

- [x] 1.4 Write property test for speaker detection

  - **Property 2: Speaker detection and extraction**
  - **Validates: Requirements 1.3, 8.1, 8.2**

- [x] 1.5 Write property test for non-attributed content

  - **Property 3: Non-attributed content handling**
  - **Validates: Requirements 1.4, 8.3, 8.5**

- [x] 1.6 Implement filler word removal function

  - Create `removeFillerWords(text)` with predefined filler word list
  - Remove common filler words while preserving sentence structure
  - Handle capitalization when filler word is at sentence start
  - Remove consecutive filler words
  - Preserve filler words in meaningful phrases
  - _Requirements: 1.6, 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 1.7 Write property test for filler word removal

  - **Property 5: Filler word removal preserves sentence structure**
  - **Validates: Requirements 1.6, 7.2, 7.3, 7.4**

- [x] 1.8 Implement whitespace normalization function

  - Create `normalizeWhitespace(text)` that reduces excessive whitespace
  - Replace multiple spaces with single space
  - Remove leading/trailing whitespace
  - Normalize line breaks to single newlines
  - _Requirements: 1.7_

- [x] 1.9 Write property test for whitespace normalization

  - **Property 6: Whitespace normalization reduces size**
  - **Validates: Requirements 1.7**

- [x] 1.10 Implement cleaned transcript formatter

  - Create `formatCleanedTranscript(entries)` that creates markdown output
  - Format with speakers: "Speaker: dialogue text"
  - Format without speakers: plain dialogue with paragraph breaks
  - Ensure no timestamp notation remains in output
  - _Requirements: 1.5, 8.4, 8.5_

- [x] 1.11 Write property test for timestamp removal

  - **Property 4: Timestamp removal is complete**
  - **Validates: Requirements 1.5**

- [x] 1.12 Write property test for speaker-attributed formatting

  - **Property 11: Speaker-attributed output formatting**
  - **Validates: Requirements 8.4**

- [x] 2. Enhance transcript-added handler





  - Update existing handler to create cleaned transcripts
  - _Requirements: 1.1, 2.1, 2.2, 2.3, 2.4, 6.1, 6.2, 6.3, 6.4_

- [x] 2.1 Add cleaned transcript creation to handler


  - Import transcript cleaning utilities
  - After loading SRT file, create cleaned version
  - Handle parsing errors gracefully (skip invalid entries)
  - Log parsing statistics (entries processed, skipped)
  - Continue with existing metadata update even if cleaning fails
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 2.2 Add S3 upload for transcript.md

  - Construct .md file path from .srt path (same directory, different extension)
  - Upload cleaned transcript to S3 as transcript.md
  - Handle S3 upload errors without blocking metadata update
  - Log upload success/failure
  - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 2.3 Write property test for S3 path preservation


  - **Property 7: S3 path structure is preserved**
  - **Validates: Requirements 2.2**

- [x] 2.4 Add error handling for cleaning failures

  - Wrap cleaning logic in try-catch
  - Log errors with full context
  - Allow original transcript-added processing to continue
  - Ensure agents can still run with .srt file if .md creation fails
  - _Requirements: 2.4, 6.3, 6.4_

- [x] 2.5 Write unit tests for enhanced handler


  - Test SRT parsing with valid entries
  - Test speaker detection with various formats
  - Test handling of malformed entries
  - Test S3 upload of transcript.md
  - Test existing metadata update still works
  - Test error handling when .md upload fails
  - _Requirements: 1.1, 2.1, 2.2, 2.4, 6.1, 6.2, 6.3_

- [x] 3. Update SAM template for new IAM permissions




  - Add S3 PutObject permission to transcript-added handler
  - _Requirements: 2.1_

- [x] 3.1 Add S3 PutObject permission

  - Update TranscriptAddedHandler IAM policies
  - Add `s3:PutObject` permission for transcript bucket
  - Verify existing permissions remain unchanged
  - _Requirements: 2.1_

- [x] 4. Update agent event triggers









  - Change quote and blog agents to trigger on transcript.md events
  - _Requirements: 3.1, 4.1_

- [x] 4.1 Update quote detector event trigger




  - Change EventBridge rule pattern to trigger on transcript.md suffix
  - Update rule name to TranscriptCleaned
  - Verify agent loads transcript from event key
  - _Requirements: 3.1, 3.2_

- [x] 4.2 Update blog outline agent event trigger




  - Change EventBridge rule pattern to trigger on transcript.md suffix
  - Update rule name to TranscriptCleaned
  - Verify agent loads transcript from event key
  - _Requirements: 4.1, 4.2_

- [x] 4.3 Write property test for event choreography




  - **Property 8: Event-driven choreography ensures correct triggering**
  - **Validates: Requirements 3.1, 4.1**

- [x] 4.4 Write property test for output consistency



  - **Property 9: Output format consistency across agents**
  - **Validates: Requirements 3.4, 4.4**

- [x] 5. Verify clip detector remains unchanged




  - Ensure clip detector still triggers on .srt events
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 5.1 Verify clip detector event trigger


  - Confirm EventBridge rule still triggers on .srt suffix
  - Verify agent loads .srt file from event key
  - Ensure no changes to existing logic
  - _Requirements: 5.1_

- [x] 5.2 Write property test for clip detector timestamp accuracy


  - **Property 10: Clip detector timestamp accuracy**
  - **Validates: Requirements 5.2, 5.3**

- [x] 5.3 Write unit tests for clip detector


  - Test clip detector still triggered by .srt event
  - Test timestamp extraction accuracy
  - Test output format unchanged
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [ ] 6. Integration testing
  - Test end-to-end flow with real SRT files
  - _Requirements: All_

- [ ] 6.1 Test with speaker-attributed SRT
  - Upload SRT file with speaker names
  - Verify transcript.md created with speakers
  - Verify quote and blog agents triggered
  - Verify clip detector triggered
  - Verify all agents produce correct output
  - _Requirements: 1.3, 3.1, 4.1, 5.1_

- [ ] 6.2 Test with non-attributed SRT
  - Upload SRT file without speaker names
  - Verify transcript.md created without speakers
  - Verify quote and blog agents triggered
  - Verify clip detector triggered
  - Verify all agents produce correct output
  - _Requirements: 1.4, 3.1, 4.1, 5.1_

- [ ] 6.3 Test with malformed SRT
  - Upload SRT file with some invalid entries
  - Verify handler skips invalid entries
  - Verify transcript.md created with valid entries
  - Verify agents still triggered and process successfully
  - _Requirements: 6.1, 6.2, 6.3_

- [ ] 6.4 Test error scenarios
  - Test S3 upload failure for transcript.md
  - Verify metadata update still succeeds
  - Verify error is logged
  - Verify system continues functioning
  - _Requirements: 2.4, 6.3, 6.4_

- [ ] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

