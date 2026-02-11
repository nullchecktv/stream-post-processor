import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ClipsList } from '../components/episodes/ClipsList'
import type { EpisodeDetail, ClipListView } from '../types'

function EpisodeClipsPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [generatingAll, setGeneratingAll] = useState(false)
  const [clips, setClips] = useState<ClipListView[]>([])
  const [clipCounts, setClipCounts] = useState({ total: 0, proposed: 0, processing: 0, processed: 0 })

  usePageTitle(episode ? `${episode.title} - Clips` : 'Episode Clips')

  const fetchEpisode = useCallback(async () => {
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
  }, [id])

  useEffect(() => {
    fetchEpisode()
  }, [fetchEpisode])

  useEffect(() => {
    const handleRefresh = () => {
      fetchEpisode()
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    return () => window.removeEventListener('refreshPageContent', handleRefresh)
  }, [fetchEpisode])

  const handleGenerateClips = async () => {
    if (!id) return

    const confirmed = window.confirm(
      'Start clip generation for this episode? This will analyze the transcript and create clips.'
    )

    if (!confirmed) return

    try {
      setGenerating(true)
      await episodesApi.updateStatus(id, 'Ready for Clip Gen')
      await fetchEpisode()
    } catch (err) {
      console.error('Failed to start clip generation:', err)
      showToast('Failed to start clip generation. Please try again.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateAll = async () => {
    if (!id) return

    const proposedClips = clips.filter(c => c.status === 'Proposed')

    if (proposedClips.length === 0) {
      showToast('No proposed clips to generate', 'info')
      return
    }

    const confirmed = window.confirm(
      `Generate ${proposedClips.length} proposed clip${proposedClips.length !== 1 ? 's' : ''}? This will start processing all proposed clips.`
    )

    if (!confirmed) return

    try {
      setGeneratingAll(true)

      const results = await Promise.allSettled(
        proposedClips.map(clip =>
          episodesApi.generateClip(id, clip.id, { orientation: 'landscape' })
        )
      )

      const succeeded = results.filter(r => r.status === 'fulfilled').length
      const failed = results.filter(r => r.status === 'rejected').length

      if (failed > 0) {
        showToast(`Started ${succeeded} clip${succeeded !== 1 ? 's' : ''}, ${failed} failed`, 'warning')
      }
    } catch (err) {
      console.error('Failed to generate clips:', err)
      showToast('Failed to start clip generation', 'error')
    } finally {
      setGeneratingAll(false)
    }
  }

  const handleClipsLoaded = (counts: { total: number; proposed: number; processing: number; processed: number }, allClips: ClipListView[]) => {
    setClipCounts(counts)
    setClips(allClips)
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

  const hasTracksUploaded = episode.tracks && episode.tracks.length > 0
  const canGenerate = hasTracksUploaded

  return (
    <div className="space-y-[var(--space-6)]">
      <Breadcrumb />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-center justify-between mb-[var(--space-4)]">
          <div>
            <h1 className="text-[length:var(--text-2xl)] font-semibold text-[var(--color-text-primary)]">
              Episode Clips
            </h1>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-muted)] mt-1">
              {clipCounts.total} clip{clipCounts.total !== 1 ? 's' : ''} for this episode
            </p>
          </div>
          <div>
            {clipCounts.total === 0 ? (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleGenerateClips}
                  disabled={generating || !canGenerate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-[length:var(--text-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)]"
                  title={!canGenerate ? 'Upload at least one track to generate clips' : ''}
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
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate Clips
                    </>
                  )}
                </button>
                {!canGenerate && (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Upload tracks first</p>
                )}
              </div>
            ) : clipCounts.proposed > 0 ? (
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={handleGenerateAll}
                  disabled={generatingAll || !canGenerate}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-[length:var(--text-sm)] font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)]"
                  title={!canGenerate ? 'Upload at least one track to generate clips' : ''}
                >
                  {generatingAll ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Generate All ({clipCounts.proposed})
                    </>
                  )}
                </button>
                {!canGenerate && (
                  <p className="text-[length:var(--text-xs)] text-[var(--color-text-muted)]">Upload tracks first</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] border border-[var(--color-warning)]">
            <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-warning)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <div>
              <p className="text-[length:var(--text-2xl)] font-bold text-[var(--color-text-primary)]">{clipCounts.proposed}</p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">Proposed</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] border border-[var(--color-info)]">
            <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-info)]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <div>
              <p className="text-[length:var(--text-2xl)] font-bold text-[var(--color-text-primary)]">{clipCounts.processing}</p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">Processing</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] border border-[var(--color-success)]">
            <div className="w-10 h-10 bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] flex items-center justify-center">
              <svg className="w-5 h-5 text-[var(--color-success)]" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-[length:var(--text-2xl)] font-bold text-[var(--color-text-primary)]">{clipCounts.processed}</p>
              <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">Created</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-[var(--space-6)]">
        <ClipsList episodeId={id} onClipsLoaded={handleClipsLoaded} />
      </div>
    </div>
  )
}

export default EpisodeClipsPage
