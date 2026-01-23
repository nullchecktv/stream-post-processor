import { useState } from 'react'

interface ClipSegment {
  speaker?: string | null
  startTime: string
  endTime: string
  order: number
}

interface ClipQualityIndicatorProps {
  segments: ClipSegment[]
  trackCount: number
  hasSpeakers: boolean
}

export function ClipQualityIndicator({ segments, trackCount, hasSpeakers }: ClipQualityIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  if (trackCount <= 1) {
    return null
  }

  if (hasSpeakers) {
    const allSegmentsHaveSpeakers = segments.every(s => s.speaker)

    if (allSegmentsHaveSpeakers) {
      return (
        <div className="relative inline-block">
          <div
            className="flex items-center gap-1.5 px-[var(--space-2)] py-[var(--space-1)] bg-[var(--color-surface)] border border-[var(--color-success)] rounded-[var(--radius-sm)] text-[length:var(--text-xs)] font-medium text-[var(--color-success)]"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          >
            <svg className="w-3.5 h-3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Optimal</span>
          </div>
          {showTooltip && (
            <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 px-[var(--space-3)] py-[var(--space-2)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] text-[length:var(--text-xs)] rounded-[var(--radius-sm)] shadow-lg pointer-events-none border border-[var(--color-border)]">
              All segments have speaker attribution for optimal track selection
              <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--color-surface-raised)]" />
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <div className="relative inline-block">
      <div
        className="flex items-center gap-1.5 px-[var(--space-2)] py-[var(--space-1)] bg-[var(--color-surface)] border border-[var(--color-warning)] rounded-[var(--radius-sm)] text-[length:var(--text-xs)] font-medium text-[var(--color-warning)]"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        <svg className="w-3.5 h-3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <span>Fallback</span>
      </div>
      {showTooltip && (
        <div className="absolute z-10 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 px-[var(--space-3)] py-[var(--space-2)] bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] text-[length:var(--text-xs)] rounded-[var(--radius-sm)] shadow-lg pointer-events-none border border-[var(--color-border)]">
          Using fallback track selection. Add speaker labels to your transcript for better results.
          <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-[var(--color-surface-raised)]" />
        </div>
      )}
    </div>
  )
}
