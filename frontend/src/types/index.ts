export type Platform = 'linkedin live' | 'X' | 'twitch' | 'youtube'

export type EpisodeStatus = 'draft' | 'processing' | 'published' | 'archived' | 'Ready for Clip Gen'

export interface EpisodeListView {
  id: string
  title: string
  episodeNumber: number
  status: string
  airDate?: string
  platforms?: Platform[]
  themes?: string[]
  createdAt: string
  updatedAt: string
}

export interface StatusHistoryEntry {
  status: string
  timestamp: string
  duration?: number
  metadata?: Record<string, unknown>
}

export interface TrackInfo {
  name: string
  status: string
  filename?: string
  uploadedAt?: string
  speakers?: string[]
}

export interface TranscriptInfo {
  filename: string
  uploadedAt: string
  status: string
}

export interface ClipSegment {
  startTime: string
  endTime: string
  speaker?: string
  order: number
}

export interface ClipListView {
  id: string
  episodeId: string
  title: string
  hook: string
  status: 'detected' | 'processing' | 'processed' | 'approved' | 'rejected' | 'published'
  duration: number
  segments: ClipSegment[]
  createdAt: string
  updatedAt: string
}

export interface EpisodeDetail extends EpisodeListView {
  description?: string
  seriesName?: string
  statusHistory: StatusHistoryEntry[]
  tracks: TrackInfo[]
  transcript?: TranscriptInfo
  clips: ClipListView[]
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
  metrics: {
    tracksCount: number
    hasTranscript: boolean
    clipsCount: number
  }
  statusHistory?: Array<{
    status: string
    timestamp: string
  }>
  createdAt: string
  updatedAt: string
}

export interface Plan {
  objectives: string
  concepts: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface UploadState {
  id: string
  episodeId: string
  type: 'transcript' | 'track'
  trackName?: string
  filename: string
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'failed'
  progress: number
  error?: string
  startedAt: string
  completedAt?: string
}

export interface Activity {
  id: string
  type: 'clip_detected' | 'clip_processed' | 'clip_failed' | 'preprocessing_completed' | 'preprocessing_failed' | 'status_changed'
  title: string
  message: string
  episodeId: string
  clipId?: string
  isRead: boolean
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface Recommendations {
  suggestedFlow: string
  proposedTitle: string
  proposedDescription: string
  keyLearningMoments: string[]
  generatedAt: string
}

export interface EpisodePlan {
  episodeId: string
  plan: Plan
  recommendations: Recommendations | null
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
