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
          flex items-center h-12 transition-all duration-150 relative
          ${isCollapsed ? 'justify-center' : 'px-4 gap-3 rounded-lg'}
          ${
            isActive && !isCollapsed
              ? 'bg-gradient-to-r from-accent to-accent/50 text-primary font-semibold shadow-sm'
              : isActive && isCollapsed
              ? 'text-primary'
              : isCollapsed
              ? 'text-gray-700'
              : 'text-gray-700 hover:bg-gray-100 hover:text-primary rounded-lg'
          }
        `
        }
        onMouseEnter={() => isCollapsed && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {({ isActive }) => (
          <>
            {isActive && !isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full"></div>}
            {isActive && isCollapsed && <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-10 bg-primary rounded-r-full"></div>}
            <Icon className={isCollapsed ? 'w-7 h-7' : 'w-6 h-6'} />
            {!isCollapsed && (
              <span className="font-medium text-sm">{label}</span>
            )}
          </>
        )}
      </NavLink>

      {isCollapsed && showTooltip && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap pointer-events-none z-50 animate-fadeIn">
          {label}
          <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
        </div>
      )}
    </div>
  )
}
