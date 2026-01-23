import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { useState } from 'react'

interface SidebarItemProps {
  to: string
  icon: LucideIcon
  label: string
  isCollapsed: boolean
}

export function SidebarItem({ to, icon: Icon, label, isCollapsed }: SidebarItemProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="relative px-3 mb-1">
      <NavLink
        to={to}
        className={({ isActive }) =>
          `
          flex items-center h-12 transition-colors duration-[var(--duration-fast)] relative cursor-pointer
          ${isCollapsed ? 'justify-center' : 'px-4 gap-3 rounded-[var(--radius-lg)]'}
          ${
            isActive && !isCollapsed
              ? 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] font-semibold shadow-sm'
              : isActive && isCollapsed
              ? 'text-[var(--color-accent)]'
              : isCollapsed
              ? 'text-[var(--color-text-primary)]'
              : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-accent)] rounded-[var(--radius-lg)]'
          }
        `
        }
        onMouseEnter={() => isCollapsed && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {({ isActive }) => (
          <>
            {isActive && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-[var(--color-accent)] rounded-r-full"></div>}
            {isActive && isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-[var(--color-accent)] rounded-r-full"></div>}
            <Icon className={isCollapsed ? 'w-7 h-7' : 'w-6 h-6'} />
            {!isCollapsed && (
              <span className="font-medium text-sm">{label}</span>
            )}
          </>
        )}
      </NavLink>

      {isCollapsed && showTooltip && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] text-sm rounded-[var(--radius-md)] whitespace-nowrap pointer-events-none z-50 animate-fadeIn border border-[var(--color-border)]">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-[var(--color-surface-raised)]" />
        </div>
      )}
    </div>
  )
}
