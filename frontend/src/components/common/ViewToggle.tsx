interface ViewToggleProps {
  readonly value: 'outline' | 'content'
  readonly onChange: (value: 'outline' | 'content') => void
  readonly disabled?: boolean
}

export function ViewToggle({ value, onChange, disabled = false }: ViewToggleProps) {
  return (
    <div className="inline-flex rounded-lg border border-gray-300 bg-white p-1">
      <button
        type="button"
        onClick={() => onChange('outline')}
        disabled={disabled}
        className={`
          px-4 py-2 text-sm font-medium rounded-md transition-all
          ${value === 'outline'
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
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
          px-4 py-2 text-sm font-medium rounded-md transition-all
          ${value === 'content'
            ? 'bg-primary text-white shadow-sm'
            : 'text-gray-700 hover:text-gray-900 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        Content
      </button>
    </div>
  )
}
