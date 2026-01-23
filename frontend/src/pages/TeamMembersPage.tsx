import { useEffect, useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { useDebounce } from '../hooks/useDebounce'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Modal } from '../components/common/Modal'
import { Breadcrumb } from '../components/common/Breadcrumb'
import type { Team, TeamMember, PendingInvitation } from '../types'
import { z } from 'zod'

const inviteMemberSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['administrator', 'member']),
})

type InviteMemberFormData = z.infer<typeof inviteMemberSchema>

function TeamMembersPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { teams, loading: teamsLoading, fetchMembers, inviteMember, updateMemberRole, removeMember, cancelInvitation } = useTeams()
  const { profile } = useUser()
  const { showToast } = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [members, setMembers] = useState<TeamMember[]>([])
  const [pendingInvitations, setPendingInvitations] = useState<PendingInvitation[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [formData, setFormData] = useState<InviteMemberFormData>({
    email: '',
    role: 'member',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  usePageTitle(team ? `${team.name} - Members` : 'Team Members')

  useEffect(() => {
    if (!teamsLoading && teamId) {
      const foundTeam = teams.find(t => t.id === teamId)
      if (foundTeam) {
        setTeam(foundTeam)
        loadMembers(teamId)
      } else {
        navigate('/teams')
      }
    }
  }, [teamId, teams, teamsLoading, navigate])

  const loadMembers = async (id: string) => {
    try {
      setLoading(true)
      const data = await fetchMembers(id)
      setMembers(data.members)
      setPendingInvitations(data.pendingInvitations)
    } catch (err) {
      console.error('Failed to load members:', err)
      showToast('Failed to load team members', 'error')
    } finally {
      setLoading(false)
    }
  }

  const getUserRole = (): string => {
    if (!team || !profile) return 'member'
    const membership = profile.teams.find(m => m.teamId === team.id)
    return membership?.role || 'member'
  }

  const canManageMembers = (): boolean => {
    const role = getUserRole()
    return role === 'owner' || role === 'administrator'
  }

  const canUpdateRoles = (): boolean => {
    return getUserRole() === 'owner'
  }

  const filteredMembers = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return members

    const query = debouncedSearchQuery.toLowerCase()
    return members.filter(member =>
      member.name?.toLowerCase().includes(query) ||
      member.email.toLowerCase().includes(query)
    )
  }, [members, debouncedSearchQuery])

  const handleInviteMember = () => {
    setIsInviteModalOpen(true)
  }

  const handleCloseModal = () => {
    if (!submitting) {
      setIsInviteModalOpen(false)
      setFormData({ email: '', role: 'member' })
      setErrors({})
    }
  }

  const handleChange = (field: keyof InviteMemberFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team) return

    try {
      const validated = inviteMemberSchema.parse(formData)
      setErrors({})
      setSubmitting(true)

      await inviteMember(team.id, validated.email, validated.role)
      handleCloseModal()
      await loadMembers(team.id)
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
        console.error('Failed to invite member:', err)
        showToast('Failed to send invitation. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (!team) return

    try {
      await updateMemberRole(team.id, userId, newRole)
      await loadMembers(team.id)
    } catch (err) {
      console.error('Failed to update role:', err)
      showToast('Failed to update member role. Please try again.', 'error')
    }
  }

  const handleRemoveMember = async (userId: string, memberName?: string) => {
    if (!team) return

    const confirmed = window.confirm(
      `Are you sure you want to remove ${memberName || 'this member'} from the team?`
    )

    if (!confirmed) return

    try {
      await removeMember(team.id, userId)
      await loadMembers(team.id)
    } catch (err) {
      console.error('Failed to remove member:', err)
      showToast('Failed to remove member. Please try again.', 'error')
    }
  }

  const handleCancelInvitation = async (email: string) => {
    if (!team) return

    const confirmed = window.confirm(
      `Are you sure you want to cancel the invitation for ${email}?`
    )

    if (!confirmed) return

    try {
      await cancelInvitation(team.id, email)
      await loadMembers(team.id)
    } catch (err) {
      console.error('Failed to cancel invitation:', err)
      showToast('Failed to cancel invitation. Please try again.', 'error')
    }
  }

  const canManage = canManageMembers()
  const canUpdateRole = canUpdateRoles()

  return (
    <div className="relative min-h-full">
      {(teamsLoading || loading || !team) && <LoadingSpinner variant="page" />}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <Breadcrumb />
        <div className="mb-6 sm:mb-8">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--color-text-primary)]">Team Members</h1>
              <p className="text-sm sm:text-base text-[var(--color-text-secondary)] mt-1">{team?.name}</p>
            </div>
            {canManage && (
              <Button onClick={handleInviteMember} variant="primary" className="w-full sm:w-auto">
                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Invite Member
              </Button>
            )}
          </div>

          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {canManage && pendingInvitations.length > 0 && (
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-4">Pending Invitations</h2>
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <div
                  key={invitation.email}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{invitation.email}</p>
                    <p className="text-xs sm:text-sm text-[var(--color-text-muted)]">
                      Invited by {invitation.inviterName} • {invitation.role}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleCancelInvitation(invitation.email)}
                    variant="ghost"
                    size="sm"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-md">
          <div className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-4">
              Members ({filteredMembers.length})
            </h2>

            {filteredMembers.length === 0 ? (
              <div className="text-center py-6 sm:py-8 text-[var(--color-text-muted)]">
                <p className="text-sm">No members found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.map((member) => {
                  const isOwner = member.role === 'owner'
                  const isCurrentUser = member.userId === profile?.email

                  return (
                    <div
                      key={member.userId}
                      className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 border border-[var(--color-border)] rounded-[var(--radius-lg)] hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className="w-10 h-10 bg-[var(--color-accent)] rounded-[var(--radius-full)] flex items-center justify-center text-[var(--color-text-on-accent)] font-semibold flex-shrink-0">
                          {((member.name || member.email || 'U').charAt(0).toUpperCase())}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-medium text-[var(--color-text-primary)] text-sm sm:text-base truncate">
                              {member.name || member.email || 'Unknown User'}
                              {isCurrentUser && (
                                <span className="ml-2 text-xs sm:text-sm text-[var(--color-text-muted)]">(You)</span>
                              )}
                            </p>
                            {isOwner && (
                              <span className="px-2 py-1 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-xs rounded-[var(--radius-full)] flex-shrink-0">
                                Owner
                              </span>
                            )}
                          </div>
                          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)] truncate">{member.email}</p>
                          <p className="text-xs text-[var(--color-text-muted)]">
                            Joined {new Date(member.joinedAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 sm:flex-shrink-0">
                        {canUpdateRole && !isOwner && !isCurrentUser && (
                          <select
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.userId, e.target.value)}
                            className="flex-1 sm:flex-initial px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-lg)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] min-h-[44px] bg-[var(--color-surface)] text-[var(--color-text-primary)]"
                          >
                            <option value="administrator">Administrator</option>
                            <option value="member">Member</option>
                          </select>
                        )}

                        {!canUpdateRole && !isOwner && (
                          <span className={`px-3 py-1 rounded-[var(--radius-full)] text-xs font-medium ${
                            member.role === 'administrator' ? 'bg-[var(--color-info)]/10 text-[var(--color-info)]' : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)]'
                          }`}>
                            {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                          </span>
                        )}

                        {canManage && !isOwner && !isCurrentUser && (
                          <Button
                            onClick={() => handleRemoveMember(member.userId, member.name)}
                            variant="danger"
                            size="sm"
                            className="flex-1 sm:flex-initial"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={isInviteModalOpen} onClose={handleCloseModal} title="Invite Team Member" size="md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            error={errors.email}
            placeholder="member@example.com"
            required
            disabled={submitting}
          />

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
              Role
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => handleChange('role', e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-[var(--radius-lg)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-primary)]"
            >
              <option value="member">Member</option>
              <option value="administrator">Administrator</option>
            </select>
            {errors.role && (
              <p className="mt-1 text-sm text-[var(--color-error)]">{errors.role}</p>
            )}
          </div>

          <div className="bg-[var(--color-info)]/10 border border-[var(--color-info)] rounded-[var(--radius-lg)] p-3 text-sm text-[var(--color-info)]">
            <p className="font-medium mb-1">Role Permissions:</p>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li><strong>Member:</strong> Can view and create content</li>
              <li><strong>Administrator:</strong> Can manage members and content</li>
              <li><strong>Owner:</strong> Full control including team deletion</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-3 pt-4">
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
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default TeamMembersPage

