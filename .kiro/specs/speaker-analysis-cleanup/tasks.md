# Implementation Plan

- [x] 1. Remove speakerAnalysis from backend




- [x] 1.1 Simplify transcript-added.mjs handler


  - Remove speakerAnalysis variable and logic
  - Remove matchSpeakers import and call
  - Remove needsClipReprocessing flag logic
  - Remove EventBridge event publishing
  - Keep extractSpeakersFromTranscript for speaker extraction
  - Update episode record with speakers and hasSpeakers only
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3, 5.1, 5.2_

- [x] 1.2 Remove matchSpeakers from speakers utility


  - Delete matchSpeakers function from functions/utils/speakers.mjs
  - Keep extractSpeakersFromTranscript function
  - _Requirements: 4.2_

- [x] 1.3 Remove speakers-added event handler


  - Delete functions/events/speakers-added.mjs file
  - _Requirements: 5.3_

- [x] 1.4 Update SAM template


  - Remove SpeakersAddedHandler function definition from template.yaml
  - Remove EventBridge rule for SpeakersAdded event
  - _Requirements: 5.4_

- [x] 2. Remove speakerAnalysis from API documentation




- [x] 2.1 Update OpenAPI specification


  - Remove speakerAnalysis from Episode schema in openapi.yaml
  - Remove speakerAnalysis from any response schemas
  - _Requirements: 3.1, 3.2_

- [x] 3. Remove speakerAnalysis from frontend




- [x] 3.1 Delete SpeakerAnalysisDisplay component


  - Delete frontend/src/components/episodes/SpeakerAnalysisDisplay.tsx
  - _Requirements: 2.2_

- [x] 3.2 Update TranscriptUploader component


  - Remove SpeakerAnalysis interface
  - Remove speakerAnalysis state
  - Remove SpeakerAnalysisDisplay import and usage
  - Remove speakerAnalysis extraction from upload response
  - _Requirements: 2.1_

- [x] 3.3 Update API types


  - Remove speakerAnalysis from UploadTranscriptResponse in frontend/src/api/episodes.ts
  - _Requirements: 2.3_

- [x] 3.4 Remove SpeakerDiscrepancyModal component


  - Delete frontend/src/components/episodes/SpeakerDiscrepancyModal.tsx (unused)
  - _Requirements: 2.2_

- [x] 4. Update tests




- [x] 4.1 Update transcript-added tests


  - Verify speaker extraction still works
  - Verify no EventBridge events are published
  - Verify no speakerAnalysis or needsClipReprocessing in episode updates
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 5.1, 5.2_

- [x] 4.2 Remove speakers-added tests


  - Delete tests for speakers-added handler
  - _Requirements: 5.3_

- [x] 4.3 Update integration tests


  - Verify transcript upload updates episode.speakers
  - Verify no events are published
  - Verify clips are not affected by transcript upload
  - _Requirements: 1.2, 5.2_

- [x] 5. Checkpoint - Verify all changes work together





  - Ensure all tests pass, ask the user if questions arise.
