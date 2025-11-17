import { z } from 'zod';

export const UserUpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  preferences: z.object({
    timezone: z.string().optional(),
    notifications: z.boolean().optional()
  }).optional()
});

export const UserSetActiveTeamSchema = z.object({
  teamId: z.string().or(z.null())
});

