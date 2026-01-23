import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../common/Input'
import { HelpTip } from '../common/HelpTip'
import { ProfileSchema, type ProfileFormData } from '../../utils/validation'
import { usersApi } from '../../api/users'
import { useState } from 'react'

interface ProfileStepProps {
  onComplete: () => void
}

export function ProfileStep({ onComplete }: ProfileStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileSchema),
  })

  const onSubmit = async (data: ProfileFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await usersApi.updateProfile(data)
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <HelpTip
        id="onboarding-profile-step"
        content={
          <div>
            <p className="font-semibold mb-1">Welcome to Your Profile Setup</p>
            <p>Fill in your basic information to get started. Only your name is required - you can always update other preferences later.</p>
          </div>
        }
        position="bottom"
      >
        <p className="text-[var(--color-text-secondary)]">
          Let's start by setting up your profile. This information helps us personalize your experience.
        </p>
      </HelpTip>

      {error && (
        <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-lg">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
        </div>
      )}

      <Input
        label="Name"
        {...register('name')}
        error={errors.name?.message}
        placeholder="Enter your full name"
        disabled={isSubmitting}
      />

      <Input
        label="Timezone (optional)"
        {...register('preferences.timezone')}
        error={errors.preferences?.timezone?.message}
        placeholder="e.g., America/New_York"
        helperText="Your timezone helps us schedule and display times correctly"
        disabled={isSubmitting}
      />

      <div className="flex items-center">
        <input
          type="checkbox"
          id="notifications"
          {...register('preferences.notifications')}
          className="h-4 w-4 text-[var(--color-accent)] focus:ring-[var(--color-focus)] border-[var(--color-border)] rounded"
          disabled={isSubmitting}
        />
        <label htmlFor="notifications" className="ml-2 text-sm text-[var(--color-text-primary)]">
          Enable email notifications for important updates
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-lg font-medium hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
