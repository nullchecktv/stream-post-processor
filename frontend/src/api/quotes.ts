import { apiRequest, ApiError } from './client'
import { apiCache } from '../utils/cache'
import type { Quote, QuoteDetail, SpeakerValidationError } from '../types'
import type { QuoteCreate, QuoteUpdate } from '@schemas/quotes'

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

interface GenerateQuoteGraphicResponse {
  quoteId: string
  status: string
}

function isSpeakerValidationError(error: unknown): error is ApiError & { details: SpeakerValidationError } {
  return error instanceof ApiError &&
         error.errorType === 'InvalidSpeaker' &&
         error.details !== undefined &&
         typeof error.details === 'object' &&
         error.details !== null &&
         'invalidSpeakers' in error.details &&
         'validSpeakers' in error.details
}

function handleSpeakerValidationError(error: unknown): never {
  if (isSpeakerValidationError(error)) {
    const details = error.details as SpeakerValidationError
    const invalidList = details.invalidSpeakers.join(', ')
    const validList = details.validSpeakers.join(', ')
    throw new ApiError(
      error.status,
      `Invalid speaker: ${invalidList}. Valid speakers for this episode: ${validList}`,
      error.errorType,
      details
    )
  }
  throw error
}

export const quotesApi = {
  create: async (episodeId: string, data: QuoteCreate) => {
    try {
      const result = await apiRequest<CreateQuoteResponse>(`/episodes/${episodeId}/quotes`, {
        method: 'POST',
        body: JSON.stringify(data),
      })
      apiCache.invalidate(`GET:/episodes/${episodeId}/quotes`)
      return result
    } catch (error) {
      handleSpeakerValidationError(error)
    }
  },

  get: (episodeId: string, quoteId: string, skipCache = false) => {
    return apiRequest<QuoteDetail>(`/episodes/${episodeId}/quotes/${quoteId}`, { skipCache })
  },

  list: (episodeId: string, params?: ListQuotesParams) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.cursor) query.append('cursor', params.cursor)
    const queryString = query.toString()
    return apiRequest<ListQuotesResponse>(`/episodes/${episodeId}/quotes${queryString ? `?${queryString}` : ''}`)
  },

  update: async (episodeId: string, quoteId: string, data: QuoteUpdate) => {
    try {
      await apiRequest<void>(`/episodes/${episodeId}/quotes/${quoteId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      })
      apiCache.invalidate(`GET:/episodes/${episodeId}/quotes`)
    } catch (error) {
      handleSpeakerValidationError(error)
    }
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
