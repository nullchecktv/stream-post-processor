import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClipListView } from '../../types'

interface ClipsCardProps {
  readonly episodeId: string
  readonly clips: ClipListView[]
  readonly isLoading?: boolean
  readonly isProcessing?: boolean
  readonly canGenerate?: boolean
  readonly error?: string | null
}

function ClipsCardComponent({
  episodeId,
  clips,
  isLoading = false,
  isProcessing = false,
  canGenerate = false,
  error = null
}: ClipsCardProps) {
  const navigate = useNavigate()

  const handleViewClips = useCallback(() => {
    navigate(`/episodes/${episodeId}/clips`)
  }, [navigate, episodeId])

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]" aria-busy="true">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[var(--color-surface-raised)] rounded-full" />
            <div className="h-5 bg-[var(--color-surface-raised)] rounded w-24" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-full" />
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-error)] p-[var(--space-6)]" role="alert">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-[var(--color-error)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Error Loading Clips</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-info)] bg-opacity-10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-info)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Clips</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Processing...
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              AI is analyzing your transcript to detect clips. This may take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!clips || clips.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-surface-raised)] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Clips</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              0 clips
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              {canGenerate
                ? 'Clips will appear here after AI detection and processing.'
                : 'Upload transcript and video tracks to generate clips.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statusBreakdown = useMemo(() => {
    return clips.reduce((acc, clip) => {
      const status = clip.status.toLowerCase()
      if (status === 'proposed') {
        acc.proposed++
      } else if (status === 'processing') {
        acc.processing++
      } else if (status === 'created') {
        acc.created++
      } else if (status === 'failed') {
        acc.failed++
      }
      return acc
    }, { proposed: 0, processing: 0, created: 0, failed: 0 })
  }, [clips])

  const totalClips = clips.length

  return (
    <div
      className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-success)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)] transition-colors duration-[var(--duration-fast)] cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewClips}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewClips()
        }
      }}
    >
      <div className="flex-1 p-[var(--space-6)] pr-[var(--space-4)]">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Clips</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-success)] bg-opacity-10 text-[var(--color-success)]">
                {totalClips} {totalClips === 1 ? 'clip' : 'clips'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusBreakdown.proposed > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--color-info)] bg-opacity-10 text-[var(--color-info)]">
                  {statusBreakdown.proposed} Proposed
                </span>
              )}
              {statusBreakdown.processing > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--color-warning)] bg-opacity-10 text-[var(--color-warning)]">
                  {statusBreakdown.processing} Processing
                </span>
              )}
              {statusBreakdown.created > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--color-success)] bg-opacity-10 text-[var(--color-success)]">
                  {statusBreakdown.created} Created
                </span>
              )}
              {statusBreakdown.failed > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-[var(--radius-md)] text-xs font-medium bg-[var(--color-error)] bg-opacity-10 text-[var(--color-error)]">
                  {statusBreakdown.failed} Failed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-[var(--color-divider)] flex items-center justify-center bg-[var(--color-surface-raised)] group-hover:bg-[var(--color-surface-hover)] transition-colors">
        <svg className="w-4 h-4 text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const ClipsCard = memo(ClipsCardComponent)
