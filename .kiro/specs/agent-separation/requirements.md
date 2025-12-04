# Requirements Document

## Introduction

This feature separates the monolithic clip-detector agent into three specialized, concurrent agents to improve content generation quality. The current clip-detector agent handles clip detection, quote detection, and blog outline generation in a single AI conversation, which causes quality degradation due to context overload. By splitting into three focused agents (clip-detector, quote-detector, blog-outline), each agent can specialize in its domain and produce higher quality outputs while running concurrently for faster processing.

## Glossary

- **Agent**: A Lambda function that uses AWS Bedrock to analyze transcript content and generate structured outputs using tools
- **Clip Detector Agent**: An agent specialized in identifying video clip opportunities from transcripts
- **Quote Detector Agent**: An agent specialized in identifying shareable quotes from transcripts
- **Blog Outline Agent**: An agent specialized in creating structured blog post outlines from transcripts
- **Transcript**: An SRT-formatted file containing timestamped, speaker-attributed text from a livestream episode
- **Tool**: A Bedrock tool definition that allows an agent to perform structured actions (e.g., createClip, createQuote, buildBlogOutline)
- **Workflow Step**: A tracked stage in the episode processing pipeline (e.g., GENERATE_CONTENT)
- **Concurrent Execution**: Multiple agents processing the same transcript simultaneously and independently

## Requirements

### Requirement 1

**User Story:** As a content creator, I want clip detection to be handled by a specialized agent, so that clip quality improves through focused analysis.

#### Acceptance Criteria

1. WHEN a transcript is uploaded THEN the Clip Detector Agent SHALL analyze the transcript and create 5-10 video clip recommendations
2. WHEN the Clip Detector Agent processes a transcript THEN the agent SHALL use only the createClip tool
3. WHEN the Clip Detector Agent completes processing THEN the system SHALL track completion status independently from other agents

### Requirement 2

**User Story:** As a content creator, I want quote detection to be handled by a specialized agent, so that quote quality improves through focused analysis.

#### Acceptance Criteria

1. WHEN a transcript is uploaded THEN the Quote Detector Agent SHALL analyze the transcript and create 3-7 shareable quotes
2. WHEN the Quote Detector Agent processes a transcript THEN the agent SHALL use only the createQuote tool
3. WHEN the Quote Detector Agent completes processing THEN the system SHALL track completion status independently from other agents

### Requirement 3

**User Story:** As a content creator, I want blog outline generation to be handled by a specialized agent, so that outline quality improves through focused analysis.

#### Acceptance Criteria

1. WHEN a transcript is uploaded THEN the Blog Outline Agent SHALL analyze the transcript and create a structured blog outline
2. WHEN the Blog Outline Agent processes a transcript THEN the agent SHALL use only the buildBlogOutline tool
3. WHEN the Blog Outline Agent completes processing THEN the system SHALL track completion status independently from other agents

### Requirement 4

**User Story:** As a system operator, I want all three agents to run concurrently, so that content generation completes faster than sequential processing.

#### Acceptance Criteria

1. WHEN a transcript upload triggers content generation THEN the system SHALL invoke all three agents concurrently
2. WHEN any agent fails THEN the other agents SHALL continue processing independently
3. WHEN all three agents complete THEN the system SHALL update the episode status to Ready

### Requirement 5

**User Story:** As a system operator, I want the agents to share the same trigger mechanism, so that the architecture remains simple and consistent.

#### Acceptance Criteria

1. WHEN an S3 transcript upload event occurs THEN the system SHALL trigger all three agents via the same EventBridge rule pattern
2. WHEN an agent receives the S3 event THEN the agent SHALL extract tenantId and episodeId from the S3 key using the existing parseEpisodeIdFromKey utility
3. WHEN an agent loads the transcript THEN the agent SHALL use the existing loadTranscript utility

### Requirement 6

**User Story:** As a content creator, I want to see the overall content generation status, so that I know when all content is ready.

#### Acceptance Criteria

1. WHEN any agent starts processing THEN the system SHALL set the GENERATE_CONTENT workflow step to In Progress
2. WHEN all three agents complete successfully THEN the system SHALL set the GENERATE_CONTENT workflow step to Completed
3. WHEN any agent fails THEN the system SHALL set the GENERATE_CONTENT workflow step to Failed with an error message
4. IF content generation has already completed for an episode THEN the agents SHALL skip processing and return early

