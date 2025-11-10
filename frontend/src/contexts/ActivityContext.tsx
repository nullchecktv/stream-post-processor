import { createContext, useEffect, useState, useCallback, useRef, useMemo, type ReactNode } from 'react'
import { activityApi } from '../api/activity'
import { invitationsApi } from '../api/invitations'
import type { Notification, Activity } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'

export interface ActivityContextType {
  notifications: Notification[]
  activities: Activity[]
  unreadCount: number
  loading: boolean
  error: string | null
  fetchActivity: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  deleteActivity: (notificationId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
  addActivity: (activity: Omit<Activity, 'id' | 'isRead' | 'createdAt'>) => void
  markAllAsRead: () => void
  clearActivity: (id: string) => void
}

export const ActivityContext = createContext<ActivityContextType | undefined>(undefined)

interface ActivityProviderProps {
  children: ReactNode
}

const POLL_INTERVAL = 30000
const ACTIVITIES_STORAGE_KEY = 'episode-activities'
const MAX_ACTIVITIES = 50

export function ActivityProvider({ children }: ActivityProviderProps) {
  const { isAuthenticated, loading: authLoading, user } = useAuth()
  const { showSuccess, showError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const storageKey = useMemo(() => {
    return user?.email ? `${ACTIVITIES_STORAGE_KEY}-${user.email}` : ACTIVITIES_STORAGE_KEY
  }, [user?.email])

  useEffect(() => {
    if (!isAuthenticated) {
      setActivities([])
      return
    }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedActivities = JSON.parse(stored) as Activity[]
        setActivities(parsedActivities.slice(0, MAX_ACTIVITIES))
      }
    } catch (error) {
      console.error('Failed to load activities from storage:', error)
      setActivities([])
    }
  }, [isAuthenticated, storageKey])

  useEffect(() => {
    if (isAuthenticated && activities.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(activities.slice(0, MAX_ACTIVITIES)))
      } catch (error) {
        console.error('Failed to save activities to storage:', error)
      }
    }
  }, [activities, isAuthenticated, storageKey])

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
      const notificationUnread = data.items.filter(n => !n.isRead).length
      const activityUnread = activities.filter(a => !a.isRead).length
      setUnreadCount(notificationUnread + activityUnread)
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load activity'
      setError(errorMessage)
      setNotifications([])
      const activityUnread = activities.filter(a => !a.isRead).length
      setUnreadCount(activityUnread)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, activities])

  const addActivity = useCallback((activity: Omit<Activity, 'id' | 'isRead' | 'createdAt'>) => {
    const newActivity: Activity = {
      ...activity,
      id: `activity-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      isRead: false,
      createdAt: new Date().toISOString(),
    }
    setActivities(prev => [newActivity, ...prev].slice(0, MAX_ACTIVITIES))
    setUnreadCount(prev => prev + 1)
  }, [])

  const markAllAsRead = useCallback(() => {
    setActivities(prev => prev.map(a => ({ ...a, isRead: true })))
    const notificationUnread = notifications.filter(n => !n.isRead).length
    setUnreadCount(notificationUnread)
  }, [notifications])

  const clearActivity = useCallback((id: string) => {
    const activity = activities.find(a => a.id === id)
    setActivities(prev => prev.filter(a => a.id !== id))
    if (activity && !activity.isRead) {
      setUnreadCount(prev => Math.max(0, prev - 1))
    }
  }, [activities])

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
        activities,
        unreadCount,
        loading,
        error,
        fetchActivity,
        markAsRead,
        deleteActivity,
        acceptInvitation,
        rejectInvitation,
        addActivity,
        markAllAsRead,
        clearActivity,
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}
