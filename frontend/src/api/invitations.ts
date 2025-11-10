import { apiRequest } from './client'
import { apiCache } from '../utils/cache'

interface MakeDecisionResponse {
  message: string
  teamId?: string
  teamName?: string
  role?: string
}

export const invitationsApi = {
  makeDecision: async (invitationId: string, action: 'accept' | 'reject') => {
    const result = await apiRequest<MakeDecisionResponse>(
      `/invitations/${invitationId}/decisions`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    )
    apiCache.invalidate('GET:/teams')
    apiCache.invalidate('GET:/notifications')
    return result
  },
}
