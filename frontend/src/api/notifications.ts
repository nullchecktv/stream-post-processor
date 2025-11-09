import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Notification } from '../types'

interface ListNotificationsParams {
  limit?: number
  nextToken?: string
  isRead?: boolean
}

interface ListNotificationsResponse {
  items: Notification[]
  nextToken?: string
}

export const notificationsApi = {
  listNotifications: (params?: ListNotificationsParams) => {
    const query = new URLSearchParams()
    if (params?.limit) query.append('limit', params.limit.toString())
    if (params?.nextToken) query.append('nextToken', params.nextToken)
    if (params?.isRead !== undefined) query.append('isRead', params.isRead.toString())
    const queryString = query.toString()
    return apiRequest<ListNotificationsResponse>(
      `/notifications${queryString ? `?${queryString}` : ''}`
    )
  },

  markAsRead: async (notificationId: string) => {
    await apiRequest<void>(`/notifications/${notificationId}?isRead=true`, {
      method: 'DELETE',
    })
    apiCache.invalidate('GET:/notifications')
  },

  deleteNotification: async (notificationId: string) => {
    await apiRequest<void>(`/notifications/${notificationId}`, {
      method: 'DELETE',
    })
    apiCache.invalidate('GET:/notifications')
  },
}
