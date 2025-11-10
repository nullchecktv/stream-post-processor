import { useState, useEffect } from 'react'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import type { Team, Platform } from '../../types'

interface TeamFormProps {
  mode: 'create' | 'update'
  initialData?: Partial<Team>
  onSubmit: (data: TeamFormData) => Promise<void>
  onCancel?: () => void
  loading?: boolean
}

export interface TeamFormData {
  name: string
  description?: string
  settings?: {
    defaultPlatforms?: Platform[]
    timezone?: string
  }
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'youtube', label: 'YouTube' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'linkedin live', label: 'LinkedIn Live' },
  { value: 'X', label: 'X (Twitter)' },
]

const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
]

export function TeamForm({ mode, initialData, onSubmit, onCancel, loading = false }: TeamFormProps) {
  const [name, setName] = useState(initialData?.name || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>(
    initialData?.settings?.defaultPlatforms || []
  )
  const [timezone, setTimezone] = useState(
    initialData?.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone
  )
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (initialData) {
      setName(initialData.name || '')
      setDescription(initialData.description || '')
      setSelectedPlatforms(initialData.settings?.defaultPlatforms || [])
      setTimezone(initialData.settings?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone)
    }
  }, [initialData])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Team name is required'
    } else if (name.trim().length > 100) {
      newErrors.name = 'Team name must be 100 characters or less'
    }

    if (description && description.length > 500) {
      newErrors.description = 'Description must be 500 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) {
      return
    }

    const formData: TeamFormData = {
      name: name.trim(),
      description: description.trim() || undefined,
      settings: {
        defaultPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
        timezone: timezone || undefined,
      },
    }

    await onSubmit(formData)
  }

  const togglePlatform = (platform: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Input
          label="Team Name"
          type="text"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (errors.name) {
              setErrors((prev) => ({ ...prev, name: '' }))
            }
          }}
          placeholder="My Content Team"
          error={errors.name}
          disabled={loading}
          required
          maxLength={100}
        />
        <p className="mt-1 text-xs text-gray-500">
          {name.length}/100 characters
        </p>
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <textarea
          id="description"
          value={description}
          onChange={(e) => {
            setDescription(e.target.value)
            if (errors.description) {
              setErrors((prev) => ({ ...prev, description: '' }))
            }
          }}
          placeholder="Brief description of your team's purpose"
          disabled={loading}
          maxLength={500}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed resize-none"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600">{errors.description}</p>
        )}
        <p className="mt-1 text-xs text-gray-500">
          {description.length}/500 characters
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Default Platforms
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORMS.map((platform) => (
            <button
              key={platform.value}
              type="button"
              onClick={() => togglePlatform(platform.value)}
              disabled={loading}
              className={`px-4 py-2 rounded-lg border-2 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed ${
                selectedPlatforms.includes(platform.value)
                  ? 'border-primary bg-primary/10 text-primary font-medium'
                  : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
              }`}
            >
              {platform.label}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Select the platforms your team typically publishes to
        </p>
      </div>

      <div>
        <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
          Timezone
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <select
          id="timezone"
          value={timezone}
          onChange={(e) => setTimezone(e.target.value)}
          disabled={loading}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {TIMEZONES.map((tz) => (
            <option key={tz} value={tz}>
              {tz.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Used for scheduling and timestamps
        </p>
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-200">
        {onCancel && (
          <Button
            type="button"
            onClick={onCancel}
            variant="ghost"
            disabled={loading}
            className="flex-1"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={loading}
          disabled={loading}
          className="flex-1"
        >
          {mode === 'create' ? 'Create Team' : 'Save Changes'}
        </Button>
      </div>
    </form>
  )
}
