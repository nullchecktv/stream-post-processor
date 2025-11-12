import { z } from 'zod'

export const EpisodeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  episodeNumber: z.number().int().positive('Episode number must be positive'),
  description: z.string().max(1000, 'Description must be less than 1000 characters').optional(),
  airDate: z.string().optional(),
  platforms: z.array(z.enum(['linkedin live', 'X', 'twitch', 'youtube'])).optional(),
  themes: z.array(z.string()).optional(),
  seriesName: z.string().max(100, 'Series name must be less than 100 characters').optional(),
})

export const ProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  preferences: z.object({
    timezone: z.string().optional(),
    notifications: z.boolean().optional(),
  }).optional(),
})

export const BrandVoiceSchema = z.object({
  tone: z.string().min(1, 'Tone is required').max(200, 'Tone must be less than 200 characters'),
  writingStyle: z.string().min(1, 'Writing style is required').max(500, 'Writing style must be less than 500 characters'),
})

export const TeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  settings: z.object({
    defaultPlatforms: z.array(z.enum(['linkedin live', 'X', 'twitch', 'youtube'])).optional(),
    timezone: z.string().optional(),
  }).optional(),
})

export type EpisodeFormData = z.infer<typeof EpisodeSchema>
export type ProfileFormData = z.infer<typeof ProfileSchema>
export type TeamFormData = z.infer<typeof TeamSchema>
export type BrandVoiceFormData = z.infer<typeof BrandVoiceSchema>
