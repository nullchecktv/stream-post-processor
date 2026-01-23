# Requirements Document

## Introduction

This specification defines the redesign of the Episode Overview page to transform it from a passive dashboard into an active "conveyor belt" that guides users through episode completion with a single, clear primary action at each state. The redesign implements a state machine approach where each episode state maps to exactly one primary action, eliminating decision paralysis and providing clear guidance on what to do next.

## Glossary

- **Episode_Overview_Page**: The main page displaying episode details and guiding users through the episode workflow
- **State_Machine**: Logic that determines
er experience pattern that guides users through a linear workflow with clear next steps

## Requirements

### Requirement 1: State Machine Implementation

**User Story:** As a content creator, I want the system to automatically determine what I should do next based on my episode's current state, so that I never have to guess the next step.

#### Acceptance Criteria

1. WHEN an episode has no plan THEN the System SHALL set the episode state to "idle"
2. WHEN an episode has a plan but no uploaded tracks THEN the System SHALL set the episode state to "planned"
3. WHEN an episode has uploaded tracks but no generated clips or quotes THEN the System SHALL set the episode state to "recorded"
4. WHEN an episode has generated clips or quotes but is not published THEN the System SHALL set the episode state to "processed"
5. WHEN an episode is published THEN the System SHALL set the episode state to "published"
6. FOR ALL episode states, the System SHALL map to exactly one primary action

### Requirement 2: Primary Action Zone

**User Story:** As a content creator, I want to see exactly one clear action I should take next, so that I can make progress without decision paralysis.

#### Acceptance Criteria

1. THE Page SHALL display exactly one primary action button at any given time
2. WHEN the episode state is "idle" THEN the Primary_Action_Zone SHALL display "Generate plan" as the primary action
3. WHEN the episode state is "planned" THEN the Primary_Action_Zone SHALL display "Upload recording" as the primary action
4. WHEN the episode state is "recorded" THEN the Primary_Action_Zone SHALL display "Generate clips & quotes" as the primary action
5. WHEN the episode state is "processed" THEN the Primary_Action_Zone SHALL display "Review & publish" as the primary action
6. WHEN the episode state is "published" THEN the Primary_Action_Zone SHALL display "Start next episode" as the primary action
7. THE Primary_Action_Zone SHALL include a headline explaining what happens next
8. THE Primary_Action_Zone SHALL include subtext explaining why the action matters
9. THE Primary_Action_Zone SHALL be positioned above the fold
10. THE Primary_Action_Zone SHALL be visually dominant compared to other page sections

### Requirement 3: Page Structure and Layout

**User Story:** As a content creator, I want the page organized in a clear hierarchy, so that I can quickly scan episode details and understand what to do next.

#### Acceptance Criteria

1. THE Page SHALL contain exactly four sections in this order: Episode Identity, Primary Action Zone, Workflow Progress, Created Artifacts
2. THE Episode_Identity section SHALL display episode title, platforms, status, and last updated timestamp
3. THE Episode_Identity section SHALL be compact and scannable in under 2 seconds
4. THE Episode_Identity section SHALL not include created date, episode number, or themes as primary information
5. THE Primary_Action_Zone SHALL be positioned immediately after the Episode_Identity section
6. THE Workflow_Progress section SHALL be positioned after the Primary_Action_Zone
7. THE Created_Artifacts section SHALL be positioned last
8. THE Page SHALL ensure the Primary_Action_Zone is visible without scrolling

### Requirement 4: Workflow Progress Display

**User Story:** As a content creator, I want to see my progress through the episode workflow, so that I feel reassured I'm on track.

#### Acceptance Criteria

1. THE Workflow_Progress section SHALL display the user's current position in the episode workflow
2. THE Workflow_Progress section SHALL show completed steps, current step, and remaining steps
3. THE Workflow_Progress section SHALL not contain primary action buttons
4. THE Workflow_Progress section SHALL be visually subordinate to the Primary_Action_Zone
5. THE Workflow_Progress section SHALL answer "Am I on track?" not "What should I do?"

### Requirement 5: Created Artifacts Display

**User Story:** As a content creator, I want to see the artifacts I've created, so that I feel rewarded for my progress and can access my outputs.

#### Acceptance Criteria

1. THE Created_Artifacts section SHALL only display usable artifacts that have been generated
2. WHEN no artifacts exist THEN the Created_Artifacts section SHALL not be displayed
3. THE Created_Artifacts section SHALL not contain "Generate" buttons
4. THE Created_Artifacts section SHALL display clips, quotes, and blog posts that have been created
5. THE Created_Artifacts section SHALL provide access to view or download artifacts

### Requirement 6: State-to-Action Mapping

**User Story:** As a content creator, I want each action to be contextually appropriate for my episode's state, so that I'm always guided toward meaningful progress.

#### Acceptance Criteria

1. WHEN the primary action is "Generate plan" THEN clicking SHALL navigate to the episode planning page
2. WHEN the primary action is "Upload recording" THEN clicking SHALL navigate to the upload interface
3. WHEN the primary action is "Generate clips & quotes" THEN clicking SHALL trigger AI content generation
4. WHEN the primary action is "Review & publish" THEN clicking SHALL navigate to the content review interface
5. WHEN the primary action is "Start next episode" THEN clicking SHALL navigate to the episode creation page
6. FOR ALL primary actions, the System SHALL provide appropriate secondary escape hatches when needed

### Requirement 7: UX Constraints

**User Story:** As a content creator, I want the interface to guide me confidently, so that I feel certain about what to do next.

#### Acceptance Criteria

1. THE Page SHALL never display more than one primary button simultaneously
2. THE Page SHALL never require the user to choose between two equally valid paths
3. THE Page SHALL never require scrolling to find the primary action
4. THE Page SHALL explain the outcome of actions, not just the process
5. THE Page SHALL not reward inactivity with visibility
6. THE Page SHALL make the user feel certain about the next step

### Requirement 8: Real-Time Updates

**User Story:** As a content creator, I want the page to update automatically when my episode state changes, so that I always see the current next action.

#### Acceptance Criteria

1. WHEN episode data changes THEN the System SHALL recalculate the episode state
2. WHEN the episode state changes THEN the System SHALL update the Primary_Action_Zone
3. WHEN artifacts are created THEN the System SHALL update the Created_Artifacts section
4. WHEN processing completes THEN the System SHALL update the Workflow_Progress section
5. THE Page SHALL integrate with the existing real-time notification system

### Requirement 9: Episode Identity Display

**User Story:** As a content creator, I want to quickly identify which episode I'm viewing, so that I can confirm I'm working on the right content.

#### Acceptance Criteria

1. THE Episode_Identity section SHALL display the episode title prominently
2. THE Episode_Identity section SHALL display the platforms where the episode will be published
3. THE Episode_Identity section SHALL display the current episode status
4. THE Episode_Identity section SHALL display the last updated timestamp
5. THE Episode_Identity section SHALL be read-only and not contain interactive elements

### Requirement 10: Navigation and Routing

**User Story:** As a content creator, I want to navigate to the appropriate page when I click the primary action, so that I can complete the next step in my workflow.

#### Acceptance Criteria

1. WHEN the user clicks "Generate plan" THEN the System SHALL navigate to the episode planning page
2. WHEN the user clicks "Upload recording" THEN the System SHALL navigate to the upload interface
3. WHEN the user clicks "Generate clips & quotes" THEN the System SHALL trigger content generation and remain on the overview page
4. WHEN the user clicks "Review & publish" THEN the System SHALL navigate to the content review page
5. WHEN the user clicks "Start next episode" THEN the System SHALL navigate to the episode creation page
6. THE System SHALL preserve the current episode context during navigation
