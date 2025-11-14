import { Input } from '../common/Input'
import { z } from 'zod'

interface BasicInfoStepProps {
  formData: {
    title: string
    episodeNumber: string
    airDate: string
    seriesName: string
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
  const handleChange = (field: keyof BasicInfoStepProps['formData'], value: string) => {
    onChange({ [field]: value })

    const updatedData = { ...formData, [field]: value }
    const result = basicInfoSchema.safeParse(updatedData)
    onValidate(result.success)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Basic Information</h3>
        <p className="text-sm text-gray-600">
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
          autoFocus
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
      </div>
    </div>
  )
}
