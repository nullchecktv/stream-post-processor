import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'

interface SidebarSectionProps {
  title: string
  isCollapsed: boolean
  children: React.ReactNode
  defaultOpen?: boolean
}

export function SidebarSection({ title, isCollapsed, children, defaultOpen = true }: SidebarSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  if (isCollapsed) {
    return (
      <div className="mb-2">
        {children}
      </div>
    )
  }

  return (
    <div className="px-3 mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-2 py-2 text-xs font-semibold text-[var(--color-text-secondary)] uppercase tracking-wider hover:text-[var(--color-text-primary)] transition-colors duration-[var(--duration-fast)]"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>
      {isOpen && (
        <div className="mt-1 space-y-1">
          {children}
        </div>
      )}
    </div>
  )
}
