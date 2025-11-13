import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { EpisodeDetailSkeleton } from '../components/common/EpisodeDetailSkeleton'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { Button } from '../components/common/Button'
import { EpisodeStatusChip } from '../components/episodes/EpisodeStatusChip'
import { StatusHistoryTimeline } from '../components/episodes/StatusHistoryTimeline'
import { formatDate } from '../utils/date'
import type { EpisodeDetail } from '../types'

function EpisodeOverviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  usePageTitle(episode ? `${episode.title} - Overview` : 'Episode Overview')

  useEffect(() => {
    const fetchEpisode = async () => {
      if (!id) {
        setError('Episode ID is required')
        setLoading(false)
        return
      }

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
    }

    fetchEpisode()
  }, [id])

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
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Episode not found'}</p>
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

  const tracksCount =
    (episode as any)?.metrics?.tracksCount ?? (episode.tracks?.length || 0)
  const hasTranscript =
    (episode as any)?.metrics?.hasTranscript ?? !!episode.transcript
  const clipsCount =
    (episode as any)?.metrics?.clipsCount ?? (episode.clips?.length || 0)

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button
                onClick={() => navigate(`/episodes/${id}/uploads`)}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{tracksCount}</p>
                  <p className="text-sm text-gray-600">Track{tracksCount !== 1 ? 's' : ''} uploaded</p>
                </div>
              </button>

              <button
                onClick={() => navigate(`/episodes/${id}/uploads`)}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {hasTranscript ? (
                      <span className="inline-flex items-center text-emerald-600" aria-label="Uploaded">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-gray-400" aria-label="Not uploaded">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-600">
                    Transcript {hasTranscript ? 'uploaded' : 'not uploaded'}
                  </p>
                </div>
              </button>

              <button
                onClick={() => navigate(`/episodes/${id}/clips`)}
                className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer text-left"
              >
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{clipsCount}</p>
                  <p className="text-sm text-gray-600">Clip{clipsCount !== 1 ? 's' : ''}</p>
                </div>
              </button>
            </div>
          </div>


        </div>

        <div className="lg:col-span-1">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 lg:sticky lg:top-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Status History</h2>
            <StatusHistoryTimeline statusHistory={episode.statusHistory || []} />
          </div>
        </div>
      </div>
    </div>
  )
}

export default EpisodeOverviewPage

