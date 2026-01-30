interface FormatToggleProps {
  readonly value: 'markdown' | 'preview'
  readonly onChange: (value: 'markdown' | 'preview') => void
  readonly disabled?: boolean
}

export function FormatToggle({ value, onChange, disabled = false }: FormatToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
      <button
        type="button"
        onClick={() => onChange('markdown')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors duration-[var(--duration-fast)]
          ${value === 'markdown'
            ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => onChange('preview')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-colors duration-[var(--duration-fast)]
          ${value === 'preview'
            ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)] shadow-sm'
            : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Preview
      </button>
    </div>
  )
}
