import { z } from 'zod';

export const PlanCreateSchema = z.object({
  objectives: z.array(z.string().min(1)),
  concepts: z.array(z.string().min(1)),
  notes: z.string().max(2000).optional()
});

export const PlanUpdateSchema = z.object({
  objectives: z.array(z.string().min(1)),
  concepts: z.array(z.string().min(1)),
  notes: z.string().max(2000).optional()
});

export const PlanPathParamsSchema = z.object({
  episodeId: z.string()
});

export const RecommendationsSchema = z.object({
  suggestedFlow: z.string()
    .regex(/^flowchart/)
    .describe('A Mermaid flowchart showing the proposed episode structure and progression'),
  proposedTitle: z.string()
    .min(10)
    .max(200)
    .describe('A compelling title for the episode'),
  proposedDescription: z.string()
    .min(50)
    .max(1000)
    .describe('A promotional description for the episode'),
  keyLearningMoments: z.array(z.string().min(1))
    .min(1)
    .describe('Array of key learning moments or takeaways from the episode'),
  detailedOutline: z.array(z.object({
    section: z.string().describe('The name/title of this section'),
    duration: z.string().describe('Estimated duration'),
    talkingPoints: z.array(z.string()).describe('Specific topics to discuss in this section'),
    demoArtifacts: z.array(z.string()).optional().describe('Code examples, diagrams, or other artifacts to show')
  }))
    .min(3)
    .describe('Detailed section-by-section breakdown of the episode')
});

