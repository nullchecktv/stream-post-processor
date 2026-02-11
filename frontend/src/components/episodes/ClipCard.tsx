import { useNavigate } from 'react-router-dom'
import type { ClipListView, ClipOrientation } from '../../types'
import { ClipQualityIndicator } from './ClipQualityIndicator'
import { Badge } from '../common/Badge'
import Card from '../common/Card'

interface ClipCardProps {
  clip: ClipListView
  episodeId: string
  trackCount: number
  hasSpeakers: boolean
  orientation?: ClipOrientation
  onPlay: (clipId: string) => void
  onRetry?: (clipId: string) => void
}

const getStatusVariant = (status: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'Created':
      return 'success'
    case 'Processing':
      return 'info'
    case 'Failed':
      return 'error'
    case 'Proposed':
    default:
      return 'warning'
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'Processing':
      return (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )
    case 'Created':
      return (
        <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'Failed':
      return (
        <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    default:
      return null
  }
}

function formatDuration(seconds?: number): string {
  const safe = typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : 0
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export function ClipCard({ clip, episodeId, trackCount, hasSpeakers, orientation = 'landscape', onPlay, onRetry }: ClipCardProps) {
  const navigate = useNavigate()
  const canPlay = clip.status === 'Created'
  const canRetry = clip.status === 'Failed'

  const handleCardClick = () => {
    navigate(`/episodes/${episodeId}/clips/${clip.id}`)
  }

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  const aspectRatio = orientation === 'landscape' ? 'landscape' : 'portrait'

  return (
    <Card aspectRatio={aspectRatio} hoverable onClick={handleCardClick}>
      <div className="h-full flex flex-col">
        {/* Video thumbnail area */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          {clip.status === 'Created' ? (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-16 h-16 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          ) : clip.status === 'Processing' ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/60">
              <svg className="w-12 h-12 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span className="text-xs">Generating...</span>
            </div>
          ) : clip.status === 'Failed' ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-red-400">
              <svg className="w-12 h-12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-xs">Generation Failed</span>
            </div>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-white/40">
              <svg className="w-12 h-12" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-xs">Not Generated</span>
            </div>
          )}

          {/* Duration badge */}
          {clip.duration && (
            <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(clip.duration)}
            </div>
          )}
        </div>

        {/* Content area */}
        <div className="p-3 space-y-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)] line-clamp-2 flex-1">
              {clip.title}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ClipQualityIndicator
                segments={clip.segments || []}
                trackCount={trackCount}
                hasSpeakers={hasSpeakers}
              />
              <Badge
                variant={getStatusVariant(clip.status)}
                size="sm"
                icon={getStatusIcon(clip.status)}
              >
                {clip.status}
              </Badge>
            </div>
          </div>

          {clip.summary && (
            <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
              {clip.summary}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              <span>{clip.segmentCount} segment{clip.segmentCount !== 1 ? 's' : ''}</span>
            </div>
          </div>

          {(canPlay || canRetry) && (
            <div className="flex items-center gap-2 pt-2">
              {canRetry && onRetry && (
                <button
                  onClick={(e) => handleButtonClick(e, () => onRetry(clip.id))}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--color-warning)] text-white text-xs font-medium rounded hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors"
                >
                  <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </button>
              )}
              {canPlay && (
                <button
                  onClick={(e) => handleButtonClick(e, () => onPlay(clip.id))}
                  className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-1.5 bg-[var(--color-accent)] text-white text-xs font-medium rounded hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors"
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
                  </svg>
                  Play
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
