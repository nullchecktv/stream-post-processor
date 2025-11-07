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

export interface ApiError {
  error: string
  message: string
  details?: Record<string, unknown>
}
