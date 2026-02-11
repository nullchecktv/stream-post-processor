import { Badge } from '../common/Badge'

interface TrackStatusProps {
  trackCount: number
  hasSpeakers: boolean
  speakers: string[]
  onShowGuidance?: () => void
}

export function TrackStatus({ trackCount, hasSpeakers, speakers, onShowGuidance }: TrackStatusProps) {
  if (trackCount === 0) {
    return (
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-[var(--color-text-muted)] mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">No video tracks uploaded yet</p>
            <p className="text-xs text-[var(--color-text-secondary)] mt-1">Upload video tracks to begin processing</p>
          </div>
        </div>
      </div>
    )
  }

  if (trackCount === 1) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Single track - speaker attribution optional</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              All clips will use your single video track. Speaker labels are optional but can be included for reference.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (hasSpeakers) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800 dark:text-green-300">{trackCount} tracks with speaker attribution</p>
            <p className="text-xs text-green-700 dark:text-green-400 mt-1">
              Clips will use optimal track selection based on speaker attribution
            </p>
            {speakers.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {speakers.map((speaker) => (
                  <Badge key={speaker} variant="success" size="sm">
                    {speaker}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">{trackCount} tracks without speaker attribution</p>
          <p className="text-xs text-amber-700 mt-1">
            For optimal clip quality, add speaker labels to your transcript. Speakers help match segments to the correct video track.
          </p>
          {onShowGuidance && (
            <button
              onClick={onShowGuidance}
              className="mt-2 text-xs font-medium text-amber-700 hover:text-amber-800 underline focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
            >
              Learn how to add speakers
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
