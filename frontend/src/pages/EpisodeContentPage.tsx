import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
// Removed uploads list duplication; dialog handles active uploads
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { TranscriptUploader } from '../components/episodes/TranscriptUploader'
import { TrackUploader } from '../components/episodes/TrackUploader'
import { TrackCard } from '../components/episodes/TrackCard'
import { TranscriptUploadGuidance } from '../components/episodes/TranscriptUploadGuidance'
import { formatDate } from '../utils/date'
import type { EpisodeDetail } from '../types'

function EpisodeContentPage() {
  const { id } = useParams<{ id: string }>()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  usePageTitle(episode ? `${episode.title} - Uploads` : 'Episode Uploads')

  const fetchEpisode = async () => {
    if (!id) {
      setError('Episode ID is required')
      setLoading(false)
      return
    }

    try {
      const data = await episodesApi.getDetail(id)
      setEpisode(data)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch episode:', err)
      setError('Failed to load episode. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchEpisode()
  }, [id, refreshKey])

  useEffect(() => {
    const handleRefresh = () => {
      setRefreshKey(prev => prev + 1)
    }

    const handleWorkflowUpdate = (event: CustomEvent) => {
      const message = event.detail?.message
      if (message?.metadata?.episodeId === id) {
        setRefreshKey(prev => prev + 1)
      }
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    window.addEventListener('workflowStepUpdated', handleWorkflowUpdate as EventListener)
    return () => {
      window.removeEventListener('refreshPageContent', handleRefresh)
      window.removeEventListener('workflowStepUpdated', handleWorkflowUpdate as EventListener)
    }
  }, [id])

  const handleUploadComplete = () => {
    setTimeout(() => {
      setRefreshKey(prev => prev + 1)
    }, 1000)
  }

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error || !episode || !id) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-[var(--color-surface)] border border-[var(--color-error)] rounded-[var(--radius-lg)] p-4">
          <p className="text-[var(--color-error)]">{error || 'Episode not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-center justify-between mb-[var(--space-6)]">
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Transcript</h2>
          {episode.transcript && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-[length:var(--text-xs)] font-medium bg-[var(--color-success)] text-white">
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Uploaded
            </span>
          )}
        </div>

        <TranscriptUploadGuidance trackCount={episode.trackCount || episode.tracks?.length || 0} />

        {episode.transcript ? (
          <div className="mb-[var(--space-6)] p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)]">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-accent-subtle)] rounded-[var(--radius-lg)] flex items-center justify-center">
                <svg className="w-5 h-5 text-[var(--color-accent)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-[var(--color-text-primary)] truncate">
                  {episode.transcript.filename}
                </p>
                <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)] mt-1">
                  Uploaded {formatDate(episode.transcript.uploadedAt)}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-[length:var(--text-xs)] font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] capitalize flex-shrink-0">
                {episode.transcript.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-[var(--space-6)] p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-center">
            <svg className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">No transcript uploaded yet</p>
          </div>
        )}

        <TranscriptUploader
          episodeId={id}
          hasExistingTranscript={!!episode.transcript}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-center justify-between mb-[var(--space-6)]">
          <h2 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)]">Video Tracks</h2>
          {episode.tracks && episode.tracks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[var(--radius-full)] text-[length:var(--text-xs)] font-medium bg-[var(--color-accent-subtle)] text-[var(--color-accent)]">
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {episode.tracks.length} {episode.tracks.length === 1 ? 'Track' : 'Tracks'}
            </span>
          )}
        </div>

        {episode.tracks && episode.tracks.length > 0 ? (
          <div className="mb-[var(--space-6)] space-y-3">
            {episode.tracks.map((track) => (
              <TrackCard
                key={track.name}
                track={track}
                episodeId={id}
                episodeSpeakers={episode.speakers || []}
                onUpdate={handleUploadComplete}
              />
            ))}
          </div>
        ) : (
          <div className="mb-[var(--space-6)] p-4 bg-[var(--color-surface-raised)] border border-[var(--color-border)] rounded-[var(--radius-lg)] text-center">
            <svg className="mx-auto h-10 w-10 text-[var(--color-text-muted)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-muted)]">No video tracks uploaded yet</p>
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Upload your first track to get started</p>
          </div>
        )}

        <TrackUploader
          episodeId={id}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      {/* Active uploads handled by global uploads dialog; removed here to avoid duplication */}
    </div>
  )
}

export default EpisodeContentPage
