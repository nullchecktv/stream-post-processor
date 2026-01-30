import { useState, useEffect, useRef } from 'react'
import { episodesApi } from '../../api/episodes'
import { LoadingSpinner } from '../common/LoadingSpinner'

interface ClipPlayerProps {
  clipId: string
  episodeId: string
  title: string
  autoplay?: boolean
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onClose?: () => void
}

export function ClipPlayer({
  clipId,
  episodeId,
  title,
  autoplay = false,
  onPlaybackStart,
  onPlaybackEnd,
  onClose
}: ClipPlayerProps) {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    fetchVideoUrl()
  }, [clipId, episodeId])

  const fetchVideoUrl = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await episodesApi.playClip(episodeId, clipId)
      setVideoUrl(response.downloadUrl)
    } catch (err) {
      console.error('Failed to fetch video URL:', err)
      setError('Failed to load video. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = () => {
    onPlaybackStart?.()
  }

  const handleEnded = () => {
    onPlaybackEnd?.()
  }

  const handleRetry = () => {
    fetchVideoUrl()
  }

  if (loading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] aspect-video flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-[var(--color-text-primary)] text-sm">Loading video...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] aspect-video flex items-center justify-center p-[var(--space-8)]">
        <div className="text-center max-w-md">
          <div className="mb-4">
            <svg className="w-16 h-16 text-[var(--color-error)] mx-auto" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Playback Error</h3>
          <p className="text-[var(--color-text-secondary)] mb-6">{error}</p>
          <button
            onClick={handleRetry}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] transition-colors duration-[var(--duration-fast)]"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="relative bg-[var(--color-surface)] rounded-[var(--radius-lg)] overflow-hidden">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-[var(--color-overlay)] text-[var(--color-text-on-accent)] rounded-full hover:bg-[var(--color-surface-raised)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)]"
          aria-label="Close player"
        >
          <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}

      <video
        ref={videoRef}
        src={videoUrl || undefined}
        controls
        autoPlay={autoplay}
        onPlay={handlePlay}
        onEnded={handleEnded}
        className="w-full aspect-video"
        controlsList="nodownload"
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>

      {title && (
        <div className="absolute bottom-0 left-0 right-0 bg-[var(--color-overlay)] p-4">
          <p className="text-[var(--color-text-on-accent)] text-sm font-medium truncate">{title}</p>
        </div>
      )}
    </div>
  )
}
