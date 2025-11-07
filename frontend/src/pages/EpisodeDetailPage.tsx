import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { EpisodeForm } from '../components/episodes/EpisodeForm'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { Episode } from '../types'
import type { EpisodeFormData } from '../utils/validation'

function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

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

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const handleSubmit = async (data: EpisodeFormData) => {
    if (!id) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const updatedEpisode = await episodesApi.update(id, data)
      setEpisode(updatedEpisode)
      setHasUnsavedChanges(false)
      setSuccessMessage('Episode updated successfully!')

      setTimeout(() => {
        setSuccessMessage(null)
      }, 3000)
    } catch (err) {
      console.error('Failed to update episode:', err)
      setError('Failed to save changes. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    navigate('/')
  }

  useEffect(() => {
    if (episode) {
      const formElement = document.querySelector('form')
      if (formElement) {
        const handleFormChange = () => {
          setHasUnsavedChanges(true)
        }
        formElement.addEventListener('input', handleFormChange)
        return () => formElement.removeEventListener('input', handleFormChange)
      }
    }
  }, [episode])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner variant="page" />
      </div>
    )
  }

  if (error && !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!episode) {
    return null
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="mb-6 text-sm">
        <Link
          to="/"
          className="text-primary hover:text-primary-dark transition-colors"
        >
          Dashboard
        </Link>
        <span className="mx-2 text-gray-400">/</span>
        <span className="text-gray-600">{episode.title}</span>
      </nav>

      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Edit Episode
        </h1>
        <p className="text-gray-600">
          Update episode details and metadata
        </p>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
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

export default EpisodeDetailPage
