import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Episode, EpisodeListView } from '../types'

interface ListEpisodesParams {
  nextToken?: string
  limit?: number
}

interface ListEpisodesResponse {
  items: EpisodeListView[]
  nextToken?: string
}

interface CreateEpisodeData {
  title: string
  episodeNumber: number
  description?: string
  airDate?: string
  platforms?: string[]
  themes?: string[]
  seriesName?: string
}

interface CreateEpisodeResponse {
  id: string
}

interface UpdateEpisodeData {
  title?: string
  episodeNumber?: number
  description?: string
  airDate?: string
  platforms?: string[]
  themes?: string[]
  seriesName?: string
}

export const episodesApi = {
  list: (params?: ListEpisodesParams) => {
    const query = new URLSearchParams()
    if (params?.nextToken) query.append('nextToken', params.nextToken)
    if (params?.limit) query.append('limit', params.limit.toString())
    const queryString = query.toString()
    return apiRequest<ListEpisodesResponse>(`/episodes${queryString ? `?${queryString}` : ''}`)
  },

  get: (id: string) => apiRequest<Episode>(`/episodes/${id}`),

  create: async (data: CreateEpisodeData) => {
    const result = await apiRequest<CreateEpisodeResponse>('/episodes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidatePattern('/episodes')
    return result
  },

  update: async (id: string, data: UpdateEpisodeData) => {
    const result = await apiRequest<Episode>(`/episodes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/episodes/${id}`)
    apiCache.invalidatePattern('/episodes?')
    return result
  },
}
