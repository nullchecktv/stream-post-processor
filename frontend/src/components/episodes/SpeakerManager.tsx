import { useState } from 'react'
import { Button } from '../common/Button'
import { Input } from '../common/Input'

interface SpeakerManagerProps {
  speakers: string[]
  onChange: (speakers: string[]) => void
  error?: string
}

export function SpeakerManager({ speakers, onChange, error }: SpeakerManagerProps) {
  const [newSpeaker, setNewSpeaker] = useState('')
  const [inputError, setInputError] = useState('')

  const handleAddSpeaker = () => {
    const trimmed = newSpeaker.trim()

    if (!trimmed) {
      setInputError('Speaker name cannot be empty')
      return
    }

    if (trimmed.length > 100) {
      setInputError('Speaker name must be less than 100 characters')
      return
    }

    if (speakers.some(s => s.toLowerCase() === trimmed.toLowerCase())) {
      setInputError('Speaker already exists')
      return
    }

    onChange([...speakers, trimmed])
    setNewSpeaker('')
    setInputError('')
  }

  const handleRemoveSpeaker = (index: number) => {
    onChange(speakers.filter((_, i) => i !== index))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSpeaker()
    }
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        Speakers
      </label>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            value={newSpeaker}
            onChange={(e) => {
              setNewSpeaker(e.target.value)
              setInputError('')
            }}
            onKeyPress={handleKeyPress}
            placeholder="Enter speaker name"
            error={inputError}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={handleAddSpeaker}
        >
          Add
        </Button>
      </div>

      {speakers.length > 0 && (
        <div className="space-y-2">
          {speakers.map((speaker, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg border border-gray-200"
            >
              <span className="text-sm text-gray-900">{speaker}</span>
              <button
                type="button"
                onClick={() => handleRemoveSpeaker(index)}
                className="text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      {speakers.length === 0 && !error && (
        <p className="text-sm text-gray-500">
          No speakers added yet. Add speakers to validate track and quote references.
        </p>
      )}
    </div>
  )
}
