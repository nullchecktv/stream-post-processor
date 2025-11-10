import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { EpisodeSchema, type EpisodeFormData } from '../../utils/validation'
import { Input } from '../common/Input'
import { Button } from '../common/Button'
import type { Episode } from '../../types'

interface EpisodeFormProps {
  episode?: Episode
  onSubmit: (data: EpisodeFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

const platformOptions = [
  { value: 'linkedin live', label: 'LinkedIn Live' },
  { value: 'X', label: 'X (Twitter)' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
] as const

export function EpisodeForm({ episode, onSubmit, onCancel, isSubmitting = false }: EpisodeFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<EpisodeFormData>({
    resolver: zodResolver(EpisodeSchema),
    defaultValues: episode ? {
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      description: episode.description || '',
      airDate: episode.airDate || '',
      platforms: episode.platforms || [],
      themes: Array.isArray(episode.themes) ? episode.themes : [],
      seriesName: episode.seriesName || '',
    } : undefined,
  })

  const handleFormSubmit = async (data: EpisodeFormData) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Input
        label="Title"
        {...register('title')}
        error={errors.title?.message}
        placeholder="Enter episode title"
      />

      <Input
        label="Episode Number"
        type="number"
        {...register('episodeNumber', { valueAsNumber: true })}
        error={errors.episodeNumber?.message}
        placeholder="1"
      />

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          id="description"
          {...register('description')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            errors.description
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          placeholder="Enter episode description"
        />
        {errors.description && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      <Input
        label="Air Date"
        type="datetime-local"
        {...register('airDate')}
        error={errors.airDate?.message}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Platforms
        </label>
        <div className="space-y-2">
          {platformOptions.map((platform) => (
            <label key={platform.value} className="flex items-center">
              <input
                type="checkbox"
                value={platform.value}
                {...register('platforms')}
                className="h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              />
              <span className="ml-2 text-sm text-gray-700">{platform.label}</span>
            </label>
          ))}
        </div>
        {errors.platforms && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.platforms.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="themes" className="block text-sm font-medium text-gray-700 mb-1">
          Themes (comma-separated)
        </label>
        <input
          id="themes"
          type="text"
          {...register('themes', {
            setValueAs: (value: string | string[]) => {
              if (Array.isArray(value)) return value;
              return value ? value.split(',').map(t => t.trim()).filter(Boolean) : [];
            },
          })}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            errors.themes
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          placeholder="technology, programming, tutorial"
        />
        {errors.themes && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.themes.message}
          </p>
        )}
      </div>

      <Input
        label="Series Name"
        {...register('seriesName')}
        error={errors.seriesName?.message}
        placeholder="Enter series name"
      />

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={!isDirty || isSubmitting}
        >
          {episode ? 'Save Changes' : 'Create Episode'}
        </Button>
      </div>
    </form>
  )
}
