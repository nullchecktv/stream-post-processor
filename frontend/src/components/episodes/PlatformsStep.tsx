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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Platforms</h3>
        <p className="text-sm text-gray-600">
          Select the platforms where this episode was or will be streamed.
        </p>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={handleSelectAll}
          disabled={allSelected}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          Select All
        </button>
        <span className="text-gray-300">|</span>
        <button
          type="button"
          onClick={handleClearAll}
          disabled={noneSelected}
          className="text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400 disabled:cursor-not-allowed"
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
                transition-all duration-200
                ${
                  isSelected
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
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
                <span className={`font-medium ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
                  {platform.name}
                </span>
              </div>
              {isSelected && (
                <svg
                  className="w-5 h-5 text-blue-600"
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
        <div className="text-sm text-gray-600">
          {selectedPlatforms.length} platform{selectedPlatforms.length !== 1 ? 's' : ''} selected
        </div>
      )}
    </div>
  )
}
