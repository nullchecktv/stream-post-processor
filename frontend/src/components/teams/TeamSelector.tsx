import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, Users, Plus, Check } from 'lucide-react'
import { useTeams } from '../../hooks/useTeams'
import { useToast } from '../../hooks/useToast'

export function TeamSelector() {
  const { activeTeam, teams, setActiveTeam, loading } = useTeams()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
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
    try {
      setSwitching(true)
      await setActiveTeam(teamId)
      setIsOpen(false)

      if (teamId) {
        const team = teams.find(t => t.id === teamId)
        showToast(`Switched to ${team?.name}`, 'success')
      } else {
        showToast('Switched to Individual Mode', 'success')
      }
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Failed to switch team', 'error')
    } finally {
      setSwitching(false)
    }
  }

  const handleCreateTeam = () => {
    setIsOpen(false)
    navigate('/teams/new')
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-white/10 rounded-lg">
        <Users className="w-4 h-4" />
        <span className="text-sm">Loading...</span>
      </div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-white/30"
        aria-label="Select team"
        aria-expanded={isOpen}
        aria-haspopup="true"
        disabled={switching}
      >
        <Users className="w-4 h-4" />
        <span className="text-sm font-medium max-w-32 truncate">
          {activeTeam ? activeTeam.name : 'Individual Mode'}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50 animate-slideDown">
          <div className="px-3 py-2 border-b border-gray-200">
            <p className="text-xs font-semibold text-gray-500 uppercase">Switch Team</p>
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
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors flex items-center justify-between group"
              disabled={switching}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <Users className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Individual Mode</p>
                  <p className="text-xs text-gray-500">Work independently</p>
                </div>
              </div>
              {!activeTeam && (
                <Check className="w-4 h-4 text-primary" />
              )}
            </button>

            {teams.length > 0 && (
              <div className="border-t border-gray-200 mt-2 pt-2">
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
                    className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors flex items-center justify-between group"
                    disabled={switching}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-primary">
                          {team.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{team.name}</p>
                        {team.description && (
                          <p className="text-xs text-gray-500 truncate">{team.description}</p>
                        )}
                      </div>
                    </div>
                    {activeTeam?.id === team.id && (
                      <Check className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 mt-2 pt-2">
            <button
              onClick={handleCreateTeam}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleCreateTeam()
                }
              }}
              className="w-full px-3 py-2 text-left hover:bg-gray-50 focus:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary transition-colors flex items-center gap-2 text-primary font-medium"
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
