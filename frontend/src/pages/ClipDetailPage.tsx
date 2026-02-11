import { useState, useEffect, useCallback } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Badge } from '../components/common/Badge'
import { useToast } from '../contexts/ToastContext'
import { ChevronRight, Home, Clock, Tag, Sparkles, Trash2 } from 'lucide-react'
import type { ClipListView, Episode } from '../types'

function ClipDetailPage() {
  const { episodeId, clipId } = useParams<{ episodeId: string; clipId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [clip, setClip] = useState<ClipListView | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [videoError, setVideoError] = useState(false)

  usePageTitle(clip ? clip.title : 'Clip Details')

  const clipTypeConfig: Record<string, { colors: string; label: string }> = {
    educational: { colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]', label: 'Educational' },
    funny: { colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]', label: 'Funny' },
    demo: { colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]', label: 'Demo' },
    hot_take: { colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]', label: 'Hot Take' },
    insight: { colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-border)]', label: 'Insight' },
  }

  const fetchData = useCallback(async () => {
    if (!episodeId || !clipId) {
      setError('Episode ID and Clip ID are required')
      setLoading(false)
      return
    }

    try {
      const [clipData, episodeData] = await Promise.all([
        episodesApi.getClip(episodeId, clipId),
        episodesApi.get(episodeId)
      ])
      setClip(clipData)
      setEpisode(episodeData)
      setError(null)

      if (clipData.status === 'Created') {
        try {
          const playData = await episodesApi.playClip(episodeId, clipId)
          setPlaybackUrl(playData.downloadUrl)
          setVideoError(false)
        } catch (err) {
          console.error('Failed to fetch playback URL:', err)
          setVideoError(true)
        }
      }
    } catch (err) {
      console.error('Failed to fetch clip or episode:', err)
      setError('Failed to load clip details. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [episodeId, clipId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleGenerate = async () => {
    if (!episodeId || !clipId) return

    try {
      setGenerating(true)
      await episodesApi.generateClip(episodeId, clipId, { orientation: 'landscape' })
      await fetchData()
    } catch (err) {
      console.error('Failed to generate clip:', err)
      showToast('Failed to start clip generation. Please try again.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleDelete = async () => {
    if (!episodeId || !clipId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this clip? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setDeleting(true)
      await episodesApi.deleteClip(episodeId, clipId)
      navigate(`/episodes/${episodeId}/clips`)
    } catch (err) {
      console.error('Failed to delete clip:', err)
      showToast('Failed to delete clip. Please try again.', 'error')
      setDeleting(false)
    }
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'warning' | 'info' | 'success' | 'error'; label: string }> = {
      Proposed: { variant: 'warning', label: 'Proposed' },
      Processing: { variant: 'info', label: 'Processing' },
      Created: { variant: 'success', label: 'Created' },
      Failed: { variant: 'error', label: 'Failed' }
    }

    const config = statusMap[status] || statusMap.Proposed

    return (
      <Badge variant={config.variant} size="sm">
        {config.label}
      </Badge>
    )
  }

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error || !clip || !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-lg p-4">
          <p className="text-[var(--color-error)]">{error || 'Clip not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-[var(--color-text-muted)] mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-[var(--color-accent)] transition-colors duration-[var(--duration-fast)] flex items-center gap-1">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
        <Link to="/episodes" className="hover:text-[var(--color-accent)] transition-colors duration-[var(--duration-fast)]">
          Episodes
        </Link>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
        <Link to={`/episodes/${episodeId}`} className="hover:text-[var(--color-accent)] transition-colors duration-[var(--duration-fast)]">
          {episode.title}
        </Link>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
        <Link to={`/episodes/${episodeId}/clips`} className="hover:text-[var(--color-accent)] transition-colors duration-[var(--duration-fast)]">
          Clips
        </Link>
        <ChevronRight className="w-4 h-4 text-[var(--color-text-disabled)]" />
        <span className="text-[var(--color-text-primary)] font-medium">{clip.title}</span>
      </nav>

      <div className="space-y-6">
        <div className="bg-[var(--color-surface)] rounded-flat border border-gray-200 shadow-flat p-[var(--space-6)]">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-[var(--color-text-primary)] mb-2">{clip.title}</h1>
              <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)]">
                {getStatusBadge(clip.status)}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(clip.duration)}</span>
                </div>
                {clip.clipType && (() => {
                  const cfg = clipTypeConfig[clip.clipType] || { colors: 'bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] border-[var(--color-border)]', label: clip.clipType }
                  return (
                    <Badge
                      variant="accent"
                      size="sm"
                      icon={<Tag className="w-3.5 h-3.5" />}
                    >
                      {cfg.label}
                    </Badge>
                  )
                })()}
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--color-error)] bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-flat shadow-flat-sm hover:shadow-flat hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              title="Delete clip"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          {clip.status === 'Created' && playbackUrl && !videoError && (
            <div className="mb-6">
              <video
                src={playbackUrl}
                controls
                className="w-full rounded-flat bg-[var(--color-background)] shadow-flat"
                onError={() => setVideoError(true)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {clip.status === 'Created' && videoError && (
            <div className="mb-6 bg-[var(--color-surface-raised)] border border-[var(--color-warning)] rounded-flat shadow-flat-sm p-4">
              <p className="text-[var(--color-text-primary)]">
                Unable to load video. The playback URL may have expired. Please refresh the page.
              </p>
            </div>
          )}

          {clip.status === 'Processing' && (
            <div className="mb-6 bg-[var(--color-surface-raised)] border border-[var(--color-info)] rounded-flat shadow-flat-sm p-4 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-[var(--color-text-primary)]">
                This clip is currently being processed. Check back soon!
              </p>
            </div>
          )}

          {clip.status === 'Failed' && (
            <div className="mb-6 bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-flat shadow-flat-sm p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-[var(--color-text-primary)] flex-1">
                  Clip generation failed. Please try generating it again.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-sm font-medium rounded-flat shadow-flat hover:shadow-flat-md hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                >
                  {generating ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Retrying...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Retry Generation
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {clip.status === 'Proposed' && (
            <div className="mb-6 flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating || !episode.metrics?.tracksCount}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-sm font-medium rounded-flat shadow-flat hover:shadow-flat-md hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {generating ? (
                  <>
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Clip
                  </>
                )}
              </button>
              {!episode.metrics?.tracksCount && (
                <p className="text-sm text-[var(--color-text-muted)] italic">
                  Video tracks must be uploaded first.{' '}
                  <Link to={`/episodes/${episodeId}`} className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium not-italic transition-colors duration-[var(--duration-fast)]">
                    Upload tracks
                  </Link>
                </p>
              )}
            </div>
          )}

          {clip.summary && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">Summary</h2>
              <p className="text-[var(--color-text-secondary)]">{clip.summary}</p>
            </div>
          )}

          {clip.transcript && (
            <div>
              <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">
                Transcript {clip.segmentCount && `(${clip.segmentCount} segment${clip.segmentCount !== 1 ? 's' : ''})`}
              </h2>
              <div className="bg-[var(--color-surface-raised)] rounded-flat shadow-flat-sm p-4">
                <p className="text-[var(--color-text-secondary)] whitespace-pre-wrap">{clip.transcript}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClipDetailPage
