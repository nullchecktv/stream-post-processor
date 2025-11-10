import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { EpisodeNavigation } from '../components/episodes/EpisodeNavigation'
import { EpisodeForm } from '../components/episodes/EpisodeForm'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { Episode } from '../types'
import type { EpisodeFormData } from '../utils/validation'

function EpisodeDetailsPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  usePageTitle(episode ? `Edit ${episode.title}` : 'Edit Episode')

  useEffect(() => {
    const fetchEpisode = async () => {
      if (!id) {
        setError('Episode ID is required')
        setLoading(false)
        return
      }

      try {
        const data = await episodesApi.get(id)
        setEpisode(data)
        setError(null)
      } catch (err) {
        console.error('Failed to fetch episode:', err)
        setError('Failed to load episode. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchEpisode()
  }, [id])

  const handleSubmit = async (data: EpisodeFormData) => {
    if (!id) return

    setIsSubmitting(true)
    setError(null)

    try {
      const payload: EpisodeFormData = {
        ...data,
        // Convert local datetime string to ISO when provided; otherwise omit
        airDate: data.airDate ? new Date(data.airDate).toISOString() : undefined,
      }
      const updatedEpisode = await episodesApi.update(id, payload)
      setEpisode(updatedEpisode)
      showToast('Episode updated successfully', 'success')
      navigate(`/episodes/${id}/overview`)
    } catch (err) {
      console.error('Failed to update episode:', err)
      setError('Failed to save changes. Please try again.')
      showToast('Failed to update episode', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    navigate(`/episodes/${id}/overview`)
  }

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error && !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => navigate('/episodes')}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            Return to Episodes
          </button>
        </div>
      </div>
    )
  }

  if (!episode) {
    return null
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      <EpisodeNavigation />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Edit Episode Details
          </h1>
          <p className="text-gray-600">
            Update episode metadata and information
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        <EpisodeForm
          episode={episode}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  )
}

export default EpisodeDetailsPage
