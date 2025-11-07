import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { HelpTip } from '../common/HelpTip'
import { TeamSchema, type TeamFormData } from '../../utils/validation'
import { teamsApi } from '../../api/teams'
import { useState } from 'react'
import type { Platform } from '../../types'

interface TeamStepProps {
  onComplete: () => void
  onSkip: () => void
}

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'linkedin live', label: 'LinkedIn Live' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
]

export function TeamStep({ onComplete, onSkip }: TeamStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TeamFormData>({
    resolver: zodResolver(TeamSchema),
  })

  const onSubmit = async (data: TeamFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await teamsApi.create(data)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create team')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <HelpTip
          id="onboarding-team-step"
          content={
            <div>
              <p className="font-semibold mb-1">Team Creation (Optional)</p>
              <p>Teams allow you to collaborate with others on episodes. You can skip this step and create teams later from your dashboard.</p>
            </div>
          }
          position="bottom"
        >
          <p className="text-gray-600 mb-4">
            Create a team to collaborate with others. You can always create or join teams later.
          </p>
        </HelpTip>
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isSubmitting}
          className="mb-6"
        >
          Skip this step
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Input
          label="Team Name"
          {...register('name')}
          error={errors.name?.message}
          placeholder="Enter team name"
          disabled={isSubmitting}
        />

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            placeholder="Describe your team's purpose"
            disabled={isSubmitting}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Platforms (optional)
          </label>
          <div className="space-y-2">
            {PLATFORMS.map((platform) => (
              <div key={platform.value} className="flex items-center">
                <input
                  type="checkbox"
                  id={`platform-${platform.value}`}
                  value={platform.value}
                  {...register('settings.defaultPlatforms')}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                  disabled={isSubmitting}
                />
                <label
                  htmlFor={`platform-${platform.value}`}
                  className="ml-2 text-sm text-gray-700"
                >
                  {platform.label}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Input
          label="Timezone (optional)"
          {...register('settings.timezone')}
          error={errors.settings?.timezone?.message}
          placeholder="e.g., America/New_York"
          helperText="Default timezone for team activities"
          disabled={isSubmitting}
        />

        <Button type="submit" loading={isSubmitting} className="w-full">
          Create Team
        </Button>
      </form>
    </div>
  )
}
