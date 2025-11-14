import { useState, KeyboardEvent, ChangeEvent } from 'react'

interface ChipInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  error?: string
  id?: string
  label?: string
  required?: boolean
}

export function ChipInput({
  value,
  onChange,
  placeholder,
  error,
  id,
  label,
  required = false,
}: ChipInputProps) {
  const [inputValue, setInputValue] = useState('')

  const addChip = (text: string) => {
    const trimmed = text.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue('')
  }

  const removeChip = (index: number) => {
    onChange(value.filter((_, i) => i !== index))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addChip(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeChip(value.length - 1)
    }
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    if (newValue.includes(',')) {
      const parts = newValue.split(',')
      const lastPart = parts.pop() || ''

      parts.forEach(part => {
        const trimmed = part.trim()
        if (trimmed && !value.includes(trimmed)) {
          onChange([...value, trimmed])
        }
      })

      setInputValue(lastPart)
    } else {
      setInputValue(newValue)
    }
  }

  const handleBlur = () => {
    if (inputValue.trim()) {
      addChip(inputValue)
    }
  }

  return (
    <div>
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div
        className={`w-full min-h-[42px] px-3 py-2 border rounded-lg transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-1 ${
          error
            ? 'border-red-500 focus-within:ring-red-500 focus-within:border-red-500'
            : 'border-gray-300 focus-within:ring-primary focus-within:border-primary'
        }`}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {value.map((chip, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium"
            >
              {chip}
              <button
                type="button"
                onClick={() => removeChip(index)}
                className="hover:bg-primary/20 rounded-full p-0.5 transition-colors"
                aria-label={`Remove ${chip}`}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          ))}
          <input
            id={id}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            placeholder={value.length === 0 ? placeholder : ''}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
          />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
      <p className="mt-1 text-xs text-gray-500">
        Press Enter or comma to add. Click × to remove.
      </p>
    </div>
  )
}
