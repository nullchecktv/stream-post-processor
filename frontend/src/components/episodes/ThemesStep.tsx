import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Input } from '../common/Input'

interface ThemesStepProps {
  themes: string[]
  onChange: (themes: string[]) => void
}

const SUGGESTED_THEMES = [
  'Technology',
  'Programming',
  'AI & Machine Learning',
  'Web Development',
  'Cloud Computing',
  'DevOps',
  'Security',
  'Mobile Development',
  'Data Science',
  'Product Management',
]

export function ThemesStep({ themes, onChange }: ThemesStepProps) {
  const [inputValue, setInputValue] = useState('')
  const [error, setError] = useState('')

  const handleAddTheme = (theme: string) => {
    const trimmedTheme = theme.trim()

    if (!trimmedTheme) {
      setError('Theme cannot be empty')
      return
    }

    if (trimmedTheme.length > 50) {
      setError('Theme must be less than 50 characters')
      return
    }

    if (themes.some(t => t.toLowerCase() === trimmedTheme.toLowerCase())) {
      setError('This theme has already been added')
      return
    }

    onChange([...themes, trimmedTheme])
    setInputValue('')
    setError('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTheme(inputValue)
    }
  }

  const handleRemoveTheme = (themeToRemove: string) => {
    onChange(themes.filter(t => t !== themeToRemove))
  }

  const handleSuggestionClick = (suggestion: string) => {
    if (!themes.some(t => t.toLowerCase() === suggestion.toLowerCase())) {
      onChange([...themes, suggestion])
    }
  }

  const availableSuggestions = SUGGESTED_THEMES.filter(
    suggestion => !themes.some(t => t.toLowerCase() === suggestion.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Themes</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Add themes or topics covered in this episode to help with organization and discovery.
        </p>
      </div>

      <div>
        <Input
          label="Add Theme"
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setError('')
          }}
          onKeyDown={handleKeyDown}
          error={error}
          placeholder="Type a theme and press Enter"
          helperText="Press Enter to add a theme"
        />
      </div>

      {themes.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Selected Themes
          </label>
          <div className="flex flex-wrap gap-2">
            {themes.map((theme) => (
              <span
                key={theme}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
              >
                {theme}
                <button
                  type="button"
                  onClick={() => handleRemoveTheme(theme)}
                  className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors"
                  aria-label={`Remove ${theme}`}
                >
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {availableSuggestions.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-[var(--color-text-primary)] mb-2">
            Suggested Themes
          </label>
          <div className="flex flex-wrap gap-2">
            {availableSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => handleSuggestionClick(suggestion)}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] border border-[var(--color-border)] transition-colors"
              >
                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
