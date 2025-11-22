import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { UserProfile } from '../types'

export const usersApi = {
  getProfile: () => apiRequest<UserProfile>('/me'),

  updateProfile: async (data: Partial<UserProfile>) => {
    await apiRequest<void>('/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate('GET:/me')
  },

  setActiveTeam: async (teamId: string | null) => {
    await apiRequest<void>('/me/teams', {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    })
    apiCache.invalidate('GET:/me')
    apiCache.invalidate('GET:/teams')
  },
}
