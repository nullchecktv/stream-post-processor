# Implementation Plan

- [x] 1. Create schemas directory structure and common schemas





  - Create `schemas/` directory at repository root
  - Create `schemas/common.mjs` with shared schemas (Platform, BrandingSchema, TimestampSchema, StatusHistoryEntrySchema)
  - Create `schemas/index.mjs` barrel export file
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 2. Implement episode schemas with normalized statuses





  - Create `schemas/episodes.mjs` with EpisodeStatus enum andnstants
  - Define EPISODE_STATUS_TRANSITIONS map
  - Create EpisodeCreateSchema, EpisodeUpdateSchema, EpisodeStatusUpdateSchema, EpisodePathParamsSchema
  - Export TypeScript types using z.infer
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 3.1, 3.2_

- [x] 3. Implement clip schemas with normalized statuses





  - Create `schemas/clips.mjs` with ClipStatus enum ("Proposed", "Processing", "Created", "Failed")
  - Define CLIP_STATUS_TRANSITIONS map
  - Create ClipSegmentSchema, ClipStatusUpdateSchema, ClipGenerateSchema, ClipPathParamsSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 4.1, 4.2_

- [x] 4. Implement quote schemas with normalized statuses





  - Create `schemas/quotes.mjs` with QuoteStatus enum ("Proposed", "Processing", "Created", "Failed", "Edited")
  - Define QUOTE_STATUS_TRANSITIONS map
  - Create QuoteCreateSchema, QuoteUpdateSchema, QuotePathParamsSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 5.1, 5.2_

- [x] 5. Implement track schemas with normalized statuses





  - Create `schemas/tracks.mjs` with TrackStatus enum ("Uploading", "Uploaded", "Processing", "Processed", "Failed")
  - Define TRACK_STATUS_TRANSITIONS map
  - Create TrackCreateSchema, TrackUpdateSchema, TrackPathParamsSchema, TrackSignPartsSchema, TrackCompleteSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 6.1, 6.2_

- [x] 6. Implement blog schemas with normalized statuses





  - Create `schemas/blogs.mjs` with BlogStatus enum ("Proposed", "Processing", "Created", "Failed", "Edited")
  - Define BLOG_STATUS_TRANSITIONS map
  - Create BlogUpdateSchema, BlogRegenerateSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 7.1, 7.2_

- [x] 7. Implement team and membership schemas with normalized statuses





  - Create `schemas/teams.mjs` with TeamStatus enum ("Active", "Archived")
  - Create MembershipStatus enum ("Active", "Pending", "Removed")
  - Create MemberRole enum
  - Create TeamCreateSchema, TeamUpdateSchema, TeamAddMemberSchema, TeamUpdateMemberRoleSchema, TeamPathParamsSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 8.1, 8.2, 8.3_

- [x] 8. Implement invitation schemas with normalized statuses





  - Create `schemas/invitations.mjs` with InvitationStatus enum ("Pending", "Accepted", "Declined", "Cancelled", "Expired")
  - Define INVITATION_STATUS_TRANSITIONS map
  - Create InvitationDecisionSchema, InvitationPathParamsSchema
  - Export TypeScript types
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3, 9.1, 9.2_

- [x] 9. Implement remaining entity schemas





  - Create `schemas/transcripts.mjs` with TranscriptUploadSchema
  - Create `schemas/users.mjs` with UserUpdateProfileSchema, UserSetActiveTeamSchema
  - Create `schemas/notifications.mjs` with NotificationListSchema, NotificationPathParamsSchema
  - Create `schemas/plans.mjs` with PlanCreateSchema, PlanUpdateSchema, PlanPathParamsSchema, RecommendationsSchema
  - Export TypeScript types for all schemas
  - _Requirements: 1.3, 1.4, 2.1, 2.2, 2.3_

- [x] 10. Update barrel export with all schemas




  - Update `schemas/index.mjs` to export all entity schemas
  - Ensure all status enums and constants are exported
  - Verify barrel export structure
  - _Requirements: 1.5_

- [x] 11. Remove functions/utils/schemas.mjs and migrate to centralized schemas





  - Update all Lambda functions to import schemas directly from `schemas/index.mjs`
  - Replace JSON Schema validation with Zod schema validation using AWS Lambda Powertools
  - Update imports in all episode, track, transcript, team, clip, user, notification, invitation, plan, blog, and quote functions
  - Delete `functions/utils/schemas.mjs` after all migrations are complete
  - Verify all functions build and validate correctly with new imports
  - _Requirements: 1.6, 11.1_

- [x] 12. Update clip utility functions with new status constants





  - Update `functions/utils/clips.mjs` to import CLIP_STATUS from centralized schemas
  - Replace existing CLIP_STATUS constants with imports
  - Update CLIP_STATUS_TRANSITIONS to use new Title Case values
  - Update all status string literals to use CLIP_STATUS constants
  - Update validateStatusTransition to work with Title Case statuses
  - _Requirements: 2.1, 2.2, 4.3, 4.4, 11.2_

- [x] 13. Update quote utility functions with new status constants





  - Update `functions/utils/quotes.mjs` to import QUOTE_STATUS from centralized schemas
  - Replace existing QUOTE_STATUS constants with imports
  - Update all status string literals to use QUOTE_STATUS constants
  - Update validateQuoteStatus to work with Title Case statuses
  - _Requirements: 2.1, 2.2, 5.3, 5.4, 11.2_

- [x] 14. Update episode Lambda functions with new status values





  - Update `functions/episodes/create-episode.mjs` to use EPISODE_STATUS.DRAFT
  - Update `functions/episodes/update-episode-status.mjs` to validate status transitions
  - Update `functions/episodes/get-episode.mjs` to return Title Case statuses
  - Update `functions/episodes/list-episodes.mjs` to return Title Case statuses
  - Update `functions/episodes/get-status-history.mjs` to handle Title Case statuses
  - _Requirements: 3.3, 3.5, 11.2_

- [x] 15. Update clip Lambda functions with new status values





  - Update `functions/clips/list-clips.mjs` to return Title Case statuses
  - Update `functions/clips/get-clip.mjs` to return Title Case statuses
  - Update `functions/clips/update-clip-status.mjs` to use CLIP_STATUS constants and validate transitions
  - Update `functions/clips/generate-clip.mjs` to use CLIP_STATUS constants
  - Update `functions/clips/delete-clip.mjs` if it references statuses
  - _Requirements: 4.3, 4.5, 11.2_

- [x] 16. Update quote Lambda functions with new status values





  - Update `functions/quotes/create-quote.mjs` to use QUOTE_STATUS.PROPOSED
  - Update `functions/quotes/get-quote.mjs` to return Title Case statuses
  - Update `functions/quotes/update-quote.mjs` to use QUOTE_STATUS constants and validate transitions
  - Update `functions/quotes/generate-graphic.mjs` to use QUOTE_STATUS constants
  - Update `functions/quotes/list-quotes.mjs` to return Title Case statuses
  - _Requirements: 5.3, 5.5, 11.2_

- [x] 17. Update blog Lambda functions with new status values





  - Update `functions/agents/blog-generator.mjs` to use BLOG_STATUS constants
  - Update `functions/blogs/get-blog.mjs` to return Title Case statuses
  - Update `functions/blogs/update-blog.mjs` to use BLOG_STATUS constants
  - Update `functions/blogs/regenerate-blog.mjs` to use BLOG_STATUS constants
  - _Requirements: 7.3, 7.5, 11.2_

- [x] 18. Update track Lambda functions with new status values





  - Update `functions/tracks/create-track-upload.mjs` to use TRACK_STATUS.UPLOADING
  - Update `functions/tracks/complete-track-upload.mjs` to use TRACK_STATUS.UPLOADED
  - Update `functions/tracks/list-tracks.mjs` to return Title Case statuses
  - Update `functions/events/start-preprocessing.mjs` to use TRACK_STATUS.PROCESSING
  - Update `functions/events/preprocessing-completed.mjs` to use TRACK_STATUS.PROCESSED
  - Update `functions/events/preprocessing-failed.mjs` to use TRACK_STATUS.FAILED
  - _Requirements: 6.3, 6.4, 11.2_

- [x] 19. Update team Lambda functions with new status values





  - Update `functions/teams/create-team.mjs` to use TEAM_STATUS.ACTIVE
  - Update `functions/teams/update-team.mjs` to use TEAM_STATUS constants
  - Update `functions/teams/list-teams.mjs` to return Title Case statuses
  - Update `functions/teams/add-member.mjs` to use MEMBERSHIP_STATUS.ACTIVE
  - Update `functions/teams/update-member-role.mjs` to handle membership statuses
  - Update `functions/teams/remove-member.mjs` to use MEMBERSHIP_STATUS.REMOVED
  - _Requirements: 8.4, 11.2_

- [x] 20. Update invitation Lambda functions with new status values





  - Update `functions/invitations/create-invitation.mjs` to use INVITATION_STATUS.PENDING
  - Update `functions/invitations/accept-invitation.mjs` to use INVITATION_STATUS.ACCEPTED
  - Update `functions/invitations/decline-invitation.mjs` to use INVITATION_STATUS.DECLINED
  - Update `functions/invitations/cancel-invitation.mjs` to use INVITATION_STATUS.CANCELLED
  - Update invitation expiration logic to use INVITATION_STATUS.EXPIRED
  - _Requirements: 9.3, 9.4, 11.2_

- [x] 21. Update AI agent functions with new status values





  - Update `functions/agents/clip-detector.mjs` to use CLIP_STATUS.PROPOSED and EPISODE_STATUS constants
  - Update `functions/agents/blog-generator.mjs` to use BLOG_STATUS constants
  - Update `functions/tools/create-clips.mjs` to use CLIP_STATUS.PROPOSED
  - Update `functions/tools/create-quotes.mjs` to use QUOTE_STATUS.PROPOSED
  - Update `functions/tools/set-plan-recommendations.mjs` to use EPISODE_STATUS constants
  - _Requirements: 11.2_

- [x] 22. Update video processing functions with new status values





  - Update `functions/video/segment-extractor.mjs` to use CLIP_STATUS constants
  - Update `functions/video/clip-stitcher.mjs` to use CLIP_STATUS constants
  - Update Step Functions workflow definition if it references statuses
  - _Requirements: 11.2_

- [ ] 23. Configure frontend build to access schemas directory





  - Update `frontend/vite.config.ts` to add alias for @schemas
  - Update `frontend/tsconfig.json` to add path mapping for @schemas
  - Update `frontend/package.json` if needed for schema imports
  - Verify frontend can import from schemas directory
  - _Requirements: 10.5_

- [x] 24. Update frontend types to import from centralized schemas





  - Update `frontend/src/types/index.ts` to import types from @schemas
  - Remove duplicate type definitions (EpisodeStatus, ClipStatus, Platform, etc.)
  - Keep frontend-specific types that don't exist in backend schemas
  - Update all type references throughout frontend code
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 25. Update frontend status display logic





  - Update `frontend/src/components/episodes/EpisodeCard.tsx` to display Title Case statuses
  - Update `frontend/src/components/episodes/ClipCard.tsx` to display Title Case statuses
  - Update `frontend/src/pages/EpisodeDetailPage.tsx` to display Title Case statuses
  - Update `frontend/src/pages/EpisodeQuotesPage.tsx` to display Title Case statuses
  - Update `frontend/src/pages/QuoteDetailPage.tsx` to display Title Case statuses
  - Update any status badge or pill components to use Title Case
  - _Requirements: 10.3_

- [x] 26. Update OpenAPI specification with new status enums





  - Update `openapi.yaml` episode status enum to Title Case values
  - Update clip status enum to Title Case values
  - Update quote status enum to Title Case values
  - Update track status enum to Title Case values
  - Update blog status enum to Title Case values
  - Update team and membership status enums to Title Case values
  - Update invitation status enum to Title Case values
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 27. Create data migration script for existing status values





  - Create `scripts/migrate-statuses.mjs` script
  - Implement DynamoDB scan and update logic for episodes
  - Implement status migration for clips
  - Implement status migration for quotes
  - Implement status migration for tracks
  - Implement status migration for blogs
  - Implement status migration for teams and memberships
  - Implement status migration for invitations
  - Add dry-run mode for testing
  - Add progress logging
  - _Requirements: 3.4, 12.4_

- [x] 28. Write unit tests for schema validation






  - Test episode schema validation with valid and invalid data
  - Test clip schema validation with valid and invalid data
  - Test quote schema validation with valid and invalid data
  - Test status enum validation for all entity types
  - Test status transition validation logic
  - Test TypeScript type inference
  - _Requirements: 11.3_

- [ ]* 29. Write integration tests for status updates
  - Test episode status update endpoint with new statuses
  - Test clip status update endpoint with new statuses
  - Test quote status update endpoint with new statuses
  - Test invalid status transitions return appropriate errors
  - Test frontend can display new status values
  - _Requirements: 11.3_

- [x] 30. Update documentation and cleanup





  - Create status progression diagrams for each entity type
  - Document status migration mapping in README or docs
  - Update steering files with schema usage patterns
  - Remove old status constants from codebase
  - Remove duplicate schema definitions
  - Verify all imports are correct
  - Run full test suite
  - _Requirements: 12.1, 12.2, 12.3, 12.5_

