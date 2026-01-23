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
          <p className="text-[var(--color-text-secondary)] mb-4">
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
        <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-lg">
          <p className="text-sm text-[var(--color-error)]">{error}</p>
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
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Examples: "professional and conversational", "casual and humorous", "technical and authoritative"
          </p>
        </div>

        <div>
          <label htmlFor="writingStyle" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Writing Style
          </label>
          <textarea
            id="writingStyle"
            {...register('writingStyle')}
            rows={3}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] focus:border-transparent transition-colors bg-[var(--color-surface)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="e.g., storytelling with code examples, technical with practical examples"
            disabled={isSubmitting}
          />
          {errors.writingStyle && (
            <p className="mt-1 text-sm text-[var(--color-error)]">{errors.writingStyle.message}</p>
          )}
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            Examples: "storytelling with code examples", "technical with practical examples", "educational with step-by-step guides"
          </p>
        </div>

        <div>
          <label htmlFor="perspective" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1">
            Writing Perspective
          </label>
          <select
            id="perspective"
            {...register('perspective')}
            className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] focus:border-transparent transition-colors bg-[var(--color-surface)] text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            <option value="first_person">First Person (I, we, our)</option>
            <option value="third_person">Third Person (they, the team, the company)</option>
          </select>
          {errors.perspective && (
            <p className="mt-1 text-sm text-[var(--color-error)]">{errors.perspective.message}</p>
          )}
          <p className="mt-2 text-xs text-[var(--color-text-muted)]">
            <strong>First person</strong> creates personal, relatable content ("I discovered that...").
            <strong>Third person</strong> maintains professional distance ("The team found that...").
            Choose based on whether you're writing as an individual or representing an organization.
          </p>
        </div>

        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-info)] rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg
              className="w-5 h-5 text-[var(--color-info)] flex-shrink-0 mt-0.5"
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
            <div className="text-sm text-[var(--color-text-primary)]">
              <p className="font-semibold mb-1">How this helps</p>
              <p className="text-[var(--color-text-secondary)]">
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
