import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { teamsApi } from '../api/teams'
import { usersApi } from '../api/users'
import type { Team, TeamMember, PendingInvitation } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'

interface TeamContextType {
  activeTeam: Team | null
  teams: Team[]
  loading: boolean
  error: string | null
  fetchTeams: () => Promise<void>
  createTeam: (data: CreateTeamData) => Promise<Team>
  updateTeam: (teamId: string, data: UpdateTeamData) => Promise<Team>
  deleteTeam: (teamId: string) => Promise<void>
  setActiveTeam: (teamId: string | null) => Promise<void>
  fetchMembers: (teamId: string) => Promise<{ members: TeamMember[], pendingInvitations: PendingInvitation[] }>
  inviteMember: (teamId: string, email: string, role: string) => Promise<void>
  updateMemberRole: (teamId: string, userId: string, role: string) => Promise<void>
  removeMember: (teamId: string, userId: string, confirmDelete?: boolean) => Promise<void>
  leaveTeam: (teamId: string) => Promise<void>
  cancelInvitation: (teamId: string, email: string) => Promise<void>
}

interface CreateTeamData {
  name: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
}

interface UpdateTeamData {
  name?: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
  brandVoice?: {
    tone: string
    writingStyle: string
  }
}

export const TeamContext = createContext<TeamContextType | undefined>(undefined)

interface TeamProviderProps {
  children: ReactNode
}

export function TeamProvider({ children }: TeamProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { profile, refreshProfile } = useUser()
  const { showSuccess, showError } = useToast()
  const [activeTeam, setActiveTeamState] = useState<Team | null>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTeams = useCallback(async () => {
    if (!isAuthenticated) {
      setTeams([])
      setActiveTeamState(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await teamsApi.listTeams()
      setTeams(data.items)

      if (profile?.activeTeamId) {
        const active = data.items.find(t => t.id === profile.activeTeamId)
        setActiveTeamState(active || null)
      } else {
        setActiveTeamState(null)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load teams'
      setError(errorMessage)
      setTeams([])
      setActiveTeamState(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, profile?.activeTeamId])

  const createTeam = async (data: CreateTeamData): Promise<Team> => {
    try {
      setError(null)
      const result = await teamsApi.createTeam(data)
      await fetchTeams()
      await refreshProfile()
      const newTeam = teams.find(t => t.id === result.id)
      if (!newTeam) {
        throw new Error('Failed to retrieve created team')
      }
      showSuccess(`Team "${data.name}" created successfully`)
      return newTeam
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create team'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const updateTeam = async (teamId: string, data: UpdateTeamData): Promise<Team> => {
    try {
      setError(null)
      const updatedTeam = await teamsApi.updateTeam(teamId, data)
      setTeams(prev => prev.map(t => t.id === teamId ? updatedTeam : t))
      if (activeTeam?.id === teamId) {
        setActiveTeamState(updatedTeam)
      }
      showSuccess('Team updated successfully')
      return updatedTeam
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update team'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const deleteTeam = async (teamId: string): Promise<void> => {
    try {
      setError(null)
      await teamsApi.deleteTeam(teamId)
      setTeams(prev => prev.filter(t => t.id !== teamId))
      if (activeTeam?.id === teamId) {
        setActiveTeamState(null)
        await refreshProfile()
      }
      showSuccess('Team deleted successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete team'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const setActiveTeam = async (teamId: string | null): Promise<void> => {
    try {
      setError(null)
      await usersApi.setActiveTeam(teamId)
      await refreshProfile()
      if (teamId) {
        const team = teams.find(t => t.id === teamId)
        setActiveTeamState(team || null)
      } else {
        setActiveTeamState(null)
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active team'
      setError(errorMessage)
      throw err
    }
  }

  const fetchMembers = async (teamId: string): Promise<{ members: TeamMember[], pendingInvitations: PendingInvitation[] }> => {
    try {
      setError(null)
      const data = await teamsApi.listMembers(teamId)
      return {
        members: data.members,
        pendingInvitations: data.pendingInvitations
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch members'
      setError(errorMessage)
      throw err
    }
  }

  const inviteMember = async (teamId: string, email: string, role: string): Promise<void> => {
    try {
      setError(null)
      const result = await teamsApi.inviteMember(teamId, { email, role })
      showSuccess(result.message || 'Member invited successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to invite member'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const updateMemberRole = async (teamId: string, userId: string, role: string): Promise<void> => {
    try {
      setError(null)
      await teamsApi.updateMemberRole(teamId, userId, { role })
      showSuccess('Member role updated successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update member role'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const removeMember = async (teamId: string, userId: string, confirmDelete?: boolean): Promise<void> => {
    try {
      setError(null)
      await teamsApi.removeMember(teamId, userId, confirmDelete)
      showSuccess('Member removed successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove member'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const leaveTeam = async (teamId: string): Promise<void> => {
    try {
      setError(null)
      await teamsApi.leaveTeam(teamId)
      setTeams(prev => prev.filter(t => t.id !== teamId))
      if (activeTeam?.id === teamId) {
        setActiveTeamState(null)
      }
      await refreshProfile()
      showSuccess('You have left the team')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to leave team'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  const cancelInvitation = async (teamId: string, email: string): Promise<void> => {
    try {
      setError(null)
      await teamsApi.cancelInvitation(teamId, email)
      showSuccess('Invitation cancelled successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to cancel invitation'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchTeams()
    }
  }, [authLoading, isAuthenticated, fetchTeams])

  return (
    <TeamContext.Provider
      value={{
        activeTeam,
        teams,
        loading,
        error,
        fetchTeams,
        createTeam,
        updateTeam,
        deleteTeam,
        setActiveTeam,
        fetchMembers,
        inviteMember,
        updateMemberRole,
        removeMember,
        leaveTeam,
        cancelInvitation,
      }}
    >
      {children}
    </TeamContext.Provider>
  )
}
