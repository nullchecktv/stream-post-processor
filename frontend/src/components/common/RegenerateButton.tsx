import { LoadingSpinner } from './LoadingSpinner'

interface RegenerateButtonProps {
  readonly onClick: () => void
  readonly disabled: boolean
  readonly loading: boolean
}

export function RegenerateButton({ onClick, disabled, loading }: Readonly<RegenerateButtonProps>) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm
        transition-colors duration-[var(--duration-fast)]
        ${
          disabled || loading
            ? 'bg-[var(--color-surface)] text-[var(--color-text-disabled)] cursor-not-allowed'
            : 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] hover:bg-[var(--color-accent-hover)]'
        }
      `}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" />
          <span>Regenerating...</span>
        </>
      ) : (
        <>
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
          <span>Regenerate Content</span>
        </>
      )}
    </button>
  )
}
