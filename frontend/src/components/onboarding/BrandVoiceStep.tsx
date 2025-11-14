import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import { HelpTip } from '../common/HelpTip'
import { BrandVoiceSchema, type BrandVoiceFormData } from '../../utils/validation'
import { usersApi } from '../../api/users'
import { useState } from 'react'

interface BrandVoiceStepProps {
  onComplete: () => void
  onSkip: () => void
}

export function BrandVoiceStep({ onComplete, onSkip }: BrandVoiceStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BrandVoiceFormData>({
    resolver: zodResolver(BrandVoiceSchema),
    defaultValues: {
      perspective: 'first_person',
    },
  })

  const onSubmit = async (data: BrandVoiceFormData) => {
    setIsSubmitting(true)
    setError(null)

    try {
      await usersApi.updateProfile({
        branding: {
          voice: data
        } as any
      })
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save brand voice settings')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <HelpTip
          id="onboarding-brand-voice-step"
          content={
            <div>
              <p className="font-semibold mb-1">Brand Voice Configuration (Optional)</p>
              <p>Define your content's tone and writing style to help AI generate blog posts that match your brand. You can skip this step and configure it later in your profile settings.</p>
            </div>
          }
          position="bottom"
        >
          <p className="text-gray-600 mb-4">
            Configure your brand voice to personalize AI-generated blog content. This is optional and can be set up later.
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
        <div>
          <Input
            label="Tone"
            {...register('tone')}
            error={errors.tone?.message}
            placeholder="e.g., professional and conversational, casual and humorous"
            helperText="Describe the overall tone you want for your content"
            disabled={isSubmitting}
          />
          <p className="mt-2 text-xs text-gray-500">
            Examples: "professional and conversational", "casual and humorous", "technical and authoritative"
          </p>
        </div>

        <div>
          <label htmlFor="writingStyle" className="block text-sm font-medium text-gray-700 mb-1">
            Writing Style
          </label>
          <textarea
            id="writingStyle"
            {...register('writingStyle')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            placeholder="e.g., storytelling with code examples, technical with practical examples"
            disabled={isSubmitting}
          />
          {errors.writingStyle && (
            <p className="mt-1 text-sm text-red-600">{errors.writingStyle.message}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            Examples: "storytelling with code examples", "technical with practical examples", "educational with step-by-step guides"
          </p>
        </div>

        <div>
          <label htmlFor="perspective" className="block text-sm font-medium text-gray-700 mb-1">
            Writing Perspective
          </label>
          <select
            id="perspective"
            {...register('perspective')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-colors"
            disabled={isSubmitting}
          >
            <option value="first_person">First Person (I, we, our)</option>
            <option value="third_person">Third Person (they, the team, the company)</option>
          </select>
          {errors.perspective && (
            <p className="mt-1 text-sm text-red-600">{errors.perspective.message}</p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            <strong>First person</strong> creates personal, relatable content ("I discovered that...").
            <strong>Third person</strong> maintains professional distance ("The team found that...").
            Choose based on whether you're writing as an individual or representing an organization.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800">
              <p className="font-semibold mb-1">How this helps</p>
              <p>
                When you generate blog posts from episode transcripts, the AI will use these settings to match your brand's voice and style, creating content that feels authentic to your audience.
              </p>
            </div>
          </div>
        </div>

        <Button type="submit" loading={isSubmitting} className="w-full">
          Save Brand Voice
        </Button>
      </form>
    </div>
  )
}
