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
        <p className="text-gray-600">
          Let's start by setting up your profile. This information helps us personalize your experience.
        </p>
      </HelpTip>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
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
          className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
          disabled={isSubmitting}
        />
        <label htmlFor="notifications" className="ml-2 text-sm text-gray-700">
          Enable email notifications for important updates
        </label>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isSubmitting ? 'Saving...' : 'Continue'}
      </button>
    </form>
  )
}
