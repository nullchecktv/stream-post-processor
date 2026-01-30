import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDebounce } from '../hooks/useDebounce'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import type { Team } from '../types'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
})

type CreateTeamFormData = z.infer<typeof createTeamSchema>

function TeamsListPage() {
  usePageTitle('Teams')
  const navigate = useNavigate()
  const { teams, loading, activeTeam, setActiveTeam, createTeam } = useTeams()
  const { profile } = useUser()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [formData, setFormData] = useState<CreateTeamFormData>({
    name: '',
    description: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const filteredTeams = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return teams

    const query = debouncedSearchQuery.toLowerCase()
    return teams.filter(team =>
      team.name.toLowerCase().includes(query) ||
      team.description?.toLowerCase().includes(query)
    )
  }, [teams, debouncedSearchQuery])

  const [switchingTeamId, setSwitchingTeamId] = useState<string | null>(null)

  const handleTeamClick = async (teamId: string) => {
    if (activeTeam?.id !== teamId) {
      try {
        setSwitchingTeamId(teamId)
        await setActiveTeam(teamId)
      } catch (err) {
        console.error('Failed to set active team:', err)
        setSwitchingTeamId(null)
        return
      } finally {
        setSwitchingTeamId(null)
      }
    }
    navigate(`/teams/${teamId}`)
  }

  const handleCreateTeam = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    if (!submitting) {
      setIsCreateModalOpen(false)
      setFormData({ name: '', description: '' })
      setErrors({})
      setApiError(null)
    }
  }

  const handleChange = (field: keyof CreateTeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    setApiError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const validated = createTeamSchema.parse(formData)
      setErrors({})
      setApiError(null)
      setSubmitting(true)

      const newTeam = await createTeam({
        name: validated.name,
        description: validated.description || undefined,
      })

      handleCloseModal()
      navigate(`/teams/${newTeam.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error('Failed to create team:', err)
        setApiError('Failed to create team. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const getMemberCount = (team: Team): number => {
    const membership = profile?.teams.find(m => m.teamId === team.id)
    return membership ? 1 : 0
  }

  const getUserRole = (team: Team): string => {
    const membership = profile?.teams.find(m => m.teamId === team.id)
    return membership?.role || 'member'
  }

  return (
    <div className="relative min-h-full">
      {loading && <LoadingSpinner variant="page" />}
      <div className="max-w-7xl mx-auto px-[var(--space-4)] sm:px-[var(--space-6)] lg:px-[var(--space-8)] py-[var(--space-4)] sm:py-[var(--space-6)] lg:py-[var(--space-8)]">
        <div className="mb-[var(--space-6)] sm:mb-[var(--space-8)]">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-[var(--space-4)] mb-[var(--space-4)]">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Teams</h1>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mt-1">Manage your collaborative workspaces</p>
            </div>
            <Button onClick={handleCreateTeam} variant="primary" className="w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Create Team
            </Button>
          </div>

          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Search teams..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {filteredTeams.length === 0 ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-[var(--color-text-muted)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-[var(--color-text-primary)]">
              {debouncedSearchQuery ? 'No teams found' : 'No teams yet'}
            </h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">
              {debouncedSearchQuery ? 'Try adjusting your search' : 'Get started by creating a new team'}
            </p>
            {!debouncedSearchQuery && (
              <div className="mt-6">
                <Button onClick={handleCreateTeam} variant="primary" className="w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Team
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[var(--space-4)] sm:gap-[var(--space-6)]">
            {filteredTeams.map((team) => {
              const isActive = activeTeam?.id === team.id
              const role = getUserRole(team)
              const memberCount = getMemberCount(team)
              const isSwitching = switchingTeamId === team.id

              return (
                <div
                  key={team.id}
                  onClick={() => !isSwitching && handleTeamClick(team.id)}
                  className={`bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-md p-[var(--space-4)] sm:p-[var(--space-6)] transition-colors duration-[var(--duration-fast)] border border-[var(--color-border)] ${
                    isSwitching
                      ? 'opacity-50 cursor-wait'
                      : 'cursor-pointer hover:bg-[var(--color-surface-hover)] hover:shadow-lg active:scale-95 sm:hover:scale-105'
                  } ${isActive ? 'ring-2 ring-[var(--color-accent)]' : ''}`}
                >
                  {isSwitching && (
                    <div className="flex items-center text-[var(--color-text-muted)] text-xs sm:text-sm font-medium mb-2">
                      <svg className="animate-spin w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Switching...
                    </div>
                  )}
                  {!isSwitching && isActive && (
                    <div className="flex items-center text-[var(--color-accent)] text-xs sm:text-sm font-medium mb-2">
                      <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Active Team
                    </div>
                  )}

                  <h3 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">{team.name}</h3>

                  {team.description && (
                    <p className="text-[var(--color-text-secondary)] text-sm mb-4 line-clamp-2">{team.description}</p>
                  )}

                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <div className="flex items-center text-[var(--color-text-muted)]">
                      <svg className="w-4 h-4 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      {memberCount} {memberCount === 1 ? 'member' : 'members'}
                    </div>

                    <span className={`px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-md)] text-xs font-medium ${
                      role === 'owner' ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]' :
                      role === 'administrator' ? 'bg-[var(--color-surface-raised)] text-[var(--color-info)] border border-[var(--color-info)]' :
                      'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)]'
                    }`}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <Modal isOpen={isCreateModalOpen} onClose={handleCloseModal} title="Create New Team" size="md">
        <form onSubmit={handleSubmit} className="space-y-[var(--space-4)]">
          {apiError && (
            <div className="bg-[var(--color-error)]/10 border border-[var(--color-error)] rounded-[var(--radius-md)] p-[var(--space-3)] text-sm text-[var(--color-error)] animate-slideDown">
              {apiError}
            </div>
          )}

          <Input
            label="Team Name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter team name"
            required
            disabled={submitting}
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter team description"
              disabled={submitting}
              rows={3}
              className="w-full px-[var(--space-3)] py-[var(--space-2)] border border-[var(--color-border)] rounded-[var(--radius-md)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-[var(--color-error)]">{errors.description}</p>
            )}
          </div>

          <div className="flex justify-end space-x-[var(--space-3)] pt-[var(--space-4)]">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCloseModal}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Create Team
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TeamsListPage

