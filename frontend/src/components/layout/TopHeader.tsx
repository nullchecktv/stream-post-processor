import { useState, useEffect, useRef } from 'react'
import { useUser } from '../../hooks/useUser'
import { useNavigate } from 'react-router-dom'
import { Video, Menu, ChevronDown } from 'lucide-react'
import { TeamSelector } from '../teams/TeamSelector'
import { ThemeToggle } from '../common/ThemeToggle'
import { UserProfileDropdown } from './UserProfileDropdown'

export function TopHeader() {
  const { profile } = useUser()
  const navigate = useNavigate()
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const profileButtonRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showProfileDropdown &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(event.target as Node)
      ) {
        setShowProfileDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showProfileDropdown])

  return (
    <header
      className="fixed top-0 left-0 right-0 bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-sm z-50 h-16 flex items-center px-4 sm:px-6 backdrop-blur-sm border-b border-[var(--color-border)]"
    >
      <div className="flex-1 flex items-center justify-between gap-2 sm:gap-4">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 hover:opacity-80 transition-opacity min-h-[44px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-md"
          aria-label="Go to dashboard"
        >
          <Video className="w-6 h-6 sm:w-7 sm:h-7" />
          <span className="text-lg sm:text-xl font-bold hidden sm:block">Encore</span>
        </button>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden lg:block">
            <TeamSelector />
          </div>

          <ThemeToggle />

          <div className="relative" ref={profileButtonRef}>
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="hidden sm:flex items-center gap-2 sm:gap-3 pl-2 sm:pl-4 border-l border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors duration-[var(--duration-fast)] p-2 min-h-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
              aria-label="User profile menu"
            >
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center font-semibold text-xs sm:text-sm text-[var(--color-text-primary)]">
                {profile?.name?.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs sm:text-sm font-medium truncate max-w-32">{profile?.name}</div>
                <div className="text-xs text-[var(--color-text-muted)] truncate max-w-32">{profile?.email}</div>
              </div>
              <ChevronDown className="w-4 h-4 text-[var(--color-text-muted)]" />
            </button>
            {showProfileDropdown && (
              <UserProfileDropdown onClose={() => setShowProfileDropdown(false)} />
            )}
          </div>

          <button
            onClick={() => navigate('/profile')}
            className="sm:hidden p-2 hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors duration-[var(--duration-fast)] min-h-[44px] min-w-[44px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
