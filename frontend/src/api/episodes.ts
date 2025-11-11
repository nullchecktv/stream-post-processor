import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Episode, EpisodeListView, EpisodeDetail, StatusHistoryEntry, ClipListView, EpisodePlan, ClipOrientation } from '../types'

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

interface EpisodeStatusResponse {
  episodeId: string
  currentStatus: string
  statusHistory: StatusHistoryEntry[]
  updatedAt: string
}

interface UploadTranscriptResponse {
  key: string
  uploadUrl: string
  expiresAt: string
  requiredHeaders?: Record<string, string>
}

interface InitiateTrackUploadResponse {
  uploadId: string
  key: string
  uploadUrl: string
  expiresAt: string
}

interface SignTrackPartsRequest {
  uploadId: string
  partNumbers: number[]
}

interface SignTrackPartsResponse {
  parts: Array<{
    partNumber: number
    uploadUrl: string
  }>
}

interface CompleteTrackUploadRequest {
  uploadId: string
  parts: Array<{
    partNumber: number
    etag: string
  }>
}

interface ListClipsResponse {
  items: ClipListView[]
}

interface UpdateClipStatusRequest {
  status: 'approved' | 'rejected'
}

interface PlayClipResponse {
  url: string
  expiresAt: string
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

  getDetail: (id: string) => apiRequest<EpisodeDetail>(`/episodes/${id}`),

  getStatus: (id: string) => apiRequest<EpisodeStatusResponse>(`/episodes/${id}/statuses`),

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

  uploadTranscript: async (id: string, filename: string) => {
    return apiRequest<UploadTranscriptResponse>(`/episodes/${id}/transcripts`, {
      method: 'POST',
      body: JSON.stringify({ filename }),
    })
  },

  initiateTrackUpload: async (id: string, trackName: string, filename: string, speakers?: string[]) => {
    return apiRequest<InitiateTrackUploadResponse>(`/episodes/${id}/tracks`, {
      method: 'POST',
      body: JSON.stringify({ trackName, filename, speakers }),
    })
  },

  signTrackParts: async (id: string, trackName: string, data: SignTrackPartsRequest) => {
    return apiRequest<SignTrackPartsResponse>(`/episodes/${id}/tracks/${trackName}/parts`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  completeTrackUpload: async (id: string, trackName: string, data: CompleteTrackUploadRequest) => {
    return apiRequest<void>(`/episodes/${id}/tracks/${trackName}/complete`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  listClips: (id: string) => apiRequest<ListClipsResponse>(`/episodes/${id}/clips`),

  getClip: (episodeId: string, clipId: string) => apiRequest<ClipListView>(`/episodes/${episodeId}/clips/${clipId}`),

  updateClipStatus: async (episodeId: string, clipId: string, data: UpdateClipStatusRequest) => {
    return apiRequest<ClipListView>(`/episodes/${episodeId}/clips/${clipId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    })
  },

  playClip: (episodeId: string, clipId: string) => {
    return apiRequest<PlayClipResponse>(`/episodes/${episodeId}/clips/${clipId}/play`)
  },

  getPlaybackUrl: (episodeId: string, clipId: string) => {
    return apiRequest<PlayClipResponse>(`/episodes/${episodeId}/clips/${clipId}/play`)
  },

  generateClip: async (episodeId: string, clipId: string, data: { orientation: ClipOrientation }) => {
    return apiRequest<{ executionArn: string; status: string }>(`/episodes/${episodeId}/clips/${clipId}/generate`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  updateStatus: async (id: string, status: string) => {
    await apiRequest<void>(`/episodes/${id}/statuses`, {
      method: 'POST',
      body: JSON.stringify({ status }),
    })
    apiCache.invalidate(`GET:/episodes/${id}`)
    apiCache.invalidatePattern('/episodes?')
  },

  getPlan: (id: string) => apiRequest<EpisodePlan>(`/episodes/${id}/plan`),

  createPlan: async (id: string, data: { objectives: string; concepts: string; notes?: string }) => {
    const result = await apiRequest<EpisodePlan>(`/episodes/${id}/plan`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/episodes/${id}/plan`)
    return result
  },

  updatePlan: async (id: string, data: { objectives: string; concepts: string; notes?: string }) => {
    const result = await apiRequest<EpisodePlan>(`/episodes/${id}/plan`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/episodes/${id}/plan`)
    return result
  },

  deleteClip: async (episodeId: string, clipId: string) => {
    await apiRequest<void>(`/episodes/${episodeId}/clips/${clipId}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/episodes/${episodeId}/clips`)
    apiCache.invalidatePattern('/episodes?')
  },
}
