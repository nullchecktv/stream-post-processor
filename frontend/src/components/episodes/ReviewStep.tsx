import { Button } from '../common/Button'

interface ReviewStepProps {
  formData: {
    title: string
    episodeNumber: string
    airDate: string
    seriesName: string
    platforms: string[]
    themes: string[]
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
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Review & Create</h3>
        <p className="text-sm text-gray-600">
          Review your episode details before creating. You can edit any section by clicking the edit button.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">
          {error}
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                >
                  {platform}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No platforms selected</p>
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
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-purple-100 text-purple-800"
                >
                  {theme}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No themes added</p>
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
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-gray-900">{title}</h4>
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
      <span className="text-gray-600">{label}:</span>
      <span className="text-gray-900 font-medium">{value}</span>
    </div>
  )
}
