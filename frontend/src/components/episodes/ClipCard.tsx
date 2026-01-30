import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import type { ClipListView, ClipOrientation } from '../../types'
import { ClipQualityIndicator } from './ClipQualityIndicator'
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

const statusConfig: Record<string, { colors: string; label: string; icon?: ReactNode }> = {
  Proposed: {
    colors: 'text-[var(--color-warning)] border-[var(--color-warning)]',
    label: 'Proposed'
  },
  Processing: {
    colors: 'text-[var(--color-info)] border-[var(--color-info)]',
    label: 'Processing',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  Created: {
    colors: 'text-[var(--color-success)] border-[var(--color-success)]',
    label: 'Created',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  Failed: {
    colors: 'text-[var(--color-error)] border-[var(--color-error)]',
    label: 'Failed',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
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
  const config = statusConfig[clip.status] || statusConfig.Proposed
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
          ) : (
            <div className="text-white text-4xl">
              <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
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
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
              {clip.title}
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <ClipQualityIndicator
                segments={clip.segments || []}
                trackCount={trackCount}
                hasSpeakers={hasSpeakers}
              />
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-semibold rounded border ${config.colors}`}
                title={clip.status === 'Failed' && clip.error ? clip.error : undefined}
              >
                {config.icon}
                {config.label}
              </span>
            </div>
          </div>

          {clip.summary && (
            <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
              {clip.summary}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
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
