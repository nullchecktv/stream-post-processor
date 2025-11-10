import { useState } from 'react'

interface SidebarLabelProps {
  label: string
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'gray'
  count?: number
  isCollapsed: boolean
  onClick?: () => void
}

const colorClasses = {
  red: 'bg-red-100 text-red-700 border-red-200',
  orange: 'bg-orange-100 text-orange-700 border-orange-200',
  green: 'bg-green-100 text-green-700 border-green-200',
  blue: 'bg-blue-100 text-blue-700 border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border-purple-200',
  gray: 'bg-gray-100 text-gray-700 border-gray-200',
}

const colorDots = {
  red: 'bg-red-500',
  orange: 'bg-orange-500',
  green: 'bg-green-500',
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  gray: 'bg-gray-500',
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
          className="w-full flex items-center justify-center py-2 hover:bg-gray-50 rounded-lg transition-colors group cursor-pointer"
        >
          <div className="relative">
            <div className={`w-3 h-3 rounded-sm ${colorDots[color]}`} />
            {count !== undefined && count > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-gray-900 text-white text-[10px] rounded-full flex items-center justify-center">
                {count > 9 ? '9+' : count}
              </span>
            )}
          </div>
        </button>

        {showTooltip && (
          <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 bg-gray-900 text-white text-sm rounded-md whitespace-nowrap pointer-events-none z-50">
            {label} {count !== undefined && `(${count})`}
            <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-gray-900" />
          </div>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all hover:shadow-sm border cursor-pointer ${colorClasses[color]}`}
    >
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-sm ${colorDots[color]}`} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {count !== undefined && count > 0 && (
        <span className="px-2 py-0.5 bg-white/50 rounded-full text-xs font-semibold">
          {count}
        </span>
      )}
    </button>
  )
}
