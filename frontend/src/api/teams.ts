import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Team } from '../types'

export const teamsApi = {
  list: () => apiRequest<Team[]>('/teams'),

  get: (id: string) => apiRequest<Team>(`/teams/${id}`),

  create: async (data: Partial<Team>) => {
    const result = await apiRequest<Team>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidate('GET:/teams')
    apiCache.invalidate('GET:/me')
    return result
  },

  update: async (id: string, data: Partial<Team>) => {
    const result = await apiRequest<Team>(`/teams/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/teams/${id}`)
    apiCache.invalidate('GET:/teams')
    return result
  },

  delete: async (id: string) => {
    const result = await apiRequest<void>(`/teams/${id}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/teams/${id}`)
    apiCache.invalidate('GET:/teams')
    apiCache.invalidate('GET:/me')
    return result
  },
}
