import { useState } from 'react'

interface SidebarLabelProps {
  label: string
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'gray'
  count?: number
  isCollapsed: boolean
  onClick?: () => void
}

const colorClasses = {
  red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 border-orange-200 dark:border-orange-800',
  green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 border-green-200 dark:border-green-800',
  blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
  purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800',
  gray: 'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border-[var(--color-border)]',
}

const colorDots = {
  red: 'bg-red-500 dark:bg-red-400',
  orange: 'bg-orange-500 dark:bg-orange-400',
  green: 'bg-green-500 dark:bg-green-400',
  blue: 'bg-blue-500 dark:bg-blue-400',
  purple: 'bg-purple-500 dark:bg-purple-400',
  gray: 'bg-[var(--color-text-muted)]',
}

export function SidebarLabel({ label, color, count, isCollapsed, onClick }: SidebarLabelProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (isCollapsed) {
    return (
      <div className="relative">
        <button
          onClick={onClick}
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="w-full flex items-center justify-center py-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] group cursor-pointer"
        >
          <div className="relative">
            <div className={`w-3 h-3 rounded-sm ${colorDots[color]}`} />
            {count !== undefined && count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-[10px] rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </div>
        </button>

        {showTooltip && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] text-sm rounded-[var(--radius-md)] whitespace-nowrap pointer-events-none z-50 border border-[var(--color-border)]">
            {label} {count !== undefined && `(${count})`}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--color-surface-raised)]" />
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-[var(--radius-lg)] transition-[background-color,box-shadow] duration-[var(--duration-fast)] hover:shadow-sm border cursor-pointer ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-sm ${colorDots[color]}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 bg-[var(--color-surface-hover)] rounded-full text-xs font-semibold">
          {count}
        </span>
      )}
    </button>
  )
}
