import { useMemo } from 'react'
import { useUser } from './useUser'

interface TeamPermissions {
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canUpdateRoles: boolean
  canUpdateTeam: boolean
  canDeleteTeam: boolean
  canCancelInvitations: boolean
}

export function useTeamPermissions(teamId: string): TeamPermissions {
  const { profile } = useUser()

  return useMemo(() => {
    const membership = profile?.teams.find(m => m.teamId === teamId)

    const role = membership?.role
    const isOwner = role === 'owner'
    const isAdmin = role === 'administrator'

    return {
      canInviteMembers: isOwner || isAdmin,
      canRemoveMembers: isOwner || isAdmin,
      canUpdateRoles: isOwner,
      canUpdateTeam: isOwner,
      canDeleteTeam: isOwner,
      canCancelInvitations: isOwner || isAdmin,
    }
  }, [teamId, profile?.teams])
}
