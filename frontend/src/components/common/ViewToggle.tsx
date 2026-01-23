interface ViewToggleProps {
  readonly value: 'outline' | 'content'
  readonly onChange: (value: 'outline' | 'content') => void
  readonly disabled?: boolean
}

export function ViewToggle({ value, onChange, disabled = false }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      <button
        type="button"
        onClick={() => onChange('outline')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors duration-[var(--duration-fast)]
          ${value === 'outline'
            ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Outline
      </button>
      <button
        type="button"
        onClick={() => onChange('content')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors duration-[var(--duration-fast)]
          ${value === 'content'
            ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Content
      </button>
    </div>
  )
}
