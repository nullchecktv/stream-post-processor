import { useContext } from 'react'
import { ActivityContext, type ActivityContextType } from '../contexts/ActivityContext'

export function useActivity(): ActivityContextType {
  const context = useContext(ActivityContext)

  if (context === undefined) {
    if (typeof console !== 'undefined') {
      console.error('useActivity called outside ActivityProvider. Returning safe fallbacks.')
    }
    return {
      notifications: [],
      unreadCount: 0,
      loading: false,
      error: 'Activity is unavailable in this view',
      fetchActivity: async () => {},
      markAsRead: async () => {},
      deleteActivity: async () => {},
      acceptInvitation: async () => {},
      rejectInvitation: async () => {},
    }
  }

  return context
}
