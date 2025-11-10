import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { activityApi } from '../api/activity'
import { invitationsApi } from '../api/invitations'
import type { Notification } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'

export interface ActivityContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  fetchActivity: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  deleteActivity: (notificationId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

interface ActivityProviderProps {
  children: ReactNode
}

const POLL_INTERVAL = 30000

export function ActivityProvider({ children }: ActivityProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchActivity = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await activityApi.listActivity()
      setNotifications(data.items)
      const unread = data.items.filter(n => !n.isRead).length
      setUnreadCount(unread)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load activity'
      setError(errorMessage)
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const markAsRead = async (notificationId: string): Promise<void> => {
    try {
      setError(null)
      await activityApi.markAsRead(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => Math.max(0, prev - 1))
      showSuccess('Activity marked as read')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark activity as read'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const deleteActivity = async (notificationId: string): Promise<void> => {
    try {
      setError(null)
      const notification = notifications.find(n => n.id === notificationId)
      await activityApi.deleteActivity(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      showSuccess('Activity deleted')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete activity'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const acceptInvitation = async (invitationId: string): Promise<void> => {
    try {
      setError(null)
      const result = await invitationsApi.makeDecision(invitationId, 'accept')
      await fetchActivity()
      showSuccess(result.message || 'Invitation accepted successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to accept invitation'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const rejectInvitation = async (invitationId: string): Promise<void> => {
    try {
      setError(null)
      const result = await invitationsApi.makeDecision(invitationId, 'reject')
      await fetchActivity()
      showSuccess(result.message || 'Invitation rejected')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reject invitation'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchActivity()

      pollIntervalRef.current = setInterval(() => {
        fetchActivity()
      }, POLL_INTERVAL)

      return () => {
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current)
        }
      }
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [authLoading, isAuthenticated, fetchActivity])

  return (
    <ActivityContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchActivity,
        markAsRead,
        deleteActivity,
        acceptInvitation,
        rejectInvitation,
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}
