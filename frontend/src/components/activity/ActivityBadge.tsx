import { Activity } from 'lucide-react'

interface ActivityBadgeProps {
  count: number
  onClick: () => void
}

export function ActivityBadge({ count, onClick }: ActivityBadgeProps) {
  if (count === 0) {
    return (
      <button
        onClick={onClick}
        className="relative p-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] text-[var(--color-text-primary)]"
        aria-label="Activity"
      >
        <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="relative p-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] text-[var(--color-text-primary)]"
      aria-label={`${count} unread activity items`}
    >
      <Activity className="w-5 h-5 sm:w-6 sm:h-6" />
      <span className="absolute top-1 right-1 inline-flex items-center justify-center px-1.5 py-0.5 min-w-[18px] text-xs font-bold leading-none text-[var(--color-text-on-accent)] bg-[var(--color-error)] rounded-full animate-pop">
        {count > 99 ? '99+' : count}
      </span>
    </button>
  )
}
