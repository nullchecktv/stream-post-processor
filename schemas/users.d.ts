import { z } from 'zod';

export {
  UserUpdateProfileSchema,
  UserSetActiveTeamSchema
} from './users.mjs';

import type {
  UserUpdateProfileSchema,
  UserSetActiveTeamSchema
} from './users.mjs';

export type UserUpdateProfile = z.infer<typeof UserUpdateProfileSchema>;
export type UserSetActiveTeam = z.infer<typeof UserSetActiveTeamSchema>;
