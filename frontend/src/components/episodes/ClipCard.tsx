import { useNavigate } from 'react-router-dom'
import type { ClipListView } from '../../types'

interface ClipCardProps {
  clip: ClipListView
  episodeId: string
  onPlay: (clipId: string) => void
  onApprove: (clipId: string) => void
  onReject: (clipId: string) => void
  onRetry?: (clipId: string) => void
}

const statusConfig: Record<string, { colors: string; label: string; icon?: JSX.Element }> = {
  Proposed: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Proposed'
  },
  Processing: {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Processing',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  Created: {
    colors: 'bg-green-50 text-green-700 border-green-200',
    label: 'Created',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  Failed: {
    colors: 'bg-red-50 text-red-700 border-red-200',
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

export function ClipCard({ clip, episodeId, onPlay, onApprove, onReject, onRetry }: ClipCardProps) {
  const navigate = useNavigate()
  const config = statusConfig[clip.status] || statusConfig.Proposed
  const canPlay = clip.status === 'Created'
  const canApprove = clip.status === 'Created'
  const canReject = clip.status === 'Created'
  const canRetry = clip.status === 'Failed'

  const handleCardClick = () => {
    navigate(`/episodes/${episodeId}/clips/${clip.id}`)
  }

  const handleButtonClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation()
    action()
  }

  return (
    <div
      onClick={handleCardClick}
      className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
            {clip.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {clip.summary}
          </p>
        </div>
        <span
          className={`ml-3 inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${config.colors}`}
          title={clip.status === 'Failed' && clip.error ? clip.error : undefined}
        >
          {config.icon}
          {config.label}
        </span>
      </div>

      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{formatDuration(clip.duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
          </svg>
          <span>{clip.segmentCount} segment{clip.segmentCount !== 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {canRetry && onRetry && (
          <button
            onClick={(e) => handleButtonClick(e, () => onRetry(clip.id))}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry Generation
          </button>
        )}
        {canPlay && (
          <button
            onClick={(e) => handleButtonClick(e, () => onPlay(clip.id))}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
            Play
          </button>
        )}
        {canApprove && (
          <button
            onClick={(e) => handleButtonClick(e, () => onApprove(clip.id))}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
        )}
        {canReject && (
          <button
            onClick={(e) => handleButtonClick(e, () => onReject(clip.id))}
            className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-error text-white text-sm font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error transition-colors"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
            Reject
          </button>
        )}
      </div>
    </div>
  )
}
