# Requirements Document

## Introduction

This feature enables the extraction of memorable quotes from episode transcripts and the generation of branded quote graphics for social media sharing. The AI agent analyzes transcripts to identify meaningful quotes that align with episode themes, stores them in the database, and generates visually appealing 16:9 graphics using team branding.

## Glossary

- **Quote System**: The backend system that stores and manages extracted quotes from episode transcripts
- **Clip Detector Agent**: The AI agent that analyzes transcripts to detect clips and quotes
- **Quote Tool**: The agent tool that saves detected quotes to DynamoDB
- **Quote Graphics Generator**: The Lambda function that creates branded images from quotes using Sharp
- **Sharp Layer**: A Lambda layer containing the Sharp image processing library
- **Team Branding**: Theme colors and fonts configured at the team or user profile level
- **Quote API**: REST API endpoints for managing quotes (create, list, update, delete)
- **Quote Assets UI**: Frontend interface for viewing and managing quote graphics under episodes

## Requirements

### Requirement 1

**User Story:** As a content creator, I want the AI agent to automatically extract memorable quotes from my episode transcripts, so that I can quickly create shareable social media graphics without manual transcript review.

#### Acceptance Criteria

1. WHEN the Clip Detector Agent analyzes a transcript, THE Quote System SHALL provide a tool for saving detected quotes
2. THE Quote Tool SHALL store quotes in DynamoDB with partition key `{tenantId}#{episodeId}` and sort key `data#quote#{quoteId}`
3. THE Quote System SHALL create GSI entries with `GSI1PK = {tenantId}#quotes` and `GSI1SK = {timestamp}#{episodeId}#{quoteId}`
4. THE Quote Tool SHALL accept quote text, speaker attribution, timestamp, relevance score, showSpeaker flag, and showEpisodeTitle flag as input parameters
5. THE Quote System SHALL generate unique quote identifiers using UUID format
6. THE Quote Tool SHALL default showSpeaker and showEpisodeTitle flags to true when not specified

### Requirement 2

**User Story:** As a content creator, I want to configure my team's brand colors and fonts, so that all generated quote graphics maintain consistent visual branding.

#### Acceptance Criteria

1. THE Team Management System SHALL store theme colors (primary, secondary, background, text) in team metadata branding field
2. THE Team Management System SHALL store font family preference in team metadata branding field
3. THE User Profile System SHALL store personal theme colors and font preferences in user profile branding field
4. WHEN a user updates branding settings, THE System SHALL validate color values as valid hex codes
5. THE Quote Graphics Generator SHALL provide default theme values when tenant branding is not configured

### Requirement 3

**User Story:** As a content creator, I want quote graphics automatically generated in 16:9 aspect ratio with my branding, so that I can immediately share them on social media platforms.

#### Acceptance Criteria

1. THE Quote Graphics Generator SHALL create images with 1920x1080 pixel dimensions (16:9 aspect ratio)
2. THE Quote Graphics Generator SHALL apply a 20-pixel border in the primary brand color around the graphic
3. THE Quote Graphics Generator SHALL apply tenant theme colors to background, text, and accent elements
4. THE Quote Graphics Generator SHALL use the configured font family for quote text
5. THE Quote Graphics Generator SHALL conditionally display speaker name based on showSpeaker flag
6. THE Quote Graphics Generator SHALL conditionally display episode title based on showEpisodeTitle flag
7. THE Quote Graphics Generator SHALL NOT display timestamp in the graphic
8. THE Quote Graphics Generator SHALL store generated images in S3 with key pattern `{tenantId}/{episodeId}/quotes/{quoteId}.png`

### Requirement 4

**User Story:** As a content creator, I want to manage quotes through API endpoints, so that I can create, list, update, and delete quotes programmatically or through the UI.

#### Acceptance Criteria

1. THE Quote API SHALL provide a POST endpoint at `/episodes/{episodeId}/quotes` for creating quotes
2. THE Quote API SHALL provide a GET endpoint at `/episodes/{episodeId}/quotes` for listing quotes with pagination
3. THE Quote API SHALL provide a PUT endpoint at `/episodes/{episodeId}/quotes/{quoteId}` for updating quote metadata
4. THE Quote API SHALL provide a DELETE endpoint at `/episodes/{episodeId}/quotes/{quoteId}` for removing quotes
5. WHEN a quote is deleted, THE Quote API SHALL remove both the DynamoDB record and the S3 graphic file
6. WHEN quote metadata is updated, THE Quote API SHALL regenerate the graphic with the same S3 key
7. THE Quote API SHALL overwrite existing graphics when regenerating after metadata updates

### Requirement 5

**User Story:** As a content creator, I want to view and manage quote graphics in a dedicated episode quotes page, so that I can easily access and organize my shareable content assets.

#### Acceptance Criteria

1. THE Episode UI SHALL provide a "Quotes" navigation link in the episode sidebar section
2. THE Quotes Page SHALL display at route `/episodes/{episodeId}/quotes`
3. THE Quotes Page SHALL show quote cards with thumbnail previews of generated graphics
4. THE Quotes Page SHALL display quote text, speaker, and timestamp for each quote
5. THE Quotes Page SHALL provide download buttons for quote graphic images
6. THE Quotes Page SHALL provide delete actions for removing unwanted quotes

### Requirement 6

**User Story:** As a team administrator, I want to configure team branding in the team settings page, so that all team members' quote graphics use consistent brand colors and fonts.

#### Acceptance Criteria

1. THE Team Settings UI SHALL provide color picker inputs for primary, secondary, background, and text colors
2. THE Team Settings UI SHALL provide a font family dropdown with common web-safe fonts
3. THE Team Settings UI SHALL display a preview of the branding configuration
4. WHEN team branding is updated, THE Team Settings UI SHALL save changes to the team metadata
5. THE Team Settings UI SHALL validate color inputs before saving

### Requirement 7

**User Story:** As a content creator, I want to configure personal branding preferences in my profile, so that my quote graphics can use custom colors and fonts that override team defaults.

#### Acceptance Criteria

1. THE User Profile UI SHALL provide optional branding configuration fields
2. THE User Profile UI SHALL indicate when personal branding overrides team defaults
3. THE User Profile UI SHALL provide color picker inputs for theme colors
4. THE User Profile UI SHALL provide a font family selection dropdown
5. WHEN personal branding is saved, THE User Profile System SHALL store preferences in user profile metadata

### Requirement 8

**User Story:** As a content creator, I want the quote detection to focus on meaningful content, so that only high-quality, shareable quotes are extracted from my episodes.

#### Acceptance Criteria

1. THE Clip Detector Agent SHALL analyze quotes for relevance to episode themes
2. THE Clip Detector Agent SHALL prioritize quotes that provide standalone value
3. THE Clip Detector Agent SHALL exclude quotes that require additional context to understand
4. THE Clip Detector Agent SHALL assign relevance scores to detected quotes
5. THE Quote System SHALL store quotes with scores above a minimum threshold
