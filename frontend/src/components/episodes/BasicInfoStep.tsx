import { useState } from 'react'
import type { KeyboardEvent } from 'react'
import { Input } from '../common/Input'
import { z } from 'zod'

interface BasicInfoStepProps {
  formData: {
    title: string
    episodeNumber: string
    airDate: string
    seriesName: string
    speakers: string[]
  }
  onChange: (updates: Partial<BasicInfoStepProps['formData']>) => void
  errors: Record<string, string>
  onValidate: (isValid: boolean) => void
}

const basicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  episodeNumber: z.string().min(1, 'Episode number is required'),
  airDate: z.string().optional(),
  seriesName: z.string().max(100, 'Series name must be less than 100 characters').optional(),
})

export function BasicInfoStep({ formData, onChange, errors, onValidate }: BasicInfoStepProps) {
  const [speakerInput, setSpeakerInput] = useState('')
  const [speakerError, setSpeakerError] = useState('')

  const handleChange = (field: keyof BasicInfoStepProps['formData'], value: string) => {
    onChange({ [field]: value })

    const updatedData = { ...formData, [field]: value }
    const result = basicInfoSchema.safeParse(updatedData)
    onValidate(result.success)
  }

  const handleAddSpeaker = (speaker: string) => {
    const trimmedSpeaker = speaker.trim()

    if (!trimmedSpeaker) {
      setSpeakerError('Speaker name cannot be empty')
      return
    }

    if (trimmedSpeaker.length > 100) {
      setSpeakerError('Speaker name must be less than 100 characters')
      return
    }

    if (formData.speakers.some(s => s.toLowerCase() === trimmedSpeaker.toLowerCase())) {
      setSpeakerError('This speaker has already been added')
      return
    }

    onChange({ speakers: [...formData.speakers, trimmedSpeaker] })
    setSpeakerInput('')
    setSpeakerError('')
  }

  const handleSpeakerKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddSpeaker(speakerInput)
    }
  }

  const handleRemoveSpeaker = (speakerToRemove: string) => {
    onChange({ speakers: formData.speakers.filter(s => s !== speakerToRemove) })
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Basic Information</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Enter the essential details for your episode. Title and episode number are required.
        </p>
      </div>

      <div className="space-y-4">
        <Input
          label="Episode Title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          placeholder="e.g., Tech Talk: Building Scalable APIs"
          required
        />

        <Input
          label="Episode Number"
          type="number"
          value={formData.episodeNumber}
          onChange={(e) => handleChange('episodeNumber', e.target.value)}
          error={errors.episodeNumber}
          placeholder="1"
          required
          min="1"
          step="1"
        />

        <Input
          label="Air Date"
          type="datetime-local"
          value={formData.airDate}
          onChange={(e) => handleChange('airDate', e.target.value)}
          error={errors.airDate}
          helperText="When was or will this episode be aired?"
        />

        <Input
          label="Series Name"
          type="text"
          value={formData.seriesName}
          onChange={(e) => handleChange('seriesName', e.target.value)}
          error={errors.seriesName}
          placeholder="e.g., Tech Talk Series"
          helperText="Group episodes together by series"
        />

        <div>
          <Input
            label="Speakers"
            type="text"
            value={speakerInput}
            onChange={(e) => {
              setSpeakerInput(e.target.value)
              setSpeakerError('')
            }}
            onKeyDown={handleSpeakerKeyDown}
            error={speakerError}
            placeholder="Type a speaker name and press Enter"
            helperText="Add the names of people appearing in this episode"
          />

          {formData.speakers.length > 0 && (
            <div className="mt-3">
              <div className="flex flex-wrap gap-2">
                {formData.speakers.map((speaker) => (
                  <span
                    key={speaker}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                  >
                    {speaker}
                    <button
                      type="button"
                      onClick={() => handleRemoveSpeaker(speaker)}
                      className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors"
                      aria-label={`Remove ${speaker}`}
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
        </div>
      </div>
    </div>
  )
}
