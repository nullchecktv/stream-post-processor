import { useState, useRef, useEffect } from 'react'
import { LogOut, Users, ChevronDown, HelpCircle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { useUser } from '../../hooks/useUser'
import { useHelpTips } from '../../hooks/useHelpTips'
import { useNavigate } from 'react-router-dom'
import { ThemeToggle } from '../common/ThemeToggle'

interface UserSectionProps {
  isCollapsed: boolean
}

export function UserSection({ isCollapsed }: UserSectionProps) {
  const { user, signOut } = useAuth()
  const { profile } = useUser()
  const { resetTips } = useHelpTips()
  const navigate = useNavigate()
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false)
      }
    }

    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isMenuOpen])

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
    } catch (error) {
      console.error('Sign out failed:', error)
    }
  }

  const handleSwitchTeam = () => {
    setIsMenuOpen(false)
    navigate('/teams')
  }

  const handleResetHelpTips = () => {
    resetTips()
    setIsMenuOpen(false)
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const activeTeam = profile?.teams?.find(t => t.teamId === profile.activeTeamId)

  if (isCollapsed) {
    return (
      <div className="border-t border-gray-200 dark:border-gray-700">
        <div className="relative p-3" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="w-full flex items-center justify-center p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            aria-label="User menu"
          >
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
              {getInitials(profile?.name || user?.username)}
            </div>
          </button>

          {isMenuOpen && (
            <div className="absolute bottom-full left-full ml-2 mb-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
              <div className="px-4 py-2 flex items-center justify-between">
                <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
                <ThemeToggle />
              </div>
              <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
              <button
                onClick={handleSwitchTeam}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <Users className="w-4 h-4" />
                Switch Team
              </button>
              <button
                onClick={handleResetHelpTips}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
              >
                <HelpCircle className="w-4 h-4" />
                Reset Help Tips
              </button>
              <button
                onClick={handleSignOut}
                className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border-t border-gray-200 dark:border-gray-700">
      <div className="relative p-3" ref={menuRef}>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
            {getInitials(profile?.name || user?.username)}
          </div>
          <div className="flex-1 text-left min-w-0">
            <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
              {profile?.name || user?.username || 'User'}
            </div>
            {activeTeam && (
              <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {activeTeam.name}
              </div>
            )}
          </div>
          <ChevronDown className={`w-4 h-4 text-gray-400 dark:text-gray-500 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
        </button>

        {isMenuOpen && (
          <div className="absolute bottom-full left-3 right-3 mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <div className="px-4 py-2 flex items-center justify-between">
              <span className="text-sm text-gray-700 dark:text-gray-300">Theme</span>
              <ThemeToggle />
            </div>
            <div className="border-t border-gray-200 dark:border-gray-700 my-1"></div>
            <button
              onClick={handleSwitchTeam}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <Users className="w-4 h-4" />
              Switch Team
            </button>
            <button
              onClick={handleResetHelpTips}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-700 dark:text-gray-300"
            >
              <HelpCircle className="w-4 h-4" />
              Reset Help Tips
            </button>
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-600 dark:text-red-400"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
