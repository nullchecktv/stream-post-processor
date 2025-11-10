export type Platform = 'linkedin live' | 'X' | 'twitch' | 'youtube'

export type EpisodeStatus = 'draft' | 'processing' | 'published' | 'archived'

export interface EpisodeListView {
  id: string
  title: string
  status?: string
  airDate?: string
}

export interface Episode {
  id: string
  title: string
  status: EpisodeStatus
  episodeNumber: number
  description?: string
  airDate?: string
  platforms?: Platform[]
  themes?: string[]
  seriesName?: string
  createdAt: string
  updatedAt: string
}

export interface Team {
  id: string
  name: string
  description?: string
  ownerId: string
  status: 'active' | 'archived'
  settings?: {
    defaultPlatforms?: Platform[]
    timezone?: string
  }
  createdAt: string
  updatedAt: string
}

export interface TeamMembership {
  teamId: string
  name: string
  description?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  teamStatus: string
}

export interface UserProfile {
  email: string
  name: string
  activeTeamId: string | null
  preferences?: {
    timezone?: string
    notifications?: boolean
  }
  teams: TeamMembership[]
  ownedTeams: TeamMembership[]
  memberTeams: TeamMembership[]
  createdAt: string
  updatedAt: string
}

export interface TeamMember {
  userId: string
  email: string
  name?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  invitedBy?: string
  inviterName?: string
}

export interface PendingInvitation {
  email: string
  role: 'administrator' | 'member'
  invitedBy: string
  inviterName: string
  invitedAt: string
  expiresAt: string
}

export interface Notification {
  id: string
  type: 'team_invitation' | 'member_added' | 'member_removed' | 'role_changed' | 'clip_processed'
  title: string
  message: string
  data?: {
    teamId?: string
    teamName?: string
    inviterName?: string
    invitationId?: string
    [key: string]: unknown
  }
  isRead: boolean
  createdAt: string
}

export interface ApiError {
  error: string
  message: string
  details?: Record<string, unknown>
}
