import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useActivity } from '../../hooks/useActivity'
import { ActivityDropdownItem } from './ActivityDropdownItem'
import { Activity as ActivityIcon } from 'lucide-react'

interface ActivityDropdownProps {
  onClose: () => void
}

export const ActivityDropdown = memo(function ActivityDropdown({ onClose }: ActivityDropdownProps) {
  const navigate = useNavigate()
  const { notifications, activities, markAsRead, markAllAsRead } = useActivity()

  const allItems = [...activities, ...notifications]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5)

  const handleMarkAsRead = (id: string) => {
    const activity = activities.find(a => a.id === id)
    if (activity) {
      return
    }
    markAsRead(id)
  }

  const handleMarkAllAsRead = () => {
    markAllAsRead()
    onClose()
  }

  const handleViewAll = () => {
    navigate('/activity')
    onClose()
  }

  if (allItems.length === 0) {
    return (
      <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        </div>

        <div className="p-8 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4 text-gray-400">
            <ActivityIcon className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications</h3>
          <p className="text-sm text-gray-600">
            You're all caught up! You'll see notifications here when there's activity.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">
          Notifications ({allItems.filter(item => !item.isRead).length} unread)
        </h3>
        {allItems.some(item => !item.isRead) && (
          <button
            onClick={handleMarkAllAsRead}
            className="text-xs text-primary hover:text-primary-dark focus:outline-none focus:underline transition-colors"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto">
        {allItems.map(item => (
          <ActivityDropdownItem key={item.id} item={item} onMarkAsRead={handleMarkAsRead} />
        ))}
      </div>

      <div className="p-3 border-t border-gray-200">
        <button
          onClick={handleViewAll}
          className="w-full text-center text-sm text-primary hover:text-primary-dark focus:outline-none focus:underline transition-colors"
        >
          View all activities →
        </button>
      </div>
    </div>
  )
})
