# Requirements Document

## Introduction

This feature improves the existing clip-generation workflow by fixing syntax errors in the Step Functions state machine, adding proper error handling, simplifying the segment extractor to handle single segments, and removing the update-clip-record function in favor of direct DynamoDB integrations within the Step Functions workflow.

## Glossary

- **Clip_Generation_Workflow**: The Step Functions state machine that orchestrates clip assembly
- **Segment_Extractor**: Lambda function that processes a single video segment
- **Clip_Stitcher**: Lambda function that combines multiple segments into a final clip
- **Status_History**: DynamoDB attribute tracking clip processing status changes
- **Direct_Integration**: Step Functions native DynamoDB operations without Lambda functions
- **JSONata_Expression**: Query language used in Step Functions for data transformation
- **Error_State**: Step Functions state that handles processing failures
- **Clip_Generation_Trigger**: Lambda function that subscribes to Begin Clip Generation events
- **Begin_Clip_Generation_Event**: EventBridge event that initiates clip processing for an episode

## Requirements

### Requirement 1

**User Story:** As a system administrator, I want the clip-generation workflow to have correct syntax and proper error handling, so that clip processing executes reliably without syntax errors.

#### Acceptance Criteria

1. WHEN the workflow executes, THE Clip_Generation_Workflow SHALL use valid JSONata expressions for all data transformations
2. WHEN DynamoDB operations are performed, THE Clip_Generation_Workflow SHALL use correct table name references from environment variables
3. WHEN Lambda function ARNs are referenced, THE Clip_Generation_Workflow SHALL use proper SAM template references instead of hardcoded ARNs
4. WHEN status updates occur, THE Clip_Generation_Workflow SHALL append status entries to the statusHistory array using correct DynamoDB syntax
5. IF any step fails, THEN THE Clip_Generation_Workflow SHALL transition to an error handling state

### Requirement 2

**User Story:** As a developer, I want the workflow to handle failures gracefully by updating clip status to failed, so that I can identify and troubleshoot processing issues.

#### Acceptance Criteria

1. WHEN any Lambda function fails, THE Clip_Generation_Workflow SHALL catch the error and transition to a failure handling state
2. WHEN processing fails, THE Clip_Generation_Workflow SHALL update the clip status to "Generation Failed" in DynamoDB
3. WHEN updating failure status, THE Clip_Generation_Workflow SHALL include error details and timestamp in the status history
4. WHEN error handling completes, THE Clip_Generation_Workflow SHALL terminate with a failed status
5. WHILE handling errors, THE Clip_Generation_Workflow SHALL preserve the original error information for debugging

### Requirement 3

**User Story:** As a developer, I want the segment extractor to process only a single segment as provided by the workflow, so that the function is simpler and more focused.

#### Acceptance Criteria

1. WHEN the segment extractor is invoked, THE Segment_Extractor SHALL accept a single segment object instead of an array
2. WHEN processing a segment, THE Segment_Extractor SHALL extract video content for only the provided segment
3. WHEN segment processing completes, THE Segment_Extractor SHALL return metadata for the single processed segment
4. WHEN validation occurs, THE Segment_Extractor SHALL validate only the single segment's timing and parameters
5. IF the segment is invalid, THEN THE Segment_Extractor SHALL throw an error with specific validation details

### Requirement 4

**User Story:** As a system architect, I want to remove the update-clip-record Lambda function and use direct DynamoDB integrations, so that the workflow is more efficient and has fewer moving parts.

#### Acceptance Criteria

1. WHEN updating clip status, THE Clip_Generation_Workflow SHALL use direct DynamoDB updateItem operations
2. WHEN status changes occur, THE Clip_Generation_Workflow SHALL append new status entries to statusHistory using DynamoDB list operations
3. WHEN the workflow completes successfully, THE Clip_Generation_Workflow SHALL update the clip record with final metadata using direct integration
4. WHEN the workflow fails, THE Clip_Generation_Workflow SHALL update the clip status using direct DynamoDB operations
5. THE Clip_Generation_Workflow SHALL NOT invoke any Lambda functions for simple DynamoDB update operations

### Requirement 5

**User Story:** As a system integrator, I want a Lambda function to automatically start clip generation workflows when clips are detected, so that clip processing begins immediately after AI detection completes.

#### Acceptance Criteria

1. WHEN a Begin Clip Generation event is published to EventBridge, THE Clip_Generation_Trigger SHALL receive the event
2. WHEN processing the event, THE Clip_Generation_Trigger SHALL extract the episode ID and associated clip data
3. WHEN clips are found in the event, THE Clip_Generation_Trigger SHALL start a separate Step Functions execution for each clip
4. WHEN starting executions, THE Clip_Generation_Trigger SHALL pass the clip data and episode context to each workflow
5. IF no clips are found in the event, THEN THE Clip_Generation_Trigger SHALL log the condition and complete successfully

### Requirement 6

**User Story:** As a content creator, I want the clip assembly workflow to maintain accurate status tracking throughout processing, so that I can monitor the progress of my clips.

#### Acceptance Criteria

1. WHEN processing begins, THE Clip_Generation_Workflow SHALL set clip status to "Generation in Progress" with timestamp
2. WHEN each major step completes, THE Clip_Generation_Workflow SHALL append status entries to the history array
3. WHEN processing completes successfully, THE Clip_Generation_Workflow SHALL set final status to "Generation Complete" with completion timestamp
4. WHEN processing fails, THE Clip_Generation_Workflow SHALL set status to "Generation Failed" with error details
5. WHILE processing, THE Clip_Generation_Workflow SHALL ensure all status updates include accurate timestamps using the $now() function
