interface PlatformsStepProps {
  selectedPlatforms: string[]
  onChange: (platforms: string[]) => void
}

const AVAILABLE_PLATFORMS = [
  { id: 'twitch', name: 'Twitch', icon: '🎮' },
  { id: 'youtube', name: 'YouTube', icon: '📺' },
  { id: 'linkedin live', name: 'LinkedIn Live', icon: '💼' },
  { id: 'X', name: 'X (Twitter)', icon: '🐦' },
]

export function PlatformsStep({ selectedPlatforms, onChange }: PlatformsStepProps) {
  const handleToggle = (platformId: string) => {
    if (selectedPlatforms.includes(platformId)) {
      onChange(selectedPlatforms.filter(p => p !== platformId))
    } else {
      onChange([...selectedPlatforms, platformId])
    }
  }

  const handleSelectAll = () => {
    onChange(AVAILABLE_PLATFORMS.map(p => p.id))
  }

  const handleClearAll = () => {
    onChange([])
  }

  const allSelected = selectedPlatforms.length === AVAILABLE_PLATFORMS.length
  const noneSelected = selectedPlatforms.length === 0

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Platforms</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Select the platforms where this episode was or will be streamed.
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={allSelected}
          className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed transition-colors"
        >
          Select All
        </button>
        <span className="text-[var(--color-divider)]">|</span>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={noneSelected}
          className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed transition-colors"
        >
          Clear All
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {AVAILABLE_PLATFORMS.map((platform) => {
          const isSelected = selectedPlatforms.includes(platform.id)

          return (
            <label
              key={platform.id}
              className={`
                relative flex items-center p-4 border-2 rounded-lg cursor-pointer
                transition-colors duration-200
                ${
                  isSelected
                    ? 'border-[var(--color-accent)] bg-[var(--color-accent-subtle)]'
                    : 'border-[var(--color-border)] hover:border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] bg-[var(--color-surface)]'
                }
              `}
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => handleToggle(platform.id)}
                className="sr-only"
              />
              <div className="flex items-center flex-1">
                <span className="text-2xl mr-3">{platform.icon}</span>
                <span className={`font-medium ${isSelected ? 'text-[var(--color-text-primary)]' : 'text-[var(--color-text-primary)]'}`}>
                  {platform.name}
                </span>
              </div>
              {isSelected && (
                <svg
                  className="w-5 h-5 text-[var(--color-accent)]"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </label>
          )
        })}
      </div>

      {selectedPlatforms.length > 0 && (
        <div className="text-sm text-[var(--color-text-secondary)]">
          {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
