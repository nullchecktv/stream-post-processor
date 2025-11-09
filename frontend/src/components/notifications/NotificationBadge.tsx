interface NotificationBadgeProps {
  count: number
  onClick: () => void
}

export function NotificationBadge({ count, onClick }: NotificationBadgeProps) {
  if (count === 0) {
    return (
      <button
        onClick={onClick}
        className="relative p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
        aria-label="Notifications"
      >
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
      aria-label={`${count} unread notifications`}
    >
      <svg
        className="w-5 h-5 sm:w-6 sm:h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </svg>
      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 min-w-[18px] text-xs font-bold leading-none text-white bg-red-600 rounded-full animate-pulse">
        {count > 99 ? '99+' : count}
      </span>
    </button>
  )
}
