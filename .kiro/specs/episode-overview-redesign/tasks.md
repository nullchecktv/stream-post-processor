# Implementation Plan: Episode Overview Redesign

## Overview

This implementation plan transforms the Episode Overview page from a multi-tab dashboard into a focused "conveyor belt" experience. The implementation follows a state machine approach where each episode state maps to exactly one primary action, providing clear guidance through the episode workflow.

## Tasks

- [ ] 1. Create state machine logic and types
  - Create TypeScript types for EpisodeState and StateConfig
  - Implement determineEpisodeState fu
State Determination from Published Status**
  - **Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

- [ ]* 1.2 Write property tests for state config completeness
  - **Property 6: State Config Completeness**
  - **Property 7: State-to-Action Mapping Correctness**
  - **Property 8: Action Zone Content Completeness**
  - **Validates: Requirements 1.6, 2.1, 2.2-2.6, 2.7, 2.8**

- [ ] 2. Create EpisodeIdentitySection component
  - Create new component file with TypeScript interface
  - Implement episode title display
  - Add platform badges rendering
  - Add status badge display
  - Add last updated timestamp formatting
  - Ensure compact, scannable layout
  - Add data-section attribute for testing
  - _Requirements: 3.2, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ]* 2.1 Write property tests for episode identity section
  - **Property 10: Episode Identity Content**
  - **Property 11: Episode Identity Exclusions**
  - **Property 12: Episode Identity Non-Interactive**
  - **Validates: Requirements 3.2, 3.4, 9.1-9.5**

- [ ] 3. Create PrimaryActionZone component
  - Create new component file with TypeScript interface
  - Implement headline display from state config
  - Implement subtext display from state config
  - Add primary action button with click handler
  - Add optional secondary action button (conditional)
  - Add loading state support
  - Style for visual dominance
  - Add data-section attribute for testing
  - _Requirements: 2.1, 2.7, 2.8, 2.9, 2.10, 6.6_

- [ ]* 3.1 Write property tests for primary action zone
  - **Property 21: Secondary Action Availability**
  - **Validates: Requirements 2.1, 2.7, 2.8, 6.6**

- [ ] 4. Create WorkflowProgressSection component
  - Create new component file with TypeScript interface
  - Define workflow steps array (idle, planned, recorded, processed, published)
  - Implement step rendering with status indicators
  - Add current step highlighting logic
  - Add completed steps styling
  - Add remaining steps styling
  - Ensure no primary action buttons in section
  - Style as visually subordinate to Primary Action Zone
  - Add data-section attribute for testing
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [ ]* 4.1 Write property tests for workflow progress section
  - **Property 13: Workflow Progress Current State Display**
  - **Property 14: Workflow Progress Completeness**
  - **Property 15: Workflow Progress No Primary Actions**
  - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 5. Create CreatedArtifactsSection component
  - Create new component file with TypeScript interface
  - Implement conditional rendering (hide if no artifacts)
  - Add clips grid rendering (conditional on clips.length > 0)
  - Add quotes grid rendering (conditional on quotes.length > 0)
  - Add blog post card rendering (conditional on blog exists)
  - Add view/download links for each artifact
  - Ensure no "Generate" buttons in section
  - Add data-section attribute for testing
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [ ]* 5.1 Write property tests for created artifacts section
  - **Property 16: Artifacts Display Only Existing**
  - **Property 17: Artifacts Section Conditional Rendering**
  - **Property 18: Artifacts No Generate Buttons**
  - **Property 19: Artifacts Access Links**
  - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

- [ ] 6. Implement primary action handlers
  - Create navigation handler for "Generate plan" (navigate to plan page)
  - Create navigation handler for "Upload recording" (navigate to content page)
  - Create async handler for "Generate clips & quotes" (trigger AI generation)
  - Create navigation handler for "Review & publish" (navigate to content page)
  - Create navigation handler for "Start next episode" (navigate to new episode page)
  - Add error handling for each handler
  - Add loading state management
  - Add toast notifications for success/error
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 10.1-10.5_

- [ ]* 6.1 Write property tests for primary action handlers
  - **Property 20: Primary Action Navigation Behavior**
  - **Property 26: Episode Context Preservation**
  - **Validates: Requirements 6.1-6.5, 10.1-10.6**

- [ ] 7. Refactor EpisodeOverviewPage component
  - Remove existing multi-tab layout (Overview/Plan/Content tabs)
  - Remove gray CTA box concept
  - Implement new four-section layout structure
  - Add state determination logic using determineEpisodeState
  - Add state config lookup using STATE_CONFIGS
  - Integrate EpisodeIdentitySection component
  - Integrate PrimaryActionZone component
  - Integrate WorkflowProgressSection component
  - Integrate CreatedArtifactsSection component
  - Ensure sections render in correct order
  - _Requirements: 3.1, 3.5, 3.6, 3.7, 3.8_

- [ ]* 7.1 Write property tests for page structure
  - **Property 9: Page Structure Ordering**
  - **Validates: Requirements 3.1**

- [ ] 8. Implement data fetching and state management
  - Fetch episode data on component mount
  - Fetch plan data for state determination
  - Fetch tracks data for state determination
  - Fetch clips data for state determination and artifacts display
  - Fetch quotes data for state determination and artifacts display
  - Fetch blog data for state determination and artifacts display
  - Add loading states for all data fetching
  - Add error handling for failed requests
  - Implement retry logic for transient failures
  - _Requirements: 8.1_

- [ ] 9. Integrate real-time notifications
  - Subscribe to Momento notifications on component mount
  - Handle episode update notifications
  - Handle clip creation notifications
  - Handle quote creation notifications
  - Handle blog creation notifications
  - Recalculate episode state on notification receipt
  - Update UI when state changes
  - Unsubscribe on component unmount
  - Add fallback to polling if real-time unavailable
  - _Requirements: 8.2, 8.3, 8.4, 8.5_

- [ ]* 9.1 Write property tests for real-time updates
  - **Property 22: State Recalculation on Data Change**
  - **Property 23: Artifacts Section Update on Creation**
  - **Property 24: Progress Section Update on State Change**
  - **Property 25: Real-Time Notification Integration**
  - **Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

- [ ] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 11. Add error handling and edge cases
  - Handle missing episode data (show error state with retry)
  - Handle invalid state transitions (default to idle)
  - Handle navigation failures (show toast, stay on page)
  - Handle content generation failures (show error toast with retry)
  - Handle API request failures (show error toast with retry)
  - Handle notification subscription failures (fall back to polling)
  - Handle token refresh failures (attempt resubscription)
  - Handle stale data detection (refetch automatically)
  - Handle concurrent modifications (show notification, offer reload)
  - _Requirements: Error Handling section_

- [ ]* 11.1 Write unit tests for error handling
  - Test missing episode data error state
  - Test invalid state transition handling
  - Test navigation failure handling
  - Test content generation failure handling
  - Test API request failure handling
  - Test notification subscription failure handling
  - _Requirements: Error Handling section_

- [ ] 12. Style and polish UI
  - Apply Tailwind CSS classes for layout
  - Ensure Primary Action Zone is visually dominant
  - Style Episode Identity section as compact and scannable
  - Style Workflow Progress section as subordinate
  - Style Created Artifacts section for delight
  - Ensure Primary Action Zone is above the fold
  - Add responsive design for mobile, tablet, desktop
  - Add hover states and transitions
  - Ensure accessibility (ARIA labels, keyboard navigation)
  - _Requirements: 2.9, 2.10, 3.3, 4.4_

- [ ] 13. Update routing and navigation
  - Ensure episode plan page route exists
  - Ensure episode content page route exists
  - Ensure new episode creation route exists
  - Update navigation links to preserve episode context
  - Test navigation from all primary actions
  - Verify episode ID is passed correctly in routes
  - _Requirements: 10.6_

- [ ] 14. Final checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
- The state machine logic is the foundation for all other components
- Real-time updates ensure the page stays current without manual refresh
- Error handling ensures graceful degradation when issues occur
