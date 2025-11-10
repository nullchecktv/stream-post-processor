import type { ClipListView } from '../../types'

interface ClipCardProps {
  clip: ClipListView
  onPlay: (clipId: string) => void
  onApprove: (clipId: string) => void
  onReject: (clipId: string) => void
}

const statusConfig = {
  detected: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Proposed'
  },
  proposed: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Proposed'
  },
  processing: {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Processing'
  },
  processed: {
    colors: 'bg-green-50 text-green-700 border-green-200',
    label: 'Processed'
  },
  approved: {
    colors: 'bg-primary/10 text-primary border-primary/20',
    label: 'Approved'
  },
  rejected: {
    colors: 'bg-red-50 text-red-700 border-red-200',
    label: 'Rejected'
  },
  published: {
    colors: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Published'
  }
}

function formatDuration(seconds?: number): string {
  const safe = typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : 0
  const mins = Math.floor(safe / 60)
  const secs = safe % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function formatTimestamp(timestamp: string): string {
  const parts = timestamp.split(':')
  if (parts.length === 3) {
    const hours = parseInt(parts[0])
    const mins = parseInt(parts[1])
    const secs = Math.floor(parseFloat(parts[2]))

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  return timestamp
}

export function ClipCard({ clip, onPlay, onApprove, onReject }: ClipCardProps) {
  const config = statusConfig[clip.status] || statusConfig.proposed
  const canPlay = clip.status === 'processed' || clip.status === 'approved' || clip.status === 'rejected' || clip.status === 'published'
  const canApprove = clip.status === 'processed'
  const canReject = clip.status === 'processed'
  const segments = Array.isArray(clip.segments) ? clip.segments : []

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-gray-900 truncate mb-1">
            {clip.title}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-2">
            {clip.hook}
          </p>
        </div>
        <span
          className={`ml-3 inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-lg border ${config.colors}`}
        >
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
          <span>{segments.length} segment{segments.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {segments.length > 0 && (
        <div className="mb-4 space-y-2">
          <p className="text-xs font-medium text-gray-700 uppercase tracking-wide">Segments</p>
          <div className="space-y-1.5">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded px-2 py-1.5">
                <span className="font-medium text-gray-900">#{segment.order}</span>
                <span className="text-gray-400">•</span>
                <span>{formatTimestamp(segment.startTime)} - {formatTimestamp(segment.endTime)}</span>
                {segment.speaker && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="text-gray-700">{segment.speaker}</span>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2">
        {canPlay && (
          <button
            onClick={() => onPlay(clip.id)}
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
            onClick={() => onApprove(clip.id)}
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
            onClick={() => onReject(clip.id)}
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
