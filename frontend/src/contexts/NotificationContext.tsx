import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import { notificationsApi } from '../api/notifications'
import { invitationsApi } from '../api/invitations'
import type { Notification } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
}

export const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

const POLL_INTERVAL = 30000

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([])
      setUnreadCount(0)
      setLoading(false)
      return
    }

    try {
      setError(null)
      const data = await notificationsApi.listNotifications()
      setNotifications(data.items)
      const unread = data.items.filter(n => !n.isRead).length
      setUnreadCount(unread)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load notifications'
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
      await notificationsApi.markAsRead(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      setUnreadCount(prev => Math.max(0, prev - 1))
      showSuccess('Notification marked as read')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to mark notification as read'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const deleteNotification = async (notificationId: string): Promise<void> => {
    try {
      setError(null)
      const notification = notifications.find(n => n.id === notificationId)
      await notificationsApi.deleteNotification(notificationId)
      setNotifications(prev => prev.filter(n => n.id !== notificationId))
      if (notification && !notification.isRead) {
        setUnreadCount(prev => Math.max(0, prev - 1))
      }
      showSuccess('Notification deleted')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete notification'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const acceptInvitation = async (invitationId: string): Promise<void> => {
    try {
      setError(null)
      const result = await invitationsApi.makeDecision(invitationId, 'accept')
      await fetchNotifications()
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
      await fetchNotifications()
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
      fetchNotifications()

      pollIntervalRef.current = setInterval(() => {
        fetchNotifications()
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
  }, [authLoading, isAuthenticated, fetchNotifications])

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        error,
        fetchNotifications,
        markAsRead,
        deleteNotification,
        acceptInvitation,
        rejectInvitation,
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
