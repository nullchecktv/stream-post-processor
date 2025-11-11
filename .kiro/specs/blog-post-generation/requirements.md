# Requirements Document

## Introduction

This feature enables automatic generation of blog posts from episode transcripts using AI. The system will analyze episode content, create a structured outline, and generate a full blog post in the configured brand voice and writing style. Users can view, edit, and regenerate blog content through a dedicated interface.

## Glossary

- **System**: The livestream post-production platform
- **User**: Content creator or team member using the platform
- **Episode**: A recorded livestream session with associated metadata and transcript
- **Blog Outline**: A structured markdown outline of blog post sections and key points
- **Blog Content**: The full blog post written in markdown format
- **Brand Voice**: The configured tone and writing style for content generation
- **Tenant**: A team or organization using the platform
- **Clip Detector Agent**: AI agent that analyzes transcripts for clips and content opportunities
- **Blog Generator Agent**: Autonomous AI agent that writes blog posts based on outlines

## Requirements

### Requirement 1

**User Story:** As a content creator, I want to configure my brand voice and writing style, so that generated blog posts match my personal or team's content style

#### Acceptance Criteria

1. WHEN a User updates their profile, THE System SHALL store tone and writing style fields in the user profile record
2. WHEN a User updates team settings, THE System SHALL store tone and writing style fields in the team record
3. THE System SHALL retrieve brand voice settings from the active tenant context during blog generation
4. THE System SHALL validate that tone and writing style fields contain non-empty string values when provided
5. WHERE a User belongs to a team, THE System SHALL use team brand voice settings over individual user settings
6. WHEN a User completes onboarding, THE System SHALL present brand voice configuration as an optional step
7. WHEN a User skips brand voice configuration during onboarding, THE System SHALL allow configuration later in profile settings

### Requirement 2

**User Story:** As a content creator, I want the AI to automatically create a blog outline from my episode transcript, so that I have a structured starting point for content creation

#### Acceptance Criteria

1. THE System SHALL provide a buildBlogOutline tool for the Clip Detector Agent to invoke
2. WHEN the buildBlogOutline tool receives a markdown outline, THE System SHALL store the outline in DynamoDB with partition key format tenantId#episodeId and sort key data#blog#outline
3. THE System SHALL validate that the outline parameter contains valid markdown content
4. THE System SHALL set blog status to outline_created when storing the outline
5. THE System SHALL record a timestamp for outline creation in the blog record

### Requirement 3

**User Story:** As a content creator, I want the system to automatically generate a full blog post from the outline, so that I can publish content without manual writing

#### Acceptance Criteria

1. WHEN a blog outline is created, THE System SHALL trigger the Blog Generator Agent autonomously
2. THE System SHALL provide the Blog Generator Agent with episode context including transcript and metadata
3. THE System SHALL provide the Blog Generator Agent with a web search utility for research
4. THE System SHALL provide the Blog Generator Agent with tenant brand voice settings
5. WHEN the Blog Generator Agent completes writing, THE System SHALL store the blog content in DynamoDB with partition key format tenantId#episodeId and sort key data#blog#content
6. THE System SHALL generate blog content in markdown format
7. THE System SHALL set blog status to content_generated when storing the content
8. THE System SHALL record a timestamp for content generation in the blog record

### Requirement 4

**User Story:** As a content creator, I want to retrieve my episode's blog post, so that I can review the generated content

#### Acceptance Criteria

1. THE System SHALL provide a GET endpoint at /episodes/{episodeId}/blog
2. WHEN a User requests GET /episodes/{episodeId}/blog, THE System SHALL return both outline and content in the response
3. THE System SHALL return blog data in JSON format with outline and content fields containing markdown
4. THE System SHALL return HTTP status 404 when no blog exists for the episode
5. THE System SHALL return HTTP status 200 with blog data when the blog exists
6. THE System SHALL include blog status in the response

### Requirement 5

**User Story:** As a content creator, I want to edit the blog outline or content directly, so that I can refine the generated content

#### Acceptance Criteria

1. THE System SHALL provide a PUT endpoint at /episodes/{episodeId}/blog
2. WHEN a User sends PUT /episodes/{episodeId}/blog with outline or content, THE System SHALL update the corresponding fields in DynamoDB
3. THE System SHALL validate that outline and content fields contain valid markdown when provided
4. THE System SHALL update the blog status to outline_edited when outline is modified
5. THE System SHALL update the blog status to content_edited when content is modified
6. THE System SHALL record a timestamp for the last modification
7. THE System SHALL return HTTP status 200 with updated blog data on successful update
8. THE System SHALL return HTTP status 404 when attempting to update a non-existent blog

### Requirement 6

**User Story:** As a content creator, I want to delete a blog post, so that I can remove unwanted content

#### Acceptance Criteria

1. THE System SHALL provide a DELETE endpoint at /episodes/{episodeId}/blog
2. WHEN a User sends DELETE /episodes/{episodeId}/blog, THE System SHALL remove both outline and content records from DynamoDB
3. THE System SHALL return HTTP status 204 on successful deletion
4. THE System SHALL return HTTP status 404 when attempting to delete a non-existent blog

### Requirement 7

**User Story:** As a content creator, I want to regenerate the blog content from an edited outline, so that I can get fresh content based on my changes

#### Acceptance Criteria

1. THE System SHALL provide a POST endpoint at /episodes/{episodeId}/blog
2. WHEN a User sends POST /episodes/{episodeId}/blog with an outline, THE System SHALL store the new outline
3. WHEN a User sends POST /episodes/{episodeId}/blog, THE System SHALL trigger the Blog Generator Agent to regenerate content
4. THE System SHALL set blog status to regenerating during content generation
5. THE System SHALL return HTTP status 202 to indicate accepted for processing
6. THE System SHALL include a status field in the response indicating regeneration has started

### Requirement 8

**User Story:** As a content creator, I want to view the blog outline and content in the UI, so that I can review the generated content visually

#### Acceptance Criteria

1. THE System SHALL provide an episode subpage for blog management in the user interface
2. THE System SHALL display a toggle control to switch between outline view and content view
3. WHEN a User selects outline view, THE System SHALL display the markdown outline
4. WHEN a User selects content view, THE System SHALL display the full blog content
5. THE System SHALL provide a toggle to switch between markdown source and rendered preview
6. WHEN a User selects preview mode, THE System SHALL render the markdown as formatted HTML
7. THE System SHALL display the preview as read-only content

### Requirement 9

**User Story:** As a content creator, I want to regenerate the blog post when I've edited the outline, so that the content reflects my structural changes

#### Acceptance Criteria

1. THE System SHALL display a regenerate button in the blog UI
2. WHEN the outline has been modified, THE System SHALL enable the regenerate button
3. WHEN the outline has not been modified since last generation, THE System SHALL disable the regenerate button
4. WHEN a User clicks the regenerate button, THE System SHALL send a POST request to /episodes/{episodeId}/blog
5. THE System SHALL display a loading indicator during regeneration
6. WHEN regeneration completes, THE System SHALL refresh the displayed content

### Requirement 10

**User Story:** As a content creator, I want to track the status of blog generation, so that I know when content is ready

#### Acceptance Criteria

1. THE System SHALL maintain a status field for each blog with values: outline_created, content_generating, content_generated, outline_edited, content_edited, regenerating, failed
2. THE System SHALL update status to content_generating when the Blog Generator Agent starts
3. THE System SHALL update status to content_generated when generation completes successfully
4. THE System SHALL update status to failed when generation encounters an error
5. THE System SHALL include status in all API responses for blog endpoints
6. THE System SHALL display current status in the user interface
