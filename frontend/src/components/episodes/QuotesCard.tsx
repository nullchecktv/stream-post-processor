import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Quote } from '../../types'

interface QuotesCardProps {
  readonly episodeId: string
  readonly quotes: Quote[]
  readonly isLoading?: boolean
  readonly isProcessing?: boolean
  readonly canGenerate?: boolean
  readonly error?: string | null
}

function QuotesCardComponent({
  episodeId,
  quotes,
  isLoading = false,
  isProcessing = false,
  canGenerate = false,
  error = null
}: QuotesCardProps) {
  const navigate = useNavigate()

  const handleViewQuotes = useCallback(() => {
    navigate(`/episodes/${episodeId}/quotes`)
  }, [navigate, episodeId])

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]" aria-busy="true">
        <div className="animate-pulse">
          <div className="flex items-center space-x-[var(--space-3)] mb-[var(--space-4)]">
            <div className="w-10 h-10 bg-[var(--color-surface-raised)] rounded-full" />
            <div className="h-5 bg-[var(--color-surface-raised)] rounded w-24" />
          </div>
          <div className="space-y-[var(--space-2)]">
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
        <div className="flex items-start space-x-[var(--space-3)]">
          <svg className="w-6 h-6 text-[var(--color-error)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Error Loading Quotes</h3>
            <p className="text-sm text-[var(--color-error)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-[var(--space-3)] mb-[var(--space-4)]">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-accent)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)] mb-1">Quotes</h3>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mb-[var(--space-2)]">
              Processing...
            </p>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              AI is extracting quotes from your transcript. This may take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-[var(--space-3)] mb-[var(--space-4)]">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-surface-raised)] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)] mb-1">Quotes</h3>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mb-[var(--space-4)]">
              0 quotes
            </p>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)]">
              {canGenerate
                ? 'Quotes will appear here after extraction from the transcript.'
                : 'Upload a transcript to extract quotes.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const totalQuotes = quotes.length

  return (
    <div
      className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-warning)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)] transition-colors duration-[var(--duration-fast)] cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewQuotes}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewQuotes()
        }
      }}
    >
      <div className="flex-1 p-[var(--space-6)] pr-[var(--space-4)]">
        <div className="flex items-start space-x-[var(--space-3)] h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-accent-subtle)] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-warning)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">Quotes</h3>
              <span className="inline-flex items-center px-[var(--space-2)] py-[var(--space-1)] rounded-[var(--radius-full)] text-[length:var(--text-xs)] font-medium bg-[var(--color-accent-subtle)] text-[var(--color-warning)]">
                {totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'}
              </span>
            </div>

            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'} ready to share
            </p>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-[var(--color-divider)] flex items-center justify-center bg-[var(--color-surface-raised)] group-hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
        <svg className="w-4 h-4 text-[var(--color-warning)] transition-colors duration-[var(--duration-fast)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const QuotesCard = memo(QuotesCardComponent)
