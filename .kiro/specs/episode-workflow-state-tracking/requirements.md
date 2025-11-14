# Requirements Document

## Introduction

This feature enhances the episode workflow tracking system to provide granular state management for each workflow step and content generation process. The system will track the state of pre-stream steps (Generate Plan) and post-stream steps (Upload Transcript, Upload Tracks), as well as the state of content generation processes (Blog Posts, Quotes, Clips) that are triggered by these steps.

## Glossary

- **Episode Workflow System**: The system that manages the progression of episodes through various processing steps
- **Workflow Step**: A discrete action in the episode processing pipeline (e.g., Generate Plan, Upload Transcript)
- **Content Generation Process**: An AI-driven process that creates content (Blog Posts, Quotes, Clips)
- **Step State**: The current status of a workflow step (Locked, Ready, In Progress, Complete, Skipped)
- **Content State**: The current status of a content generation process (Pending, Processing, Complete, Failed)
- **Pre-Stream Phase**: Steps that occur before the livestream (Generate Plan)
- **Post-Stream Phase**: Steps that occur after the livestream (Upload Transcript, Upload Tracks)
- **DynamoDB**: The database system storing episode and workflow state data
- **Frontend UI**: The React-based user interface displaying workflow progress

## Requirements

### Requirement 1: Workflow Step State Management

**User Story:** As a content creator, I want to see the current state of each workflow step so that I understand what actions are available and what is currently processing.

#### Acceptance Criteria

1. WHEN an episode is created, THE Episode Workflow System SHALL initialize the Generate Plan step with status "Ready"
2. WHEN an episode is created, THE Episode Workflow System SHALL initialize the Upload Transcript step with status "Locked"
3. WHEN an episode is created, THE Episode Workflow System SHALL initialize the Upload Tracks step with status "Locked"
4. WHEN the Generate Plan step is completed, THE Episode Workflow System SHALL transition the Upload Transcript step to status "Ready"
5. WHEN the Generate Plan step is completed, THE Episode Workflow System SHALL transition the Upload Tracks step to status "Ready"
6. WHEN the Generate Plan step is skipped, THE Episode Workflow System SHALL transition the Upload Transcript step to status "Ready"
7. WHEN the Generate Plan step is skipped, THE Episode Workflow System SHALL transition the Upload Tracks step to status "Ready"
8. WHEN a workflow step is initiated, THE Episode Workflow System SHALL transition that step to status "In Progress"
9. WHEN a workflow step completes successfully, THE Episode Workflow System SHALL transition that step to status "Complete"
10. WHEN a workflow step fails, THE Episode Workflow System SHALL transition that step to status "Ready" with error information

### Requirement 2: Content Generation State Tracking

**User Story:** As a content creator, I want to see the status of each content generation process (Blog Posts, Quotes, Clips) so that I know when content is being created and when it's ready for review.

#### Acceptance Criteria

1. WHEN the Upload Transcript step is completed, THE Episode Workflow System SHALL create content generation state records for Blog Posts with status "Pending"
2. WHEN the Upload Transcript step is completed, THE Episode Workflow System SHALL create content generation state records for Quotes with status "Pending"
3. WHEN the Upload Transcript step is completed, THE Episode Workflow System SHALL create content generation state records for Clips with status "Pending"
4. WHEN a content generation process begins, THE Episode Workflow System SHALL transition that content state to "Processing"
5. WHEN a content generation process completes successfully, THE Episode Workflow System SHALL transition that content state to "Complete"
6. WHEN a content generation process fails, THE Episode Workflow System SHALL transition that content state to "Failed" with error information
7. WHILE any content generation process has status "Processing", THE Episode Workflow System SHALL display the Upload Transcript step as "Processing" in the progress bar
8. WHEN all content generation processes reach status "Complete" or "Failed", THE Episode Workflow System SHALL transition the Upload Transcript step to status "Complete"

### Requirement 3: Workflow Step Data Persistence

**User Story:** As a system administrator, I want workflow step states to be persisted in DynamoDB so that state is maintained across sessions and can be queried efficiently.

#### Acceptance Criteria

1. THE Episode Workflow System SHALL store workflow step state in DynamoDB with partition key "tenant#{tenantId}#{episodeId}" and sort key "workflow#step#{stepName}"
2. THE Episode Workflow System SHALL include the following attributes in workflow step records: stepName, status, startedAt, completedAt, errorMessage
3. THE Episode Workflow System SHALL update the workflow step record when status transitions occur
4. THE Episode Workflow System SHALL include a timestamp for each status transition
5. THE Episode Workflow System SHALL maintain a history of status transitions for audit purposes

### Requirement 4: Content Generation State Persistence

**User Story:** As a system administrator, I want content generation states to be persisted in DynamoDB so that I can track the progress of AI-driven content creation.

#### Acceptance Criteria

1. THE Episode Workflow System SHALL store content generation state in DynamoDB with partition key "tenant#{tenantId}#{episodeId}" and sort key "workflow#content#{contentType}"
2. THE Episode Workflow System SHALL include the following attributes in content generation records: contentType, status, startedAt, completedAt, itemCount, errorMessage
3. THE Episode Workflow System SHALL update the content generation record when status transitions occur
4. THE Episode Workflow System SHALL track the number of items generated (e.g., number of blog posts, quotes, clips)
5. THE Episode Workflow System SHALL include error details when content generation fails

### Requirement 5: Progress Bar Visualization

**User Story:** As a content creator, I want to see a visual progress bar that shows the status of each workflow step so that I can quickly understand the episode's progress.

#### Acceptance Criteria

1. THE Frontend UI SHALL display a progress bar with Pre-Stream and Post-Stream sections
2. THE Frontend UI SHALL display the Generate Plan step in the Pre-Stream section
3. THE Frontend UI SHALL display the Upload Transcript and Upload Tracks steps in the Post-Stream section
4. THE Frontend UI SHALL visually distinguish between Locked, Ready, In Progress, Complete, and Skipped states
5. THE Frontend UI SHALL display a "Processing" indicator for steps that are actively processing
6. THE Frontend UI SHALL update the progress bar in real-time when workflow state changes
7. THE Frontend UI SHALL display the overall completion percentage (e.g., "0 of 3 complete")

### Requirement 6: Created Content Section Visualization

**User Story:** As a content creator, I want to see the status of content generation processes in the Created Content section so that I know when AI-generated content is ready for review.

#### Acceptance Criteria

1. THE Frontend UI SHALL display a Created Content section below the progress bar
2. WHILE content generation processes have status "Pending" or "Processing", THE Frontend UI SHALL display a "Processing" indicator in the Created Content section
3. WHEN content generation processes have status "Complete", THE Frontend UI SHALL display the generated content items (Blog Posts, Quotes, Clips)
4. WHEN content generation processes have status "Failed", THE Frontend UI SHALL display an error message with retry options
5. THE Frontend UI SHALL display the count of generated items for each content type (e.g., "3 Clips", "5 Quotes")
6. THE Frontend UI SHALL update the Created Content section in real-time when content generation state changes

### Requirement 7: Separate Upload Pages

**User Story:** As a content creator, I want Upload Transcript and Upload Tracks to be on separate pages so that I can focus on one upload task at a time and have a clearer workflow.

#### Acceptance Criteria

1. THE Frontend UI SHALL provide a dedicated page for Upload Transcript at route "/episodes/{episodeId}/transcript"
2. THE Frontend UI SHALL provide a dedicated page for Upload Tracks at route "/episodes/{episodeId}/tracks"
3. THE Frontend UI SHALL display navigation links to these pages from the episode overview
4. THE Frontend UI SHALL display the workflow progress bar on both upload pages for context
5. THE Frontend UI SHALL redirect to the episode overview page after successful upload completion

### Requirement 8: API Endpoints for Workflow State

**User Story:** As a frontend developer, I want API endpoints to retrieve and update workflow state so that I can display accurate progress information to users.

#### Acceptance Criteria

1. THE Episode Workflow System SHALL provide a GET endpoint at "/episodes/{episodeId}/workflow" that returns all workflow step states
2. THE Episode Workflow System SHALL provide a GET endpoint at "/episodes/{episodeId}/workflow/content" that returns all content generation states
3. THE Episode Workflow System SHALL provide a PUT endpoint at "/episodes/{episodeId}/workflow/steps/{stepName}" to update workflow step state
4. THE Episode Workflow System SHALL provide a PUT endpoint at "/episodes/{episodeId}/workflow/content/{contentType}" to update content generation state
5. THE Episode Workflow System SHALL validate that status transitions are valid before persisting changes
6. THE Episode Workflow System SHALL return appropriate error responses for invalid state transitions

### Requirement 9: Real-Time State Updates

**User Story:** As a content creator, I want the UI to update automatically when workflow state changes so that I don't need to manually refresh the page to see progress.

#### Acceptance Criteria

1. WHEN a workflow step state changes, THE Episode Workflow System SHALL publish a notification event to EventBridge
2. WHEN a content generation state changes, THE Episode Workflow System SHALL publish a notification event to EventBridge
3. THE Episode Workflow System SHALL publish workflow state updates to Momento Topics for the tenant
4. THE Frontend UI SHALL subscribe to Momento Topics for real-time workflow state updates
5. THE Frontend UI SHALL update the progress bar and Created Content section when Momento messages are received
6. THE Frontend UI SHALL fall back to polling if Momento connection fails

### Requirement 10: Error Handling and Recovery

**User Story:** As a content creator, I want clear error messages and recovery options when workflow steps fail so that I can resolve issues and continue processing.

#### Acceptance Criteria

1. WHEN a workflow step fails, THE Episode Workflow System SHALL store the error message in the workflow step record
2. WHEN a content generation process fails, THE Episode Workflow System SHALL store the error message in the content generation record
3. THE Frontend UI SHALL display error messages in the progress bar for failed workflow steps
4. THE Frontend UI SHALL display error messages in the Created Content section for failed content generation
5. THE Frontend UI SHALL provide a "Retry" button for failed workflow steps
6. THE Frontend UI SHALL provide a "Retry" button for failed content generation processes
7. WHEN a user clicks "Retry", THE Episode Workflow System SHALL reset the state to "Ready" or "Pending" and allow re-execution
