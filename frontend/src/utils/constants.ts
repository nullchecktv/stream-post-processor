export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export const PLATFORM_OPTIONS = [
  { value: 'linkedin live', label: 'LinkedIn Live' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
] as const

export const EPISODE_STATUS = {
  DRAFT: 'draft',
  PROCESSING: 'processing',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const

export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/',
  ONBOARDING: '/onboarding',
  EPISODE_DETAIL: '/episodes/:id',
  NOT_FOUND: '*',
} as const
