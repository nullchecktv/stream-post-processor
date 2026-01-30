import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Users, Plus, Check } from 'lucide-react'
import { useTeams } from '../../hooks/useTeams'
import { useToast } from '../../hooks/useToast'

export function TeamSelector() {
  const { activeTeam, teams, setActiveTeam, loading, switching } = useTeams()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const handleTeamSwitch = async (teamId: string | null) => {
    setIsOpen(false)

    try {
      await setActiveTeam(teamId)
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to switch team', 'error')
    }
  }

  const handleCreateTeam = () => {
    setIsOpen(false)
    navigate('/teams/new')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-raised)] rounded-lg">
        <Users className="w-4 h-4" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)] rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Select team"
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={switching}
      >
        {switching ? (
          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          <Users className="w-4 h-4" />
        )}
        <span className="text-sm font-medium max-w-32 truncate">
          {switching ? 'Switching...' : activeTeam ? activeTeam.name : 'Individual Mode'}
        </span>
        {!switching && <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-[var(--color-surface-raised)] rounded-lg shadow-xl border border-[var(--color-border)] py-2 z-50 animate-slideDown">
          <div className="px-3 py-2 border-b border-[var(--color-divider)]">
            <p className="text-xs font-semibold text-[var(--color-text-muted)] uppercase">Switch Team</p>
          </div>

          <div className="max-h-64 overflow-y-auto">
            <button
              onClick={() => handleTeamSwitch(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleTeamSwitch(null)
                }
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] focus:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)] transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={switching}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-[var(--color-surface)] rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-[var(--color-text-secondary)]" />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Individual Mode</p>
                  <p className="text-xs text-[var(--color-text-muted)]">Work independently</p>
                </div>
              </div>
              {!activeTeam && (
                <Check className="w-4 h-4 text-[var(--color-accent)]" />
              )}
            </button>

            {teams.length > 0 && (
              <div className="border-t border-[var(--color-divider)] mt-2 pt-2">
                {teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => handleTeamSwitch(team.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleTeamSwitch(team.id)
                      }
                    }}
                    className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] focus:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)] transition-colors flex items-center justify-between group disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={switching}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-[var(--color-accent)]">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-[var(--color-text-muted)] truncate">{team.description}</p>
                        )}
                      </div>
                    </div>
                    {activeTeam?.id === team.id && (
                      <Check className="w-4 h-4 text-[var(--color-accent)] flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--color-divider)] mt-2 pt-2">
            <button
              onClick={handleCreateTeam}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCreateTeam()
                }
              }}
              className="w-full px-3 py-2 text-left hover:bg-[var(--color-surface-hover)] focus:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-[var(--color-focus)] transition-colors flex items-center gap-2 text-[var(--color-accent)] font-medium"
            >
              <Plus className="w-4 h-4" />
              <span className="text-sm">Create New Team</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
