import { useState, memo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Notification } from '../../types'

interface ActivityItemProps {
  notification: Notification
  onMarkAsRead: (notificationId: string) => Promise<void>
  onDelete: (notificationId: string) => Promise<void>
  onAcceptInvitation?: (invitationId: string) => Promise<void>
  onRejectInvitation?: (invitationId: string) => Promise<void>
  isProcessing?: boolean
}

export const ActivityItem = memo(function ActivityItem({
  notification,
  onMarkAsRead,
  onDelete,
  onAcceptInvitation,
  onRejectInvitation,
  isProcessing = false,
}: ActivityItemProps) {
  const navigate = useNavigate()
  const [actionLoading, setActionLoading] = useState<'accept' | 'reject' | null>(null)

  const getNotificationIcon = () => {
    switch (notification.type) {
      case 'team_invitation':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        )
      case 'member_added':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
        )
      case 'member_removed':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6"
            />
          </svg>
        )
      case 'role_changed':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          </svg>
        )
      case 'clip_processed':
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        )
      default:
        return (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

  const getIconColor = () => {
    switch (notification.type) {
      case 'team_invitation':
        return 'text-blue-600 bg-blue-100'
      case 'member_added':
        return 'text-green-600 bg-green-100'
      case 'member_removed':
        return 'text-red-600 bg-red-100'
      case 'role_changed':
        return 'text-purple-600 bg-purple-100'
      case 'clip_processed':
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

  const handleAccept = async () => {
    if (!notification.data?.invitationId || !onAcceptInvitation) return
    setActionLoading('accept')
    try {
      await onAcceptInvitation(notification.data.invitationId)
    } finally {
      setActionLoading(null)
    }
  }

  const handleReject = async () => {
    if (!notification.data?.invitationId || !onRejectInvitation) return
    setActionLoading('reject')
    try {
      await onRejectInvitation(notification.data.invitationId)
    } finally {
      setActionLoading(null)
    }
  }

  const isInvitation = notification.type === 'team_invitation'
  const hasDestination = Boolean(notification.url)

  const handleNavigate = () => {
    if (!notification.url || isProcessing) return
    void onMarkAsRead(notification.id)
    navigate(notification.url)
  }

  return (
    <div
      className={`p-4 rounded-lg border transition-all ${
        notification.isRead
          ? 'bg-white border-gray-200'
          : 'bg-blue-50 border-blue-200'
      } ${isProcessing ? 'opacity-50 cursor-not-allowed' : hasDestination ? 'cursor-pointer' : ''}`}
      onClick={handleNavigate}
    >
      <div className="flex gap-4">
        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${getIconColor()}`}>
          {getNotificationIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">{notification.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
              <p className="mt-2 text-xs text-gray-500">{formatTimestamp(notification.createdAt)}</p>
            </div>

            {!notification.isRead && (
              <div className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" />
            )}
          </div>

          {isInvitation && notification.data?.invitationId && (
            <div className="mt-4 flex gap-2">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAccept()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleAccept()
                  }
                }}
                disabled={actionLoading !== null || isProcessing}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Accept invitation"
              >
                {actionLoading === 'accept' ? 'Accepting...' : 'Accept'}
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleReject()
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReject()
                  }
                }}
                disabled={actionLoading !== null || isProcessing}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Reject invitation"
              >
                {actionLoading === 'reject' ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          )}

          <div className="mt-4 flex gap-2">
            {!notification.isRead && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onMarkAsRead(notification.id)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onMarkAsRead(notification.id)
                  }
                }}
                disabled={isProcessing}
                className="text-sm text-primary hover:text-primary-dark focus:outline-none focus:underline transition-colors disabled:opacity-50"
                aria-label="Mark activity as read"
              >
                Mark as read
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(notification.id)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onDelete(notification.id)
                }
              }}
              disabled={isProcessing}
              className="text-sm text-red-600 hover:text-red-700 focus:outline-none focus:underline transition-colors disabled:opacity-50"
              aria-label="Delete activity"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  )
})
