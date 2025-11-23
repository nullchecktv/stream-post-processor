import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { quotesApi } from '../api/quotes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useWorkflowState } from '../hooks/useWorkflowState'
import { useToast } from '../contexts/ToastContext'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { Button } from '../components/common/Button'
import { EpisodeHeader } from '../components/episodes/EpisodeHeader'
import { WorkflowProgress } from '../components/episodes/WorkflowProgress'
import { NextActionCard } from '../components/episodes/NextActionCard'
import { ContentCardsGrid } from '../components/episodes/ContentCardsGrid'
import { EpisodeOverviewSkeleton } from '../components/episodes/EpisodeOverviewSkeleton'
import type { EpisodeDetail, EpisodePlan, BlogData, ClipListView, Quote, EpisodeStatus, Episode, WorkflowSteps } from '../types'
import type { EpisodeUpdate } from '@schemas/episodes'

function EpisodeOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [plan, setPlan] = useState<EpisodePlan | null>(null)
  const [blog, setBlog] = useState<BlogData | null>(null)
  const [clips, setClips] = useState<ClipListView[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [contentLoading, setContentLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [contentErrors, setContentErrors] = useState<{
    plan?: string | null
    blog?: string | null
    clips?: string | null
    quotes?: string | null
  }>({})

  usePageTitle(episode ? `${episode.title} - Overview` : 'Episode Overview')

  const episodeForWorkflow = useMemo<Episode | null>(() => {
    if (!episode) return null
    return {
      id: episode.id,
      title: episode.title,
      status: episode.status as EpisodeStatus,
      episodeNumber: episode.episodeNumber,
      description: episode.description,
      airDate: episode.airDate,
      platforms: episode.platforms,
      themes: episode.themes,
      seriesName: episode.seriesName,
      speakers: episode.speakers,
      metrics: {
        tracksCount: episode.tracks?.length || 0,
        hasTranscript: !!episode.transcript,
        clipsCount: episode.clips?.length || 0
      },
      statusHistory: episode.statusHistory,
      workflowSteps: episode.workflowSteps,
      createdAt: episode.createdAt,
      updatedAt: episode.updatedAt
    }
  }, [episode])

  const workflowState = useWorkflowState(episodeForWorkflow)

  const defaultWorkflowSteps: WorkflowSteps = useMemo(() => ({
    generatePlan: { status: 'Not Started' },
    uploadTranscript: { status: 'Not Started' },
    uploadTracks: { status: 'Not Started' }
  }), [])

  const workflowSteps = episode?.workflowSteps || defaultWorkflowSteps

  const fetchEpisode = useCallback(async () => {
    if (!id) {
      setError('Episode ID is required')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [episodeData, statusData] = await Promise.all([
        episodesApi.getDetail(id),
        episodesApi.getStatus(id),
      ])
      setEpisode({ ...(episodeData as any), statusHistory: statusData.statusHistory } as EpisodeDetail)
      setError(null)
    } catch (err) {
      console.error('Failed to fetch episode or status history:', err)
      setError('Failed to load episode. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [id])

  const handleUpdateEpisode = async (updates: EpisodeUpdate) => {
    if (!id) return

    setIsUpdating(true)
    try {
      await episodesApi.update(id, updates)
      await fetchEpisode()
      showToast('Episode updated successfully', 'success')
    } catch (err) {
      console.error('Failed to update episode:', err)
      showToast('Failed to update episode. Please try again.', 'error')
      throw err
    } finally {
      setIsUpdating(false)
    }
  }

  useEffect(() => {
    fetchEpisode()
  }, [fetchEpisode])

  const fetchContent = useCallback(async () => {
    if (!id || !episode) return

    setContentLoading(true)
    const errors: typeof contentErrors = {}

    try {
      const planData = await episodesApi.getPlan(id)
      setPlan(planData)
    } catch (err) {
      console.error('Failed to fetch plan:', err)
      errors.plan = null
    }

    try {
      const blogData = await episodesApi.getBlog(id)
      setBlog(blogData)
    } catch (err) {
      console.error('Failed to fetch blog:', err)
      errors.blog = null
    }

    try {
      const clipsData = await episodesApi.listClips(id)
      setClips(clipsData.items)
    } catch (err) {
      console.error('Failed to fetch clips:', err)
      errors.clips = null
    }

    try {
      const quotesData = await quotesApi.list(id)
      setQuotes(quotesData.items)
    } catch (err) {
      console.error('Failed to fetch quotes:', err)
      errors.quotes = null
    }

    setContentErrors(errors)
    setContentLoading(false)
  }, [id, episode])

  useEffect(() => {
    fetchContent()
  }, [fetchContent])

  useEffect(() => {
    if (!episode) return

    const hasProcessingContent =
      episode.status === 'Processing' ||
      clips.some(clip => clip.status === 'Processing' || clip.status === 'Detected')

    if (!hasProcessingContent) return

    const pollInterval = setInterval(() => {
      fetchContent()
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [episode, clips, fetchContent])

  useEffect(() => {
    if (!id) return

    const handleWorkflowUpdate = (event: CustomEvent) => {
      const message = event.detail?.message
      if (message?.metadata?.episodeId === id) {
        fetchEpisode()
      }
    }

    const handleContentUpdate = () => {
      fetchContent()
    }

    globalThis.addEventListener('workflowStepUpdated', handleWorkflowUpdate as EventListener)
    globalThis.addEventListener('refreshPageContent', handleContentUpdate)

    return () => {
      globalThis.removeEventListener('workflowStepUpdated', handleWorkflowUpdate as EventListener)
      globalThis.removeEventListener('refreshPageContent', handleContentUpdate)
    }
  }, [id, fetchEpisode, fetchContent])

  if (loading || (episode && contentLoading)) {
    return <EpisodeOverviewSkeleton />
  }

  if (error || !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-red-900 mb-2">Unable to Load Episode</h3>
              <p className="text-sm text-red-700 mb-4">{error || 'Episode not found'}</p>
              <div className="flex gap-3">
                <Button
                  onClick={fetchEpisode}
                  variant="primary"
                  size="sm"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Retry
                </Button>
                <Button
                  onClick={() => navigate('/episodes')}
                  variant="ghost"
                  size="sm"
                >
                  Return to Episodes
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <Breadcrumb />

        <EpisodeHeader
          episode={episode}
          onUpdate={handleUpdateEpisode}
          isUpdating={isUpdating}
        />

        {workflowState?.nextAction && (
          <NextActionCard
            action={workflowState.nextAction}
            isLoading={false}
          />
        )}

        <WorkflowProgress
          episodeId={id!}
          workflowSteps={workflowSteps}
          onSkipPlan={() => {
            fetchEpisode()
          }}
        />

        <ContentCardsGrid
          episodeId={id!}
          plan={plan?.plan ?? null}
          blog={blog}
          clips={clips}
          quotes={quotes}
          errors={contentErrors}
          workflowSteps={workflowSteps}
        />
      </div>
    </ErrorBoundary>
  )
}

export default EpisodeOverviewPage

