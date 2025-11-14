# Implementation Plan

## Overview

This implementation plan breaks down the episode workflow UX redesign into discrete, manageable tasks. The approach follows a phased strategy: build new components first, then integrate them into existing pages, ensuring no breaking changes until the final integration step.

## Task List

- [x] 1. Create workflow state management utilities
- [x] 1.1 Create useWorkflowState hook to compute workflow state from episode data
  - Implement computeWorkflowState function that determines current step and completed steps
  - Implement determineNextAction function that returns appropriate next action
  - Add TypeScript interfaces for WorkflowState and NextAction
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 8.1, 8.2_

- [x] 1.2 Create workflow state utility functions
  - Write getWorkflowStepFromEpisode function
  - Write isStepComplete function for each workflow step
  - Add helper functions for step validation
  - _Requirements: 2.1, 8.1, 8.2_

- [ ] 2. Build WorkflowProgress component
- [ ] 2.1 Create WorkflowProgress component with step visualization
  - Implement horizontal stepper layout for desktop
  - Add step circles with completion states (complete, current, locked)
  - Add connecting lines between steps
  - Implement step labels and status text
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [ ] 2.2 Add responsive mobile layout for WorkflowProgress
  - Implement vertical stepper layout for mobile screens
  - Ensure touch-friendly spacing and sizing
  - Test on various mobile screen sizes
  - _Requirements: 9.1, 9.2, 9.4_

- [ ] 2.3 Add accessibility features to WorkflowProgress
  - Implement ARIA progressbar role and attributes
  - Add keyboard navigation support
  - Add screen reader announcements for step changes
  - Ensure proper focus management
  - _Requirements: 2.1, 2.2, 2.3, 2.4_


- [ ] 3. Build NextActionCard component
- [ ] 3.1 Create NextActionCard component structure
  - Implement card layout with icon, title, description, and button
  - Add different visual states for each action type
  - Implement action button with navigation
  - Style card with prominent visual treatment
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [ ] 3.2 Implement action type variants
  - Create variant for "Generate Plan" action
  - Create variant for "Upload Transcript" action
  - Create variant for "Upload Tracks" action
  - Create variant for "All Set" completion state
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ] 3.3 Add empty state handling
  - Implement empty state for when no action is needed
  - Add loading state while determining next action
  - Add error state if action determination fails
  - _Requirements: 7.1, 7.2, 7.3, 10.1, 10.2_

- [ ] 4. Build content card components
- [ ] 4.1 Create PlanCard component
  - Implement card layout with plan status
  - Add preview of plan objectives
  - Add "View Plan" action button
  - Handle loading and empty states
  - _Requirements: 4.1, 4.4, 7.1_

- [ ] 4.2 Create BlogPostCard component
  - Implement card layout with blog title and excerpt
  - Add status badge (draft/published)
  - Add "View Post" and "Edit" action buttons
  - Handle loading and empty states
  - _Requirements: 4.1, 4.4, 7.4_

- [ ] 4.3 Create ClipsCard component
  - Implement card layout with clip count
  - Add status breakdown (proposed/processed)
  - Add "View Clips" action button
  - Handle loading and empty states
  - _Requirements: 4.1, 4.2, 4.4, 7.4_

- [ ] 4.4 Create QuotesCard component
  - Implement card layout with quote count
  - Add sample quote preview
  - Add "View Quotes" action button
  - Handle loading and empty states
  - _Requirements: 4.1, 4.4, 7.4_


- [ ] 4.5 Create ContentCardsGrid component
  - Implement responsive grid layout for content cards
  - Add skeleton loading states for all cards
  - Handle empty state when no content exists
  - Ensure mobile-responsive stacking
  - _Requirements: 4.1, 4.4, 4.5, 9.3, 10.2_

- [ ] 5. Build Episode Creation Wizard
- [ ] 5.1 Create wizard modal structure and navigation
  - Implement modal container with close functionality
  - Create wizard progress indicator showing current step
  - Implement step navigation (next, back, close)
  - Add form state management across steps
  - _Requirements: 1.1, 1.2, 1.3, 8.3_

- [ ] 5.2 Create BasicInfoStep component
  - Implement form fields for title, episode number, air date, series name
  - Add field validation for required fields
  - Implement error display for validation failures
  - Add auto-save draft functionality
  - _Requirements: 1.1, 1.3, 1.5_

- [ ] 5.3 Create PlatformsStep component
  - Implement multi-select checkbox interface for platforms
  - Add platform icons and labels
  - Implement selection state management
  - Add "Select All" and "Clear All" options
  - _Requirements: 1.1, 1.3_

- [ ] 5.4 Create ThemesStep component
  - Implement tag input interface for themes
  - Add theme suggestions based on team history
  - Implement add/remove theme functionality
  - Add validation for theme format
  - _Requirements: 1.1, 1.3_

- [ ] 5.5 Create ReviewStep component
  - Display summary of all entered information
  - Add edit buttons for each section to return to specific steps
  - Implement final validation before submission
  - Add create button with loading state
  - _Requirements: 1.1, 1.3, 1.4_


- [ ] 5.6 Implement wizard form persistence
  - Save wizard state to localStorage on each step
  - Restore wizard state when reopening
  - Clear saved state after successful creation
  - Add "Resume Draft" option if saved state exists
  - _Requirements: 1.5, 8.3_

- [ ] 6. Integrate components into EpisodeOverviewPage
- [ ] 6.1 Refactor EpisodeOverviewPage layout
  - Replace existing layout with new component structure
  - Add WorkflowProgress component at top of page
  - Add NextActionCard component below workflow progress
  - Add ContentCardsGrid component below next action
  - Maintain existing episode header and breadcrumb
  - _Requirements: 2.1, 3.1, 4.1, 5.1_

- [ ] 6.2 Implement data fetching for new components
  - Fetch episode data with plan, transcript, tracks, clips, quotes, blog
  - Compute workflow state from fetched data
  - Pass appropriate data to each component
  - Handle loading states during data fetch
  - _Requirements: 8.1, 8.2, 10.1, 10.2_

- [ ] 6.3 Add error handling and empty states
  - Implement error boundaries for component failures
  - Add error states for failed data fetches
  - Add empty states for missing content
  - Implement retry functionality for failed operations
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 10.5_

- [ ] 6.4 Implement real-time updates for content generation
  - Add polling or websocket connection for status updates
  - Update content cards when generation completes
  - Show progress indicators during generation
  - Display notifications for completed content
  - _Requirements: 4.5, 10.3, 10.4_


- [ ] 7. Update Episodes List Page
- [ ] 7.1 Replace create button with wizard trigger
  - Remove existing "Create Episode" button
  - Add new button that opens EpisodeCreationWizard modal
  - Implement modal state management
  - Handle successful creation with redirect to new episode
  - _Requirements: 1.1, 1.4_

- [ ] 7.2 Add workflow progress indicators to episode cards
  - Add mini workflow progress indicator to each episode card
  - Show current step and completion status
  - Update card styling to accommodate progress indicator
  - Ensure mobile-responsive layout
  - _Requirements: 2.1, 2.2, 9.1, 9.3_

- [ ] 8. Add loading and skeleton states
- [ ] 8.1 Create skeleton components for all new components
  - Create WorkflowProgressSkeleton component
  - Create NextActionCardSkeleton component
  - Create ContentCardSkeleton component
  - Implement pulsing animation for skeletons
  - _Requirements: 10.1, 10.2_

- [ ] 8.2 Implement progressive loading strategy
  - Load episode metadata first (show header immediately)
  - Load workflow state second (show progress indicator)
  - Load content counts last (populate cards)
  - Show appropriate skeletons during each loading phase
  - _Requirements: 10.1, 10.2, 10.3_

- [ ] 9. Implement responsive design
- [ ] 9.1 Test and refine mobile layouts
  - Test WorkflowProgress vertical layout on mobile
  - Test ContentCardsGrid stacking on mobile
  - Test wizard modal on mobile screens
  - Adjust spacing and sizing for touch targets
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 9.2 Test tablet and intermediate screen sizes
  - Test layouts on tablet portrait and landscape
  - Adjust grid columns for intermediate sizes
  - Ensure smooth transitions between breakpoints
  - _Requirements: 9.1, 9.3, 9.5_


- [ ] 10. Add accessibility features
- [ ] 10.1 Implement keyboard navigation
  - Add tab navigation through all interactive elements
  - Implement arrow key navigation for workflow steps
  - Add escape key to close wizard modal
  - Ensure proper focus management throughout
  - _Requirements: 2.1, 5.1_

- [ ] 10.2 Add ARIA labels and roles
  - Add ARIA progressbar to WorkflowProgress
  - Add ARIA labels to all buttons and links
  - Add ARIA live regions for dynamic content updates
  - Add ARIA descriptions for complex interactions
  - _Requirements: 2.1, 3.1, 4.1_

- [ ] 10.3 Implement screen reader announcements
  - Announce workflow step changes
  - Announce next action updates
  - Announce content generation completion
  - Announce error states and recovery options
  - _Requirements: 2.1, 3.1, 4.5, 10.5_

- [ ] 10.4 Ensure visual accessibility
  - Verify color contrast ratios meet WCAG AA standards
  - Add visible focus indicators to all interactive elements
  - Ensure status is conveyed through multiple visual cues
  - Test with browser zoom at 200%
  - _Requirements: 2.1, 2.2, 2.3, 4.1_

- [ ] 11. Performance optimization
- [ ] 11.1 Implement code splitting
  - Lazy load EpisodeCreationWizard modal
  - Lazy load content card components
  - Split workflow utilities into separate bundle
  - Measure and optimize bundle sizes
  - _Requirements: 10.1, 10.2_

- [ ] 11.2 Optimize rendering performance
  - Memoize WorkflowProgress component
  - Memoize content card components
  - Use React.memo for static components
  - Implement virtualization if needed for large lists
  - _Requirements: 10.1, 10.2, 10.3_


- [ ] 11.3 Optimize data fetching
  - Implement parallel data fetching for episode and related content
  - Add caching for workflow state computation
  - Debounce wizard form validation
  - Implement request deduplication
  - _Requirements: 8.1, 8.2, 10.1, 10.2_

- [ ] 12. Add analytics and monitoring
- [ ] 12.1 Add analytics tracking for workflow events
  - Track wizard step progression
  - Track workflow step completion
  - Track next action button clicks
  - Track content card interactions
  - _Requirements: 8.1, 8.2, 8.4_

- [ ] 12.2 Add error monitoring
  - Track component render errors
  - Track data fetch failures
  - Track workflow state computation errors
  - Set up alerts for critical errors
  - _Requirements: 10.5_

- [ ] 13. Documentation and cleanup
- [ ] 13.1 Update component documentation
  - Document all new components with JSDoc comments
  - Add usage examples for each component
  - Document props and interfaces
  - Add README for workflow utilities
  - _Requirements: All_

- [ ] 13.2 Remove deprecated code
  - Remove old episode creation form if replaced
  - Remove unused components from old overview page
  - Clean up unused utility functions
  - Update imports throughout codebase
  - _Requirements: All_

- [ ] 13.3 Update user documentation
  - Create user guide for new episode workflow
  - Add screenshots of new interface
  - Document keyboard shortcuts
  - Create video walkthrough
  - _Requirements: 1.1, 2.1, 3.1, 4.1, 5.1_
