import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { NextAction } from '../../hooks/useWorkflowState'

interface NextActionCardProps {
  readonly action: NextAction | null
  readonly isLoading?: boolean
  readonly error?: string | null
}

const ICON_MAP: Record<string, React.ReactElement> = {
  lightbulb: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  document: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  video: (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  ),
  'check-circle': (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const ACTION_STYLES: Record<string, { bg: string; text: string; icon: string; button: string }> = {
  lightbulb: {
    bg: 'bg-[var(--color-surface-raised)]',
    text: 'text-[var(--color-text-primary)]',
    icon: 'text-[var(--color-accent)]',
    button: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-focus)]'
  },
  document: {
    bg: 'bg-[var(--color-surface-raised)]',
    text: 'text-[var(--color-text-primary)]',
    icon: 'text-[var(--color-accent)]',
    button: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-focus)]'
  },
  video: {
    bg: 'bg-[var(--color-surface-raised)]',
    text: 'text-[var(--color-text-primary)]',
    icon: 'text-[var(--color-accent)]',
    button: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-focus)]'
  },
  'check-circle': {
    bg: 'bg-[var(--color-surface-raised)]',
    text: 'text-[var(--color-text-primary)]',
    icon: 'text-[var(--color-success)]',
    button: 'bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:ring-[var(--color-focus)]'
  }
}

function NextActionCardComponent({ action, isLoading = false, error = null }: NextActionCardProps) {
  const navigate = useNavigate()

  if (isLoading) {
    return (
      <section
        className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8"
        aria-label="Next action"
        aria-busy="true"
      >
        <div className="animate-pulse">
          <div className="flex items-start space-x-6">
            <div className="w-16 h-16 bg-[var(--color-surface-raised)] rounded-full" />
            <div className="flex-1 space-y-4">
              <div className="h-6 bg-[var(--color-surface-raised)] rounded w-1/3" />
              <div className="h-4 bg-[var(--color-surface-raised)] rounded w-2/3" />
              <div className="h-10 bg-[var(--color-surface-raised)] rounded w-32" />
            </div>
          </div>
        </div>
      </section>
    )
  }

  if (error) {
    return (
      <section
        className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-error)] p-8"
        aria-label="Next action error"
        role="alert"
      >
        <div className="flex items-start space-x-4">
          <div className="flex-shrink-0">
            <svg className="w-8 h-8 text-[var(--color-error)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Unable to Determine Next Action</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </section>
    )
  }

  if (!action) {
    return (
      <section
        className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-8"
        aria-label="No action needed"
      >
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-surface-raised)] rounded-full mb-4">
            <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No Action Required</h3>
          <p className="text-sm text-[var(--color-text-secondary)]">Everything is up to date.</p>
        </div>
      </section>
    )
  }

  const styles = ACTION_STYLES[action.icon] || ACTION_STYLES.lightbulb
  const icon = ICON_MAP[action.icon] || ICON_MAP.lightbulb

  const handleAction = useCallback(() => {
    navigate(action.route)
  }, [navigate, action.route])

  const handleSkip = useCallback(() => {
    if (action.skipRoute) {
      navigate(action.skipRoute)
    }
  }, [navigate, action.skipRoute])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      handleAction()
    }
  }, [handleAction])

  const isCompletionState = action.icon === 'check-circle'
  const hasSkipOption = action.skipRoute && action.skipText

  return (
    <section
      className={`rounded-lg shadow-sm border border-[var(--color-border)] p-8 ${styles.bg}`}
      aria-label="Next action"
    >
      <div className="flex items-start space-x-6">
        <div
          className={`flex-shrink-0 w-16 h-16 rounded-full flex items-center justify-center ${styles.icon} bg-[var(--color-surface)] shadow-sm border border-[var(--color-border)]`}
          aria-hidden="true"
        >
          {icon}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className={`text-2xl font-bold mb-3 ${styles.text}`}>
            {isCompletionState && (
              <span className="inline-block mr-2" aria-label="Completed">
                ✓
              </span>
            )}
            {action.title}
          </h3>

          <p className={`text-base mb-6 ${styles.text} opacity-90`}>
            {action.description}
          </p>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleAction}
              onKeyDown={handleKeyDown}
              className={`inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-[var(--color-text-on-accent)] ${styles.button} focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200`}
              aria-label={`${action.buttonText} - Navigate to ${action.title}`}
            >
              {action.buttonText}
              <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>

            {hasSkipOption && (
              <button
                type="button"
                onClick={handleSkip}
                className={`inline-flex items-center px-6 py-3 border-2 ${styles.text} border-current text-base font-medium rounded-md bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] transition-colors duration-200`}
                aria-label={action.skipText}
              >
                {action.skipText}
                <svg className="ml-2 -mr-1 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

export const NextActionCard = memo(NextActionCardComponent)
