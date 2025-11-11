# Requirements Document

## Introduction

This feature enables content creators to plan episodes before they air by adding structured planning information. An AI agent analyzes the plan and generates recommendations including a suggested episode flow (as a Mermaid sequence diagram), promotional content, and key learning moments to enhance episode quality and audience engagement.

## Glossary

- **Episode**: A single livestream content unit that can be planned, recorded, and processed
- **Plan**: A structured document containing objectives, concepts, and notes for an upcoming episode
- **AI Planning Agent**: An AWS Bedrock-powered agent that analyzes episode plans and generates recommendations
- **Recommendations**: AI-generated suggestions including episode flow, title, description, and key learning moments
- **Sequence Diagram**: A Mermaid-formatted diagram showing the proposed flow of the episode
- **Status History**: A chronological record of state changes for an episode or its related resources
- **System**: The livestream post-production platform

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to add a plan to an episode before it airs, so that I can organize my thoughts and prepare structured content

#### Acceptance Criteria

1. WHEN a user creates or updates a plan for an episode, THE System SHALL store the plan with objectives, concepts, and notes fields
2. THE System SHALL allow only one plan per episode
3. WHEN a plan is created or updated, THE System SHALL record the change in the episode's status history with status "plan_added" or "plan_updated"
4. THE System SHALL validate that objectives field contains at least one character
5. THE System SHALL validate that concepts field contains at least one character

### Requirement 2

**User Story:** As a content creator, I want the AI to analyze my episode plan, so that I can receive structured recommendations to improve my content

#### Acceptance Criteria

1. WHEN a plan is added or updated, THE System SHALL trigger the AI Planning Agent to process the plan
2. THE AI Planning Agent SHALL analyze the objectives, concepts, and notes to generate recommendations
3. THE AI Planning Agent SHALL invoke the setPlanRecommendations tool with generated content
4. WHEN the AI Planning Agent completes processing, THE System SHALL update the episode status history with status "recommendations_generated"
5. IF the AI Planning Agent fails to process the plan, THEN THE System SHALL update the episode status history with status "recommendations_failed" and log the error

### Requirement 3

**User Story:** As a content creator, I want to receive AI-generated recommendations for my episode, so that I can improve the structure and promotional content

#### Acceptance Criteria

1. THE System SHALL store AI-generated recommendations including suggestedFlow, proposedTitle, proposedDescription, and keyLearningMoments
2. THE suggestedFlow field SHALL contain a valid Mermaid sequence diagram syntax
3. THE proposedTitle field SHALL contain a string between 10 and 200 characters
4. THE proposedDescription field SHALL contain a string between 50 and 1000 characters
5. THE keyLearningMoments field SHALL contain an array of strings with at least one learning moment

### Requirement 4

**User Story:** As a content creator, I want to view my episode plan and AI recommendations in the UI, so that I can review and use them for episode preparation

#### Acceptance Criteria

1. WHEN a user views an episode with a plan, THE System SHALL display the plan's objectives, concepts, and notes
2. WHEN recommendations exist for an episode, THE System SHALL display the proposed title, description, and key learning moments
3. WHEN a suggestedFlow exists, THE System SHALL render the Mermaid sequence diagram in the UI
4. THE System SHALL display the status history showing plan-related status changes
5. WHEN no recommendations exist yet, THE System SHALL display a loading or pending state

### Requirement 5

**User Story:** As a content creator, I want to update my episode plan, so that I can refine my ideas and receive updated recommendations

#### Acceptance Criteria

1. WHEN a user updates an existing plan, THE System SHALL replace the previous plan data
2. WHEN a plan is updated, THE System SHALL trigger the AI Planning Agent to regenerate recommendations
3. THE System SHALL preserve the status history showing both the original plan_added and subsequent plan_updated events
4. WHEN new recommendations are generated, THE System SHALL replace the previous recommendations
5. THE System SHALL update the updatedAt timestamp for the plan

### Requirement 6

**User Story:** As a system administrator, I want the AI Planning Agent to use appropriate tools, so that recommendations are stored correctly in the database

#### Acceptance Criteria

1. THE AI Planning Agent SHALL have access to a setPlanRecommendations tool
2. THE setPlanRecommendations tool SHALL accept episodeId, suggestedFlow, proposedTitle, proposedDescription, and keyLearningMoments as parameters
3. WHEN the setPlanRecommendations tool is invoked, THE System SHALL validate all required parameters are present
4. THE System SHALL store recommendations in DynamoDB with the episode
5. THE System SHALL return success confirmation to the AI Planning Agent after storing recommendations
