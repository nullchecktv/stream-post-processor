import { useState, useEffect } from 'react'
import { episodesApi } from '../../api/episodes'
import { EpisodeCard } from '../episodes/EpisodeCard'
import type { EpisodeListView } from '../../types'

interface UpcomingEpisodesProps {
  onCreateEpisode: () => void
}

export function UpcomingEpisodes({ onCreateEpisode }: UpcomingEpisodesProps) {
  const [episodes, setEpisodes] = useState<EpisodeListView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchEpisodes = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await episodesApi.list()

        const now = new Date()
        const upcoming = response.items.filter(episode => {
          if (!episode.airDate) return true
          return new Date(episode.airDate) >= now
        })

        setEpisodes(upcoming)
      } catch (err) {
        console.error('Failed to fetch episodes:', err)
        setError('Failed to load episodes. Please try again.')
      } finally {
        setLoading(false)
      }
    }

    fetchEpisodes()
  }, [])

  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center mb-6">
          <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Episodes</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse"
            >
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded w-full" />
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-12">
        <div className="flex items-center mb-6">
          <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Episodes</h2>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="mb-12">
        <div className="flex items-center mb-6">
          <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Episodes</h2>
        </div>
        <div className="bg-gradient-to-br from-accent/30 to-white rounded-xl border-2 border-dashed border-primary/30 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              className="w-10 h-10 text-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No upcoming episodes
          </h3>
          <p className="text-gray-600 mb-6">
            Get started by creating your first episode
          </p>
          <button
            onClick={onCreateEpisode}
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary to-primary-dark text-white rounded-lg hover:shadow-lg transform hover:scale-105 transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            <svg
              className="w-5 h-5 mr-2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
            Create Episode
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mb-12">
      <div className="flex items-center mb-6">
        <div className="w-1 h-8 bg-primary rounded-full mr-3"></div>
        <h2 className="text-2xl font-bold text-gray-900">Upcoming Episodes</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  )
}
