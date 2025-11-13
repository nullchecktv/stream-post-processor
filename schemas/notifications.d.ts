import { z } from 'zod';

export {
  NotificationListSchema,
  NotificationPathParamsSchema
} from './notifications.mjs';

import type {
  NotificationListSchema,
  NotificationPathParamsSchema
} from './notifications.mjs';

export type NotificationList = z.infer<typeof NotificationListSchema>;
export type NotificationPathParams = z.infer<typeof NotificationPathParamsSchema>;
