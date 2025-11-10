import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { Input } from '../common/Input'
import { episodesApi } from '../../api/episodes'
import { z } from 'zod'

interface CreateEpisodeModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

const createEpisodeSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  episodeNumber: z.string().min(1, 'Episode number is required'),
  airDate: z.string().optional(),
  seriesName: z.string().max(100, 'Series name must be less than 100 characters').optional(),
})

type CreateEpisodeFormData = z.infer<typeof createEpisodeSchema>

export function CreateEpisodeModal({ isOpen, onClose, onSuccess }: CreateEpisodeModalProps) {
  const navigate = useNavigate()
  const [formData, setFormData] = useState<CreateEpisodeFormData>({
    title: '',
    episodeNumber: '',
    airDate: '',
    seriesName: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  const handleChange = (field: keyof CreateEpisodeFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
    setApiError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      const validated = createEpisodeSchema.parse(formData)
      setErrors({})
      setApiError(null)
      setLoading(true)

      const episodeData = {
        title: validated.title,
        episodeNumber: parseInt(validated.episodeNumber, 10),
        ...(validated.airDate && { airDate: new Date(validated.airDate).toISOString() }),
        ...(validated.seriesName && { seriesName: validated.seriesName }),
      }

      const response = await episodesApi.create(episodeData)

      onClose()
      onSuccess?.()
      navigate(`/episodes/${response.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error('Failed to create episode:', err)
        setApiError('Failed to create episode. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setFormData({
        title: '',
        episodeNumber: '',
        airDate: '',
        seriesName: '',
      })
      setErrors({})
      setApiError(null)
      onClose()
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create New Episode" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800 animate-slideDown">
            {apiError}
          </div>
        )}

        <Input
          label="Episode Title"
          type="text"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          error={errors.title}
          placeholder="Enter episode title"
          required
          disabled={loading}
        />

        <Input
          label="Episode Number"
          type="number"
          value={formData.episodeNumber}
          onChange={(e) => handleChange('episodeNumber', e.target.value)}
          error={errors.episodeNumber}
          placeholder="1"
          required
          disabled={loading}
          min="1"
          step="1"
        />

        <Input
          label="Air Date (Optional)"
          type="datetime-local"
          value={formData.airDate}
          onChange={(e) => handleChange('airDate', e.target.value)}
          error={errors.airDate}
          disabled={loading}
        />

        <Input
          label="Series Name (Optional)"
          type="text"
          value={formData.seriesName}
          onChange={(e) => handleChange('seriesName', e.target.value)}
          error={errors.seriesName}
          placeholder="Enter series name"
          disabled={loading}
        />

        <div className="flex justify-end space-x-3 pt-4">
          <Button
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={loading}
          >
            Create Episode
          </Button>
        </div>
      </form>
    </Modal>
  )
}
