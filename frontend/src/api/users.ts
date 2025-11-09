import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { UserProfile } from '../types'

export const usersApi = {
  getProfile: () => apiRequest<UserProfile>('/me'),

  updateProfile: async (data: Partial<UserProfile>) => {
    const result = await apiRequest<UserProfile>('/me', {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate('GET:/me')
    return result
  },

  setActiveTeam: async (teamId: string | null) => {
    const result = await apiRequest<{
      activeTeamId: string | null
      message: string
      requiresTokenRefresh: boolean
    }>('/me/teams', {
      method: 'POST',
      body: JSON.stringify({ teamId }),
    })
    apiCache.invalidate('GET:/me')
    apiCache.invalidate('GET:/teams')
    return result
  },
}
