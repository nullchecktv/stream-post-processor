interface FormatToggleProps {
  readonly value: 'markdown' | 'preview'
  readonly onChange: (value: 'markdown' | 'preview') => void
  readonly disabled?: boolean
}

export function FormatToggle({ value, onChange, disabled = false }: FormatToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange('markdown')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-all
          ${value === 'markdown'
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
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
          px-4 py-2 text-sm font-medium rounded-md transition-all
          ${value === 'preview'
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Preview
      </button>
    </div>
  )
}
