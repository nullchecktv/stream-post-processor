import type {
  PlatformType,
  Branding,
  StatusHistoryEntry
} from '@schemas/common'
import type { EpisodeStatusType } from '@schemas/episodes'
import type { ClipStatusType, ClipOrientationType } from '@schemas/clips'
import type { QuoteStatusType } from '@schemas/quotes'
import type { TeamStatusType, MembershipStatusType, MemberRoleType } from '@schemas/teams'
import type { BlogStatusType } from '@schemas/blogs'

export type Platform = PlatformType
export type EpisodeStatus = EpisodeStatusType
export type ClipOrientation = ClipOrientationType
export type ClipStatus = ClipStatusType
export type QuoteStatus = QuoteStatusType
export type TeamStatus = TeamStatusType
export type MembershipStatus = MembershipStatusType
export type MemberRole = MemberRoleType
export type BlogStatus = BlogStatusType
export type BrandingConfig = Branding

export type { StatusHistoryEntry }

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
  metrics?: {
    hasTranscript: boolean
    hasPlan: boolean
    tracksCount: number
  }
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

export interface ClipListView {
  id: string
  episodeId: string
  title: string
  status: ClipStatus
  duration: number
  transcript: string
  segmentCount: number
  summary?: string
  clipType?: string
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
  objectives: string[]
  concepts: string[]
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

export interface OutlineSection {
  section: string
  duration: string
  talkingPoints: string[]
  demoArtifacts?: string[]
}

export interface Recommendations {
  suggestedFlow: string
  proposedTitle: string
  proposedDescription: string
  keyLearningMoments: string[]
  detailedOutline: OutlineSection[]
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
  status: TeamStatus
  settings?: {
    defaultPlatforms?: Platform[]
    timezone?: string
  }
  branding?: BrandingConfig
  createdAt: string
  updatedAt: string
}

export interface TeamMembership {
  teamId: string
  name: string
  description?: string
  role: MemberRole
  status: MembershipStatus
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
  branding?: BrandingConfig
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
  role: MemberRole
  status: MembershipStatus
  joinedAt: string
  invitedBy?: string
  inviterName?: string
}

export interface PendingInvitation {
  email: string
  role: Exclude<MemberRole, 'owner'>
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

export interface Quote {
  id: string
  text: string
  speaker: string
  timestamp: string
  relevanceScore?: number
  status: QuoteStatus
  imageUrl?: string
  createdAt: string
}

export interface QuoteDetail extends Quote {
  showSpeaker: boolean
  showEpisodeTitle: boolean
  updatedAt: string
}

export interface ApiError {
  error: string
  message: string
  details?: Record<string, unknown>
}

export interface BlogData {
  episodeId: string
  outline: string | null
  content: string | null
  status: BlogStatus
  wordCount: number | null
  createdAt: string | null
  updatedAt: string | null
}
