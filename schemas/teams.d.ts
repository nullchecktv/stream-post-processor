import { z } from 'zod';

export {
  TeamStatus,
  TEAM_STATUS,
  MembershipStatus,
  MEMBERSHIP_STATUS,
  MemberRole,
  MEMBER_ROLE,
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamAddMemberSchema,
  TeamUpdateMemberRoleSchema,
  TeamPathParamsSchema,
  TeamPathParamsWithUserSchema
} from './teams.mjs';

import type {
  TeamStatus,
  MembershipStatus,
  MemberRole,
  TeamCreateSchema,
  TeamUpdateSchema,
  TeamAddMemberSchema,
  TeamUpdateMemberRoleSchema,
  TeamPathParamsSchema,
  TeamPathParamsWithUserSchema
} from './teams.mjs';

export type TeamStatusType = z.infer<typeof TeamStatus>;
export type MembershipStatusType = z.infer<typeof MembershipStatus>;
export type MemberRoleType = z.infer<typeof MemberRole>;
export type TeamCreate = z.infer<typeof TeamCreateSchema>;
export type TeamUpdate = z.infer<typeof TeamUpdateSchema>;
export type TeamAddMember = z.infer<typeof TeamAddMemberSchema>;
export type TeamUpdateMemberRole = z.infer<typeof TeamUpdateMemberRoleSchema>;
export type TeamPathParams = z.infer<typeof TeamPathParamsSchema>;
export type TeamPathParamsWithUser = z.infer<typeof TeamPathParamsWithUserSchema>;
