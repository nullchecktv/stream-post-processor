# Requirements Document

## Introduction

This specification defines the requirements for centralizing type definitions and normalizing status enumerations across the livestream post-production platform. The system currently has scattered schema definitions and inconsistent status values across different entity types (episodes, clips, quotes, tracks, transcripts, blogs, teams, invitations, notifications). This refactoring will create a single source of truth for all schemas in Zod, export TypeScript types for frontend consumption, and establish consistent, human-readable status progressions for all entities.

## Glossary

- **Schema**: A Zod schema definition that validates data structure and types
- **DTO (Data Transfer Object)**: A TypeScript type derived from a Zod schema used for type safety
- **Status Enum**: A set of predefined status values that an entity can have
- **Status Progression**: The valid transitions between status values for an entity
- **Frontend**: The React TypeScript application that consumes API data
- **Backend**: The Node.js Lambda functions that process and validate data
- **Zod**: A TypeScript-first schema validation library
- **Title Case**: Capitalization where each word starts with a capital letter (e.g., "Ready For Review")

## Requirements

### Requirement 1: Centralized Schema Management

**User Story:** As a developer, I want all schemas defined in a single location organized by resource type, so that I can maintain consistency and avoid duplication across the codebase.

#### Acceptance Criteria

1. THE System SHALL create a `schemas/` directory at the repository root
2. THE System SHALL create separate schema files for each resource type: `episodes.mjs`, `clips.mjs`, `quotes.mjs`, `tracks.mjs`, `transcripts.mjs`, `blogs.mjs`, `teams.mjs`, `users.mjs`, `invitations.mjs`, `notifications.mjs`, `plans.mjs`
3. THE System SHALL define all entity schemas using Zod within their respective resource files
4. THE System SHALL export TypeScript types from Zod schemas for frontend consumption
5. THE System SHALL create a barrel export file `schemas/index.mjs` that re-exports all schemas
6. THE System SHALL replace all existing JSON Schema definitions in `functions/utils/schemas.mjs` with imports from the centralized schemas

### Requirement 2: Status Enumeration Normalization

**User Story:** As a developer, I want all status values to be consistent and human-readable, so that the codebase is easier to understand and maintain.

#### Acceptance Criteria

1. THE System SHALL define status enums in Title Case format for all entity types
2. THE System SHALL map all existing lowercase status values to Title Case equivalents
3. THE System SHALL create status enum definitions using Zod for validation
4. THE System SHALL export status enums as TypeScript types for frontend use
5. THE System SHALL ensure status values are descriptive and self-documenting

### Requirement 3: Episode Status Standardization

**User Story:** As a developer, I want episode statuses to follow a clear progression, so that I can track episode lifecycle consistently.

#### Acceptance Criteria

1. THE System SHALL define episode status enum with values: "Draft", "Planning", "Ready", "Processing", "Published", "Archived"
2. THE System SHALL document valid status transitions for episodes
3. THE System SHALL update all episode-related code to use the new status enum
4. THE System SHALL migrate existing episode status values to the new format (e.g., "plan_added" → "Planning", "Ready for Clip Gen" → "Ready")
5. THE System SHALL validate episode status transitions in update operations

### Requirement 4: Clip Status Standardization

**User Story:** As a developer, I want clip statuses to reflect the clip generation workflow, so that I can track clip processing accurately.

#### Acceptance Criteria

1. THE System SHALL define clip status enum with values: "Proposed", "Processing", "Created", "Failed"
2. THE System SHALL document valid status transitions for clips
3. THE System SHALL update all clip-related code to use the new status enum (e.g., "detected" → "Proposed")
4. THE System SHALL replace CLIP_STATUS constants with centralized enum
5. THE System SHALL validate clip status transitions using the centralized schema

### Requirement 5: Quote Status Standardization

**User Story:** As a developer, I want quote statuses to track the quote lifecycle from proposal to publication, so that I can manage quote workflows effectively.

#### Acceptance Criteria

1. THE System SHALL define quote status enum with values: "Proposed", "Processing", "Created", "Failed", "Edited"
2. THE System SHALL document valid status transitions for quotes
3. THE System SHALL update all quote-related code to use the new status enum
4. THE System SHALL replace QUOTE_STATUS constants with centralized enum
5. THE System SHALL validate quote status transitions using the centralized schema

### Requirement 6: Track Status Standardization

**User Story:** As a developer, I want track statuses to reflect the upload and processing workflow, so that I can monitor video track processing.

#### Acceptance Criteria

1. THE System SHALL define track status enum with values: "Uploading", "Uploaded", "Processing", "Processed", "Failed"
2. THE System SHALL document valid status transitions for tracks
3. THE System SHALL update all track-related code to use the new status enum
4. THE System SHALL ensure track status updates are validated against the enum
5. THE System SHALL maintain backward compatibility during migration

### Requirement 7: Blog Status Standardization

**User Story:** As a developer, I want blog statuses to track the content generation workflow, so that I can manage blog post creation effectively.

#### Acceptance Criteria

1. THE System SHALL define blog status enum with values: "Proposed", "Processing", "Created", "Failed", "Edited"
2. THE System SHALL document valid status transitions for blogs
3. THE System SHALL update all blog-related code to use the new status enum (e.g., "outline_created" → "Proposed", "content_generating" → "Processing", "content_generated" → "Created")
4. THE System SHALL ensure blog status values are human-readable
5. THE System SHALL validate blog status transitions in update operations

### Requirement 8: Team and Membership Status Standardization

**User Story:** As a developer, I want team and membership statuses to be consistent, so that I can manage team lifecycles and member relationships clearly.

#### Acceptance Criteria

1. THE System SHALL define team status enum with values: "Active", "Archived"
2. THE System SHALL define membership status enum with values: "Active", "Pending", "Removed"
3. THE System SHALL document valid status transitions for teams and memberships
4. THE System SHALL update all team-related code to use the new status enums
5. THE System SHALL ensure team and membership status values are Title Case

### Requirement 9: Invitation Status Standardization

**User Story:** As a developer, I want invitation statuses to track the invitation lifecycle, so that I can manage team invitations effectively.

#### Acceptance Criteria

1. THE System SHALL define invitation status enum with values: "Pending", "Accepted", "Declined", "Cancelled", "Expired"
2. THE System SHALL document valid status transitions for invitations
3. THE System SHALL update all invitation-related code to use the new status enum
4. THE System SHALL ensure invitation status transitions are validated
5. THE System SHALL maintain TTL-based expiration logic with status updates

### Requirement 10: Frontend Type Integration

**User Story:** As a frontend developer, I want to import types directly from the backend schemas, so that frontend and backend types are always synchronized.

#### Acceptance Criteria

1. THE System SHALL create TypeScript declaration files (`.d.ts`) for each schema file that re-export runtime schemas and define inferred types
2. THE System SHALL export all Zod schemas as TypeScript types using `z.infer` in the declaration files
3. THE System SHALL ensure declaration files do not duplicate schema definitions but reference the `.mjs` files
4. THE System SHALL create a barrel export file for easy frontend imports
5. THE System SHALL update frontend code to import types from the centralized schemas
6. THE System SHALL remove duplicate type definitions from `frontend/src/types/index.ts`
7. THE System SHALL ensure frontend build process can access the schemas directory

### Requirement 11: Validation Consistency

**User Story:** As a developer, I want all validation to use the centralized schemas, so that validation logic is consistent across all functions.

#### Acceptance Criteria

1. THE System SHALL update all Lambda functions to import schemas from the centralized location
2. THE System SHALL replace inline Zod schemas with centralized schema imports
3. THE System SHALL ensure all API endpoints validate requests using centralized schemas
4. THE System SHALL maintain AWS Lambda Powertools validator compatibility
5. THE System SHALL update all tool definitions to use centralized schemas

### Requirement 12: Documentation and Migration

**User Story:** As a developer, I want clear documentation of all status progressions and schema changes, so that I can understand the system's data model.

#### Acceptance Criteria

1. THE System SHALL create a status progression diagram for each entity type
2. THE System SHALL document all schema changes in a migration guide
3. THE System SHALL provide examples of using the centralized schemas
4. THE System SHALL document the mapping from old status values to new values
5. THE System SHALL update relevant steering files with schema usage patterns

