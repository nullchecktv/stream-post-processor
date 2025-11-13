import { z } from 'zod';

export const NotificationListSchema = z.object({
  limit: z.number().int().positive().max(100).optional(),
  cursor: z.string().optional()
});

export const NotificationPathParamsSchema = z.object({
  notificationId: z.string()
});

