import { useState } from 'react'
import { Activity as ActivityIcon, AlertTriangle } from 'lucide-react'
import { useActivity } from '../hooks/useActivity'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ActivityItem } from '../components/activity/ActivityItem'
import { useCircuitBreaker } from '../hooks/useCircuitBreaker'

type FilterTab = 'all' | 'unread'

export default function ActivityPage() {
  const {
    notifications,
    loading,
    error,
    markAsRead,
    deleteActivity,
    acceptInvitation,
    rejectInvitation,
  } = useActivity()

  const { isCircuitOpen } = useCircuitBreaker()

  const [activeFilter, setActiveFilter] = useState<FilterTab>('all')
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())

  const filteredNotifications = activeFilter === 'unread'
    ? notifications.filter(n => !n.isRead)
    : notifications

  const unreadNotifications = notifications.filter(n => !n.isRead)

  const handleMarkAsRead = async (notificationId: string) => {
    setProcessingIds(prev => new Set(prev).add(notificationId))
    try {
      await markAsRead(notificationId)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const handleDelete = async (notificationId: string) => {
    setProcessingIds(prev => new Set(prev).add(notificationId))
    try {
      await deleteActivity(notificationId)
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev)
        next.delete(notificationId)
        return next
      })
    }
  }

  const handleAcceptInvitation = async (invitationId: string) => {
    try {
      await acceptInvitation(invitationId)
    } catch (err) {
      console.error('Failed to accept invitation:', err)
    }
  }

  const handleRejectInvitation = async (invitationId: string) => {
    try {
      await rejectInvitation(invitationId)
    } catch (err) {
      console.error('Failed to reject invitation:', err)
    }
  }

  const handleMarkAllAsRead = async () => {
    const promises = unreadNotifications.map(n => markAsRead(n.id))
    await Promise.allSettled(promises)
  }

  return (
    <div className="relative min-h-full">
      {loading && <LoadingSpinner variant="page" />}
      <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Activity</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">Stay updated with your team activities and invitations</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-lg">
          <p className="text-[var(--color-error)]">{error}</p>
        </div>
      )}

      {isCircuitOpen && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">Real-time updates paused</h3>
              <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                Activity feed will update when you refresh the page.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="mb-6 flex items-center justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveFilter('all')}
            className={`px-4 py-2 rounded-[var(--radius-lg)] font-medium transition-colors duration-[var(--duration-fast)] ${
              activeFilter === 'all'
                ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
            }`}
          >
            All ({notifications.length})
          </button>
          <button
            onClick={() => setActiveFilter('unread')}
            className={`px-4 py-2 rounded-[var(--radius-lg)] font-medium transition-colors duration-[var(--duration-fast)] ${
              activeFilter === 'unread'
                ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                : 'bg-[var(--color-surface)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)]'
            }`}
          >
            Unread ({unreadNotifications.length})
          </button>
        </div>

        {unreadNotifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-4 py-2 text-sm font-medium text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)]"
          >
            Mark all as read
          </button>
        )}
      </div>

      {filteredNotifications.length === 0 ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-surface)] rounded-full mb-4 text-[var(--color-text-muted)]">
            <ActivityIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
            {activeFilter === 'unread' ? 'No unread activity' : 'No activity'}
          </h3>
          <p className="text-[var(--color-text-secondary)]">
            {activeFilter === 'unread'
              ? "You're all caught up!"
              : "You'll see activity here when you receive team invitations or updates"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotifications.map(notification => (
            <ActivityItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={handleMarkAsRead}
              onDelete={handleDelete}
              onAcceptInvitation={handleAcceptInvitation}
              onRejectInvitation={handleRejectInvitation}
              isProcessing={processingIds.has(notification.id)}
            />
          ))}
        </div>
      )}
      </div>
    </div>
  )
}
