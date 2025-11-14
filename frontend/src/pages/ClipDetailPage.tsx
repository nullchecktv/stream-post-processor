import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
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
    educational: { colors: 'bg-blue-50 text-blue-700 border-blue-200', label: 'Educational' },
    funny: { colors: 'bg-pink-50 text-pink-700 border-pink-200', label: 'Funny' },
    demo: { colors: 'bg-purple-50 text-purple-700 border-purple-200', label: 'Demo' },
    hot_take: { colors: 'bg-red-50 text-red-700 border-red-200', label: 'Hot Take' },
    insight: { colors: 'bg-green-50 text-green-700 border-green-200', label: 'Insight' },
  }

  const fetchData = async () => {
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
  }

  useEffect(() => {
    fetchData()
  }, [episodeId, clipId])

  const handleGenerate = async () => {
    if (!episodeId || !clipId) return

    const confirmed = window.confirm(
      'Generate this clip? This will process the video segments and create the final clip.'
    )

    if (!confirmed) return

    try {
      setGenerating(true)
      await episodesApi.generateClip(episodeId, clipId, { orientation: 'landscape' })
      showToast('Clip generation started! The clip will be processed shortly.', 'success')
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
      showToast('Clip deleted successfully', 'success')
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
    const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
      Proposed: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Proposed' },
      Processing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Processing' },
      Created: { bg: 'bg-green-100', text: 'text-green-800', label: 'Created' },
      Failed: { bg: 'bg-red-100', text: 'text-red-800', label: 'Failed' }
    }

    const config = statusConfig[status] || statusConfig.Proposed

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error || !clip || !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Clip not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-600 mb-6" aria-label="Breadcrumb">
        <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1">
          <Home className="w-4 h-4" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link to="/episodes" className="hover:text-primary transition-colors">
          Episodes
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link to={`/episodes/${episodeId}`} className="hover:text-primary transition-colors">
          {episode.title}
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <Link to={`/episodes/${episodeId}/clips`} className="hover:text-primary transition-colors">
          Clips
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-medium">{clip.title}</span>
      </nav>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">{clip.title}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                {getStatusBadge(clip.status)}
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  <span>{formatDuration(clip.duration)}</span>
                </div>
                {clip.clipType && (() => {
                  const cfg = clipTypeConfig[clip.clipType] || { colors: 'bg-gray-100 text-gray-700 border-gray-300', label: clip.clipType }
                  return (
                    <span className={`inline-flex items-center px-2.5 py-0.5 text-xs font-semibold rounded-lg border ${cfg.colors}`}>
                      <Tag className="w-3.5 h-3.5 mr-1" />
                      {cfg.label}
                    </span>
                  )
                })()}
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                className="w-full rounded-lg bg-black"
                onError={() => setVideoError(true)}
              >
                Your browser does not support the video tag.
              </video>
            </div>
          )}

          {clip.status === 'Created' && videoError && (
            <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">
                Unable to load video. The playback URL may have expired. Please refresh the page.
              </p>
            </div>
          )}

          {clip.status === 'Processing' && (
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center gap-3">
              <svg className="animate-spin h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-blue-800">
                This clip is currently being processed. Check back soon!
              </p>
            </div>
          )}

          {clip.status === 'Failed' && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-red-800 flex-1">
                  Clip generation failed. Please try generating it again.
                </p>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
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
            <div className="mb-6">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          )}

          {clip.summary && (
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Summary</h2>
              <p className="text-gray-700">{clip.summary}</p>
            </div>
          )}

          {clip.transcript && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Transcript {clip.segmentCount && `(${clip.segmentCount} segment${clip.segmentCount !== 1 ? 's' : ''})`}
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-gray-700 whitespace-pre-wrap">{clip.transcript}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ClipDetailPage
