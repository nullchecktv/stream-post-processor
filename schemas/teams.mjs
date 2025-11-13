import { z } from 'zod';
import { Platform, BrandingSchema } from './common.mjs';

export const TeamStatus = z.enum(['Active', 'Archived']);

export const TEAM_STATUS = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived'
};

export const MembershipStatus = z.enum(['Active', 'Pending', 'Removed']);

export const MEMBERSHIP_STATUS = {
  ACTIVE: 'Active',
  PENDING: 'Pending',
  REMOVED: 'Removed'
};

export const MemberRole = z.enum(['owner', 'administrator', 'member']);

export const MEMBER_ROLE = {
  OWNER: 'owner',
  ADMINISTRATOR: 'administrator',
  MEMBER: 'member'
};

export const TeamCreateSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  settings: z.object({
    defaultPlatforms: z.array(Platform).optional(),
    timezone: z.string().optional()
  }).optional(),
  branding: BrandingSchema.optional()
});

export const TeamUpdateSchema = TeamCreateSchema.partial();

export const TeamAddMemberSchema = z.object({
  email: z.string().email(),
  role: MemberRole.exclude(['owner']).default('member')
});

export const TeamUpdateMemberRoleSchema = z.object({
  role: MemberRole.exclude(['owner'])
});

export const TeamPathParamsSchema = z.object({
  teamId: z.string().min(1)
});

export const TeamPathParamsWithUserSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1)
});

export const TeamRemoveMemberQuerySchema = z.object({
  confirmDelete: z.enum(['true', 'false']).optional()
});
