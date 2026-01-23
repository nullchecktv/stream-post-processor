import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { ThemeToggle } from '../common/ThemeToggle'
import { User, Settings, LogOut } from 'lucide-react'

interface UserProfileDropdownProps {
  onClose: () => void
}

export const UserProfileDropdown = memo(function UserProfileDropdown({ onClose }: UserProfileDropdownProps) {
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const handleNavigateToProfile = () => {
    navigate('/profile')
    onClose()
  }

  const handleNavigateToSettings = () => {
    navigate('/settings')
    onClose()
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/login')
      onClose()
    } catch (err) {
      console.error('Failed to sign out:', err)
    }
  }

  return (
    <div className="absolute right-0 top-full mt-2 w-64 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-lg border border-[var(--color-border)] z-50">
      <div className="p-[var(--space-3)]">
        <button
          onClick={handleNavigateToProfile}
          className="w-full flex items-center gap-3 px-[var(--space-3)] py-[var(--space-2)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] text-left"
        >
          <User className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text-primary)]">Profile</span>
        </button>

        <button
          onClick={handleNavigateToSettings}
          className="w-full flex items-center gap-3 px-[var(--space-3)] py-[var(--space-2)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] text-left"
        >
          <Settings className="w-5 h-5 text-[var(--color-text-secondary)]" />
          <span className="text-sm text-[var(--color-text-primary)]">Settings</span>
        </button>

        <div className="border-t border-[var(--color-divider)] my-[var(--space-2)]"></div>

        <div className="flex items-center justify-between px-[var(--space-3)] py-[var(--space-2)]">
          <span className="text-sm text-[var(--color-text-secondary)]">Theme</span>
          <ThemeToggle />
        </div>

        <div className="border-t border-[var(--color-divider)] my-[var(--space-2)]"></div>

        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-[var(--space-3)] py-[var(--space-2)] hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] text-left text-[var(--color-error)]"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm">Sign Out</span>
        </button>
      </div>
    </div>
  )
})
