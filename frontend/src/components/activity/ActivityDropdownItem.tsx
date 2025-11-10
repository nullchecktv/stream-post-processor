import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Activity, Notification } from '../../types'

interface ActivityDropdownItemProps {
  item: Activity | Notification
  onMarkAsRead: (id: string) => void
}

export const ActivityDropdownItem = memo(function ActivityDropdownItem({
  item,
  onMarkAsRead,
}: ActivityDropdownItemProps) {
  const navigate = useNavigate()

  const isActivity = 'episodeId' in item
  const isNotification = 'data' in item

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'clip_detected':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )
      case 'clip_processed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'clip_failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
      case 'preprocessing_completed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )
      case 'preprocessing_failed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        )
      case 'status_changed':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        )
      case 'team_invitation':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        )
    }
  }

  const getIconColor = (type: string) => {
    switch (type) {
      case 'clip_detected':
        return 'text-blue-600 bg-blue-100'
      case 'clip_processed':
      case 'preprocessing_completed':
        return 'text-green-600 bg-green-100'
      case 'clip_failed':
      case 'preprocessing_failed':
        return 'text-red-600 bg-red-100'
      case 'status_changed':
        return 'text-purple-600 bg-purple-100'
      case 'team_invitation':
        return 'text-indigo-600 bg-indigo-100'
      default:
        return 'text-gray-600 bg-gray-100'
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  const handleClick = () => {
    if (!item.isRead) {
      onMarkAsRead(item.id)
    }

    if (isActivity) {
      const activity = item as Activity
      if (activity.clipId) {
        navigate(`/episodes/${activity.episodeId}/clips`)
      } else {
        navigate(`/episodes/${activity.episodeId}/overview`)
      }
    } else if (isNotification) {
      const notification = item as Notification
      if (notification.type === 'team_invitation') {
        navigate('/activity')
      } else if (notification.data?.teamId) {
        navigate(`/teams/${notification.data.teamId}`)
      }
    }
  }

  return (
    <button
      onClick={handleClick}
      className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${
        !item.isRead ? 'bg-blue-50' : ''
      }`}
    >
      <div className="flex gap-3">
        <div
          className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getIconColor(
            item.type
          )}`}
        >
          {getActivityIcon(item.type)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
              <p className="text-sm text-gray-600 line-clamp-2">{item.message}</p>
              <p className="text-xs text-gray-500 mt-1">{formatTimestamp(item.createdAt)}</p>
            </div>

            {!item.isRead && (
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-1" />
            )}
          </div>
        </div>
      </div>
    </button>
  )
})
