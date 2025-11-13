import { z } from 'zod';

export {
  PlanCreateSchema,
  PlanUpdateSchema,
  PlanPathParamsSchema,
  RecommendationsSchema
} from './plans.mjs';

import type {
  PlanCreateSchema,
  PlanUpdateSchema,
  PlanPathParamsSchema,
  RecommendationsSchema
} from './plans.mjs';

export type PlanCreate = z.infer<typeof PlanCreateSchema>;
export type PlanUpdate = z.infer<typeof PlanUpdateSchema>;
export type PlanPathParams = z.infer<typeof PlanPathParamsSchema>;
export type Recommendations = z.infer<typeof RecommendationsSchema>;
