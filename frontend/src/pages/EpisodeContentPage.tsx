import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
// Removed uploads list duplication; dialog handles active uploads
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { TranscriptUploader } from '../components/episodes/TranscriptUploader'
import { TrackUploader } from '../components/episodes/TrackUploader'
import { formatDate } from '../utils/date'
import type { EpisodeDetail } from '../types'

function EpisodeContentPage() {
  const { id } = useParams<{ id: string }>()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  usePageTitle(episode ? `${episode.title} - Uploads` : 'Episode Uploads')

  useEffect(() => {
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

    fetchEpisode()
  }, [id, refreshKey])

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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Transcript</h2>

        {episode.transcript ? (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="w-5 h-5 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="font-medium text-green-900">Transcript Uploaded</span>
                </div>
                <p className="text-sm text-green-700 ml-7">
                  {episode.transcript.filename}
                </p>
                <p className="text-xs text-green-600 ml-7 mt-1">
                  Uploaded {formatDate(episode.transcript.uploadedAt)}
                </p>
              </div>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 capitalize">
                {episode.transcript.status}
              </span>
            </div>
          </div>
        ) : null}

        <TranscriptUploader
          episodeId={id}
          hasExistingTranscript={episode.metrics?.hasTranscript || false}
          onUploadComplete={handleUploadComplete}
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Video Tracks</h2>

        {episode.tracks && episode.tracks.length > 0 && (
          <div className="mb-6 space-y-3">
            {episode.tracks.map((track) => (
              <div
                key={track.name}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <svg className="w-5 h-5 text-gray-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                        <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      <span className="font-medium text-gray-900 capitalize">{track.name}</span>
                    </div>
                    {track.filename && (
                      <p className="text-sm text-gray-600 ml-7">{track.filename}</p>
                    )}
                    {track.uploadedAt && (
                      <p className="text-xs text-gray-500 ml-7 mt-1">
                        Uploaded {formatDate(track.uploadedAt)}
                      </p>
                    )}
                    {track.speakers && track.speakers.length > 0 && (
                      <p className="text-xs text-gray-500 ml-7 mt-1">
                        Speakers: {track.speakers.join(', ')}
                      </p>
                    )}
                  </div>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 capitalize">
                    {track.status}
                  </span>
                </div>
              </div>
            ))}
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
