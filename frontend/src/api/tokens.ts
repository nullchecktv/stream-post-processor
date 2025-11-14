import { apiRequest } from './client'

export interface RefreshTokenResponse {
  momentoToken: string
  expiresAt: string
}

export async function refreshMomentoToken(): Promise<RefreshTokenResponse> {
  return apiRequest<RefreshTokenResponse>('/tokens/refresh', {
    method: 'POST'
  })
}
