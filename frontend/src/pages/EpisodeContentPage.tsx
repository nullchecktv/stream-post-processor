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

    window.addEventListener('refreshPageContent', handleRefresh)
    return () => window.removeEventListener('refreshPageContent', handleRefresh)
  }, [])

  const handleUploadComplete = () => {
    setRefreshKey(prev => prev + 1)
  }

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error || !episode || !id) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Episode not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Transcript</h2>
          {episode.transcript && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Uploaded
            </span>
          )}
        </div>

        {episode.transcript ? (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">
                  {episode.transcript.filename}
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Uploaded {formatDate(episode.transcript.uploadedAt)}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700 capitalize flex-shrink-0">
                {episode.transcript.status}
              </span>
            </div>
          </div>
        ) : (
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No transcript uploaded yet</p>
          </div>
        )}

        <TranscriptUploader
          episodeId={id}
          hasExistingTranscript={!!episode.transcript}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Video Tracks</h2>
          {episode.tracks && episode.tracks.length > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {episode.tracks.length} {episode.tracks.length === 1 ? 'Track' : 'Tracks'}
            </span>
          )}
        </div>

        {episode.tracks && episode.tracks.length > 0 ? (
          <div className="mb-6 space-y-3">
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
          <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
            <svg className="mx-auto h-10 w-10 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <p className="mt-2 text-sm text-gray-500">No video tracks uploaded yet</p>
            <p className="mt-1 text-xs text-gray-400">Upload your first track to get started</p>
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
