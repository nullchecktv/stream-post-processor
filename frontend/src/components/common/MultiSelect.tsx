import { useState, useRef, useEffect } from 'react'

interface MultiSelectProps {
  options: string[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  error?: string
  disabled?: boolean
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = 'Select options',
  error,
  disabled = false,
}: MultiSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option))
    } else {
      onChange([...selected, option])
    }
  }

  const removeOption = (option: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(selected.filter(s => s !== option))
  }

  return (
    <div ref={containerRef} className="relative">
      <div
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full min-h-[42px] px-3 py-2 border rounded-lg cursor-pointer transition-colors duration-[var(--duration-fast)] ${
          error
            ? 'border-[var(--color-error)] focus:ring-[var(--color-error)]'
            : 'border-[var(--color-border)] focus:ring-[var(--color-focus)]'
        } ${disabled ? 'bg-[var(--color-surface)] opacity-50 cursor-not-allowed' : 'bg-[var(--color-surface)] hover:border-[var(--color-text-muted)]'}`}
      >
        {selected.length === 0 ? (
          <span className="text-[var(--color-text-muted)]">{placeholder}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {selected.map(option => (
              <span
                key={option}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--color-accent)]/10 text-[var(--color-accent)] rounded text-sm"
              >
                {option}
                {!disabled && (
                  <button
                    type="button"
                    onClick={(e) => removeOption(option, e)}
                    className="hover:text-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)]"
                  >
                    ×
                  </button>
                )}
              </span>
            ))}
          </div>
        )}
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-10 w-full mt-1 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-3 py-2 text-sm text-[var(--color-text-muted)]">No options available</div>
          ) : (
            options.map(option => (
              <div
                key={option}
                onClick={() => toggleOption(option)}
                className={`px-3 py-2 cursor-pointer hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)] ${
                  selected.includes(option) ? 'bg-[var(--color-accent)]/10 text-[var(--color-accent)]' : 'text-[var(--color-text-primary)]'
                }`}
              >
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.includes(option)}
                    onChange={() => {}}
                    className="h-4 w-4 text-[var(--color-accent)] border-[var(--color-border)] rounded focus:ring-[var(--color-focus)]"
                  />
                  <span className="ml-2 text-sm">{option}</span>
                </label>
              </div>
            ))
          )}
        </div>
      )}

      {error && (
        <p className="mt-1 text-sm text-[var(--color-error)]" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
