import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Notification } from '../types'

interface ListActivityParams {
  limit?: number
  nextToken?: string
  isRead?: boolean
}

interface ListActivityResponse {
  items: Notification[]
  nextToken?: string
}

export const activityApi = {
  listActivity: (params?: ListActivityParams) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.nextToken) query.append('nextToken', params.nextToken)
    if (params?.isRead !== undefined) query.append('isRead', params.isRead.toString())
    const queryString = query.toString()
    return apiRequest<ListActivityResponse>(
      `/notifications${queryString ? `?${queryString}` : ''}`
    )
  },

  markAsRead: async (notificationId: string) => {
    await apiRequest<void>(`/notifications/${notificationId}?isRead=true`, {
      method: 'DELETE',
    })
    apiCache.invalidate('GET:/notifications')
  },

  deleteActivity: async (notificationId: string) => {
    await apiRequest<void>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    })
    apiCache.invalidate('GET:/notifications')
  },
}
