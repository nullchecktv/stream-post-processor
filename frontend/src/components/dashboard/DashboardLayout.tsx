import type { ReactNode } from 'react'
import { HelpTip } from '../common/HelpTip'

interface DashboardLayoutProps {
  children: ReactNode
  onCreateEpisode: () => void
}

export function DashboardLayout({ children, onCreateEpisode }: DashboardLayoutProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-accent/5 to-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </div>

      <div className="fixed bottom-8 right-8 z-40">
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
            className="relative bg-gradient-to-br from-primary to-primary-dark text-white rounded-full p-4 shadow-lg hover:shadow-2xl transition-all transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/50 focus:ring-offset-2 group"
            aria-label="Create new episode"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <svg
              className="w-6 h-6 relative z-10"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
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
