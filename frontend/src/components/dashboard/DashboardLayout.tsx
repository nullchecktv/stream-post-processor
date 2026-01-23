import type { ReactNode } from 'react'
import { HelpTip } from '../common/HelpTip'

interface DashboardLayoutProps {
  children: ReactNode
  onCreateEpisode: () => void
}

export function DashboardLayout({ children, onCreateEpisode }: DashboardLayoutProps) {
  return (
    <div className="relative min-h-full bg-[var(--color-background)]">
      <div className="relative max-w-7xl mx-auto px-[var(--space-4)] sm:px-[var(--space-6)] lg:px-[var(--space-8)] py-[var(--space-8)]">
        {children}
      </div>

      <div className="fixed bottom-[var(--space-8)] right-[var(--space-8)] z-40">
        <HelpTip
          id="dashboard-create-episode"
          content={
            <div>
              <p className="font-semibold mb-1">Create New Episode</p>
              <p>Click here to create a new episode. You can also use Ctrl+N (Cmd+N on Mac) as a keyboard shortcut.</p>
            </div>
          }
          position="left"
        >
          <button
            onClick={onCreateEpisode}
            className="relative bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-[var(--radius-full)] p-[var(--space-6)] shadow-2xl hover:bg-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)] transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] group"
            aria-label="Create new episode"
          >
            <svg
              className="w-7 h-7 relative z-10"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </HelpTip>
      </div>
    </div>
  )
}
