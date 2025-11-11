import { apiRequest } from './client'
import { apiCache } from '../utils/cache'
import type { Team, TeamMember, PendingInvitation, BrandingConfig } from '../types'

interface ListTeamsResponse {
  items: Team[]
  count: number
}

interface CreateTeamData {
  name: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
}

interface CreateTeamResponse {
  id: string
}

interface UpdateTeamData {
  name?: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
  branding?: BrandingConfig
}

interface ListMembersParams {
  cursor?: string
  limit?: number
}

interface ListMembersResponse {
  members: TeamMember[]
  pendingInvitations: PendingInvitation[]
  nextCursor?: string
  hasMore: boolean
}

interface InviteMemberData {
  email: string
  role: string
}

interface InviteMemberResponse {
  email: string
  role: string
  status: string
  invitationSent: boolean
  message: string
}

interface UpdateMemberRoleData {
  role: string
}

interface UpdateMemberRoleResponse {
  userId: string
  role: string
  updatedAt: string
  message: string
}

export const teamsApi = {
  listTeams: () => apiRequest<ListTeamsResponse>('/teams'),

  createTeam: async (data: CreateTeamData) => {
    const result = await apiRequest<CreateTeamResponse>('/teams', {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidate('GET:/teams')
    return result
  },

  getTeam: (teamId: string) => apiRequest<Team>(`/teams/${teamId}`),

  updateTeam: async (teamId: string, data: UpdateTeamData) => {
    await apiRequest<void>(`/teams/${teamId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/teams/${teamId}`)
    apiCache.invalidate('GET:/teams')
  },

  deleteTeam: async (teamId: string) => {
    await apiRequest<void>(`/teams/${teamId}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/teams/${teamId}`)
    apiCache.invalidate('GET:/teams')
  },

  listMembers: (teamId: string, params?: ListMembersParams) => {
    const query = new URLSearchParams()
    if (params?.cursor) query.append('cursor', params.cursor)
    if (params?.limit) query.append('limit', params.limit.toString())
    const queryString = query.toString()
    return apiRequest<ListMembersResponse>(
      `/teams/${teamId}/members${queryString ? `?${queryString}` : ''}`
    )
  },

  inviteMember: async (teamId: string, data: InviteMemberData) => {
    const result = await apiRequest<InviteMemberResponse>(`/teams/${teamId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    })
    apiCache.invalidate(`GET:/teams/${teamId}/members`)
    return result
  },

  updateMemberRole: async (teamId: string, userId: string, data: UpdateMemberRoleData) => {
    const result = await apiRequest<UpdateMemberRoleResponse>(
      `/teams/${teamId}/members/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify(data),
      }
    )
    apiCache.invalidate(`GET:/teams/${teamId}/members`)
    return result
  },

  removeMember: async (teamId: string, userId: string, confirmDelete?: boolean) => {
    const query = confirmDelete ? '?confirmDelete=true' : ''
    await apiRequest<void>(`/teams/${teamId}/members/${userId}${query}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/teams/${teamId}/members`)
  },

  leaveTeam: async (teamId: string) => {
    await apiRequest<void>(`/teams/${teamId}/members/me`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/teams/${teamId}/members`)
    apiCache.invalidate('GET:/teams')
  },

  cancelInvitation: async (teamId: string, email: string) => {
    await apiRequest<void>(`/teams/${teamId}/invitations/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    })
    apiCache.invalidate(`GET:/teams/${teamId}/members`)
  },
}
