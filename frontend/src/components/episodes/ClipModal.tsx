import { useState, useEffect } from 'react'
import { episodesApi } from '../../api/episodes'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface ClipModalProps {
  clipId: string
  episodeId: string
  isOpen: boolean
  onClose: () => void
}

export function ClipModal({ clipId, episodeId, isOpen, onClose }: ClipModalProps) {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && clipId && episodeId) {
      fetchPlaybackUrl()
    }

    return () => {
      setPlaybackUrl(null)
      setError(null)
    }
  }, [isOpen, clipId, episodeId])

  useEffect(() => {
    if (!isOpen) return

    document.body.style.overflow = 'hidden'

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = 'unset'
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const fetchPlaybackUrl = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await episodesApi.playClip(episodeId, clipId)
      setPlaybackUrl(response.downloadUrl)
    } catch (err) {
      console.error('Failed to fetch playback URL:', err)
      setError('Failed to load video. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const handleRetry = () => {
    fetchPlaybackUrl()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label="Clip video player"
    >
      <div className="relative bg-white rounded-lg p-6 max-w-4xl w-full mx-4">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded z-10"
          aria-label="Close modal"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {loading && (
          <div className="bg-black rounded-lg aspect-video flex items-center justify-center">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="mt-4 text-white text-sm">Loading video...</p>
            </div>
          </div>
        )}

        {error && !loading && (
          <div className="bg-gray-900 rounded-lg aspect-video flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="mb-4">
                <svg
                  className="w-16 h-16 text-red-400 mx-auto"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Playback Error</h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        )}

        {playbackUrl && !loading && !error && (
          <video
            src={playbackUrl}
            controls
            autoPlay
            className="w-full rounded aspect-video"
            controlsList="nodownload"
          >
            <track kind="captions" />
            Your browser does not support the video tag.
          </video>
        )}
      </div>
    </div>
  )
}
