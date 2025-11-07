import { useUser } from '../../hooks/useUser'
import { useNavigate } from 'react-router-dom'
import { Bell, Search, Video } from 'lucide-react'

export function TopHeader() {
  const { profile } = useUser()
  const navigate = useNavigate()

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-primary text-white shadow-md z-50 h-16 flex items-center px-6"
      style={{ backgroundColor: '#5B8C5A' }}
    >
      <div className="flex-1 flex items-center justify-between">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          aria-label="Go to dashboard"
        >
          <Video className="w-7 h-7" />
          <span className="text-xl font-bold hidden sm:block">ContentEngine</span>
        </button>
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-primary-light" />
            <input
              type="text"
              placeholder="Search episodes..."
              className="pl-10 pr-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/30 focus:bg-white/20 transition-all w-128"
            />
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            className="relative p-2 hover:bg-white/10 rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full"></span>
          </button>

          <div className="hidden md:flex items-center space-x-3 pl-4 border-l border-white/20">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center font-semibold text-sm">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="text-sm font-medium">{profile?.name}</div>
              <div className="text-xs text-white/70">{profile?.email}</div>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
