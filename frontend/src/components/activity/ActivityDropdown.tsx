import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivity } from '../../hooks/useActivity'
import { ActivityDropdownItem } from './ActivityDropdownItem'
import { Activity as ActivityIcon, AlertTriangle } from 'lucide-react'
import { useCircuitBreaker } from '../../hooks/useCircuitBreaker'

interface ActivityDropdownProps {
  onClose: () => void
}

export const ActivityDropdown = memo(function ActivityDropdown({ onClose }: ActivityDropdownProps) {
  const navigate = useNavigate()
  const { notifications, markAsRead } = useActivity()
  const { isCircuitOpen, canRetry, retryConnection } = useCircuitBreaker()

  const allItems = [...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const handleMarkAsRead = (id: string) => {
    markAsRead(id)
  }

  const handleMarkAllAsRead = async () => {
    const unreadNotifications = notifications.filter(n => !n.isRead)
    const promises = unreadNotifications.map(n => markAsRead(n.id))
    await Promise.allSettled(promises)
    onClose()
  }

  const handleViewAll = () => {
    navigate('/activity')
    onClose()
  }

  if (allItems.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-2 w-96 bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] shadow-lg border border-[var(--color-border)] z-50">
        <div className="p-[var(--space-4)] border-b border-[var(--color-divider)]">
          <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">Activities</h3>
        </div>

        {isCircuitOpen && (
          <div className="px-[var(--space-4)] py-[var(--space-3)] bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center justify-between gap-[var(--space-3)]">
              <div className="flex items-center gap-[var(--space-2)] text-sm text-yellow-800 dark:text-yellow-200">
                <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                <span>Real-time updates unavailable</span>
              </div>
              {canRetry && (
                <button
                  onClick={retryConnection}
                  className="text-xs px-[var(--space-2)] py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        )}

        <div className="p-[var(--space-8)] text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-surface)] rounded-full mb-[var(--space-4)] text-[var(--color-text-muted)]">
            <ActivityIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No activity</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">
            You're all caught up! You'll see activities here when something cool happens.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] shadow-lg border border-[var(--color-border)] z-50">
      <div className="p-[var(--space-4)] border-b border-[var(--color-divider)] flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--color-text-primary)]">
          Notifications ({allItems.filter(item => !item.isRead).length} unread)
        </h3>
        {allItems.some(item => !item.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus:outline-none focus:underline transition-colors duration-[var(--duration-fast)]"
          >
            Mark all as read
          </button>
        )}
      </div>

      {isCircuitOpen && (
        <div className="px-[var(--space-4)] py-[var(--space-3)] bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="flex items-center justify-between gap-[var(--space-3)]">
            <div className="flex items-center gap-[var(--space-2)] text-sm text-yellow-800 dark:text-yellow-200">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>Real-time updates unavailable</span>
            </div>
            {canRetry && (
              <button
                onClick={retryConnection}
                className="text-xs px-[var(--space-2)] py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2"
              >
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      <div className="max-h-96 overflow-y-auto">
        {allItems.map(item => (
          <ActivityDropdownItem key={item.id} item={item} onMarkAsRead={handleMarkAsRead} />
        ))}
      </div>

      <div className="p-[var(--space-3)] border-t border-[var(--color-divider)]">
        <button
          onClick={handleViewAll}
          className="w-full text-center text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] focus:outline-none focus:underline transition-colors duration-[var(--duration-fast)]"
        >
          View all activities →
        </button>
      </div>
    </div>
  )
})
