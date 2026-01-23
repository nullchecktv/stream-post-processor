import { Button } from '../common/Button'

interface ReviewStepProps {
  formData: {
    title: string
    episodeNumber: string
    airDate: string
    seriesName: string
    platforms: string[]
    themes: string[]
    speakers: string[]
  }
  onEdit: (step: number) => void
  isSubmitting: boolean
  error?: string
}

export function ReviewStep({ formData, onEdit, isSubmitting, error }: ReviewStepProps) {
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set'
    try {
      const date = new Date(dateString)
      return date.toLocaleString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Review & Create</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">
          Review your episode details before creating. You can edit any section by clicking the edit button.
        </p>
      </div>

      {error && (
        <div className="bg-[var(--color-error-bg)] border border-[var(--color-error)] rounded-lg p-4 text-sm text-[var(--color-text-primary)]">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-[var(--color-error)] mr-2 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <ReviewSection
          title="Basic Information"
          onEdit={() => onEdit(1)}
          isSubmitting={isSubmitting}
        >
          <ReviewItem label="Title" value={formData.title} />
          <ReviewItem label="Episode Number" value={formData.episodeNumber} />
          <ReviewItem label="Air Date" value={formatDate(formData.airDate)} />
          <ReviewItem label="Series Name" value={formData.seriesName || 'Not set'} />
          {formData.speakers.length > 0 && (
            <div className="pt-2">
              <span className="text-sm text-[var(--color-text-secondary)]">Speakers:</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.speakers.map((speaker) => (
                  <span
                    key={speaker}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                  >
                    {speaker}
                  </span>
                ))}
              </div>
            </div>
          )}
        </ReviewSection>

        <ReviewSection
          title="Platforms"
          onEdit={() => onEdit(2)}
          isSubmitting={isSubmitting}
        >
          {formData.platforms.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.platforms.map((platform) => (
                <span
                  key={platform}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                >
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">No platforms selected</p>
          )}
        </ReviewSection>

        <ReviewSection
          title="Themes"
          onEdit={() => onEdit(3)}
          isSubmitting={isSubmitting}
        >
          {formData.themes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {formData.themes.map((theme) => (
                <span
                  key={theme}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border border-[var(--color-border)]"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-text-muted)] italic">No themes added</p>
          )}
        </ReviewSection>
      </div>
    </div>
  )
}

interface ReviewSectionProps {
  title: string
  onEdit: () => void
  isSubmitting: boolean
  children: React.ReactNode
}

function ReviewSection({ title, onEdit, isSubmitting, children }: ReviewSectionProps) {
  return (
    <div className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface)]">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-[var(--color-text-primary)]">{title}</h4>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onEdit}
          disabled={isSubmitting}
        >
          Edit
        </Button>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  )
}

interface ReviewItemProps {
  label: string
  value: string
}

function ReviewItem({ label, value }: ReviewItemProps) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-[var(--color-text-secondary)]">{label}:</span>
      <span className="text-[var(--color-text-primary)] font-medium">{value}</span>
    </div>
  )
}
