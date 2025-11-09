import { useUser } from '../../hooks/useUser'
import { useNavigate } from 'react-router-dom'
import { useNotifications } from '../../hooks/useNotifications'
import { Video, Menu } from 'lucide-react'
import { TeamSelector } from '../teams/TeamSelector'
import { NotificationBadge } from '../notifications/NotificationBadge'

export function TopHeader() {
  const { profile } = useUser()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-primary text-white shadow-md z-50 h-16 flex items-center px-4 sm:px-6"
      style={{ backgroundColor: '#5B8C5A' }}
    >
      <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px]"
          aria-label="Go to dashboard"
        >
          <Video className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-lg sm:text-xl font-bold hidden sm:block">ContentEngine</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:block">
            <TeamSelector />
          </div>

          <div className="text-white">
            <NotificationBadge
              count={unreadCount}
              onClick={() => navigate('/notifications')}
            />
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-white/20 hover:bg-white/10 rounded-lg transition-colors p-2 min-h-[44px]"
            aria-label="User profile"
          >
            <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white/20 rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm">
              {profile?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs sm:text-sm font-medium truncate max-w-32">{profile?.name}</div>
              <div className="text-xs text-white/70 truncate max-w-32">{profile?.email}</div>
            </div>
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="sm:hidden p-2 hover:bg-white/10 rounded-lg transition-colors min-h-[44px] min-w-[44px]"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
