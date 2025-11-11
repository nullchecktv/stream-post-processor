import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Quote, QuoteDetail } from '../types'

interface CreateQuoteData {
  text: string
  speaker: string
  timestamp: string
  relevanceScore?: number
  context?: string
  showSpeaker?: boolean
  showEpisodeTitle?: boolean
}

interface CreateQuoteResponse {
  id: string
}

interface ListQuotesParams {
  limit?: number
  cursor?: string
}

interface ListQuotesResponse {
  items: Quote[]
  nextToken?: string
}

interface UpdateQuoteData {
  text?: string
  speaker?: string
  showSpeaker?: boolean
  showEpisodeTitle?: boolean
  status?: 'approved' | 'rejected'
}

interface GenerateQuoteGraphicResponse {
  quoteId: string
  status: string
}

export const quotesApi = {
  create: async (episodeId: string, data: CreateQuoteData) => {
    const result = await apiRequest<CreateQuoteResponse>(`/episodes/${episodeId}/quotes`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/episodes/${episodeId}/quotes`)
    return result
  },

  get: (episodeId: string, quoteId: string) => {
    return apiRequest<QuoteDetail>(`/episodes/${episodeId}/quotes/${quoteId}`)
  },

  list: (episodeId: string, params?: ListQuotesParams) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.cursor) query.append('cursor', params.cursor)
    const queryString = query.toString()
    return apiRequest<ListQuotesResponse>(`/episodes/${episodeId}/quotes${queryString ? `?${queryString}` : ''}`)
  },

  update: async (episodeId: string, quoteId: string, data: UpdateQuoteData) => {
    await apiRequest<void>(`/episodes/${episodeId}/quotes/${quoteId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/episodes/${episodeId}/quotes`)
  },

  delete: async (episodeId: string, quoteId: string) => {
    await apiRequest<void>(`/episodes/${episodeId}/quotes/${quoteId}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/episodes/${episodeId}/quotes`)
  },

  generateQuoteGraphic: async (episodeId: string, quoteId: string) => {
    return apiRequest<GenerateQuoteGraphicResponse>(`/episodes/${episodeId}/quotes/${quoteId}/generate`, {
      method: 'POST',
    })
  },
}
