import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useWorkflowState } from '../hooks/useWorkflowState'
import { ErrorBoundary } from '../components/common/ErrorBoundary'
import { EpisodeDetailSkeleton } from '../components/common/EpisodeDetailSkeleton'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { Button } from '../components/common/Button'
import { EpisodeStatusChip } from '../components/episodes/EpisodeStatusChip'
import { WorkflowProgress } from '../components/episodes/WorkflowProgress'
import { NextActionCard } from '../components/episodes/NextActionCard'
import { ContentCardsGrid } from '../components/episodes/ContentCardsGrid'
import { formatDate } from '../utils/date'
import type { EpisodeDetail, EpisodePlan, BlogData, ClipListView, Quote, EpisodeStatus } from '../types'

function EpisodeOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [plan, setPlan] = useState<EpisodePlan | null>(null)
  const [blog, setBlog] = useState<BlogData | null>(null)
  const [clips, setClips] = useState<ClipListView[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [contentErrors, setContentErrors] = useState<{
    plan?: string | null
    blog?: string | null
    clips?: string | null
    quotes?: string | null
  }>({})

  usePageTitle(episode ? `${episode.title} - Overview` : 'Episode Overview')

  const episodeForWorkflow = episode ? {
    id: episode.id,
    title: episode.title,
    status: episode.status as EpisodeStatus,
    episodeNumber: episode.episodeNumber,
    description: episode.description,
    airDate: episode.airDate,
    platforms: episode.platforms,
    themes: episode.themes,
    seriesName: episode.seriesName,
    metrics: {
      tracksCount: episode.tracks?.length || 0,
      hasTranscript: !!episode.transcript,
      clipsCount: episode.clips?.length || 0
    },
    statusHistory: episode.statusHistory,
    createdAt: episode.createdAt,
    updatedAt: episode.updatedAt
  } : null

  const workflowState = useWorkflowState(episodeForWorkflow, !!plan)

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

  useEffect(() => {
    fetchEpisode()
  }, [fetchEpisode])

  const fetchContent = useCallback(async () => {
    if (!id || !episode) return

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

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <EpisodeDetailSkeleton />
        </div>
      </div>
    )
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

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-bold text-gray-900">
                  Episode #{episode.episodeNumber}: {episode.title}
                </h1>
                <EpisodeStatusChip status={episode.status as any} size="md" showIcon />
              </div>
              {episode.seriesName && (
                <p className="text-sm text-gray-600">Series: {episode.seriesName}</p>
              )}
            </div>
            <Button
              onClick={() => navigate(`/episodes/${id}/details`)}
              variant="ghost"
            >
              <svg className="w-4 h-4 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Details
            </Button>
          </div>

          <div className="space-y-4">
            {episode.airDate && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="font-medium">Aired:</span>
                <span className="ml-2">{formatDate(episode.airDate)}</span>
              </div>
            )}

            {episode.platforms && episode.platforms.length > 0 && (
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-5 h-5 mr-2 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                <span className="font-medium">Platforms:</span>
                <span className="ml-2">{episode.platforms.join(', ')}</span>
              </div>
            )}

            {episode.themes && episode.themes.length > 0 && (
              <div className="flex items-start text-sm text-gray-600">
                <svg className="w-5 h-5 mr-2 mt-0.5 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                <div>
                  <span className="font-medium">Themes:</span>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {episode.themes.map((theme) => (
                      <span
                        key={theme}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                      >
                        {theme}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {episode.description && (
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{episode.description}</p>
              </div>
            )}
          </div>
        </div>

        {workflowState && (
          <WorkflowProgress
            currentStep={workflowState.currentStep}
            completedSteps={workflowState.completedSteps}
            onStepClick={(step) => {
              if (step === 2) {
                navigate(`/episodes/${id}/plan`)
              } else if (step === 3 || step === 4) {
                navigate(`/episodes/${id}/uploads`)
              }
            }}
          />
        )}

        {workflowState && (
          <NextActionCard
            action={workflowState.nextAction}
            isLoading={false}
          />
        )}

        <ContentCardsGrid
          episodeId={id!}
          plan={plan?.plan ?? null}
          blog={blog}
          clips={clips}
          quotes={quotes}
          errors={contentErrors}
        />
      </div>
    </ErrorBoundary>
  )
}

export default EpisodeOverviewPage

