import { useState, useEffect, useCallback } from 'react'
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

  const fetchEpisodes = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    fetchEpisodes()
  }, [fetchEpisodes])

  useEffect(() => {
    const handleTeamSwitch = () => {
      fetchEpisodes()
    }

    window.addEventListener('team-switched', handleTeamSwitch)
    return () => window.removeEventListener('team-switched', handleTeamSwitch)
  }, [fetchEpisodes])

  if (loading) {
    return (
      <div className="mb-12">
        <div className="flex items-center mb-6">
          <div className="w-1.5 h-10 bg-gradient-to-b from-primary to-primary-light rounded-full mr-4"></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Episodes</h2>
            <p className="text-gray-500 text-sm mt-1">Your scheduled content</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-gray-100 p-6 shadow-sm animate-pulse"
            >
              <div className="h-2 bg-gradient-to-r from-gray-200 to-gray-100 rounded-full w-full mb-6" />
              <div className="h-6 bg-gray-200 rounded-lg w-3/4 mb-4" />
              <div className="h-4 bg-gray-200 rounded-lg w-1/2 mb-4" />
              <div className="h-4 bg-gray-200 rounded-lg w-full" />
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
          <div className="w-1.5 h-10 bg-gradient-to-b from-primary to-primary-light rounded-full mr-4"></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Episodes</h2>
            <p className="text-gray-500 text-sm mt-1">Your scheduled content</p>
          </div>
        </div>
        <div className="bg-gradient-to-br from-red-50 to-red-100/50 border border-red-200 rounded-2xl p-6 text-red-800 shadow-sm">
          <div className="flex items-start">
            <svg className="w-6 h-6 text-red-500 mr-3 flex-shrink-0 mt-0.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="font-semibold mb-1">Unable to load episodes</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (episodes.length === 0) {
    return (
      <div className="mb-12">
        <div className="flex items-center mb-6">
          <div className="w-1.5 h-10 bg-gradient-to-b from-primary to-primary-light rounded-full mr-4"></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Episodes</h2>
            <p className="text-gray-500 text-sm mt-1">Your scheduled content</p>
          </div>
        </div>
        <div className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-accent/10 to-primary-light/5 rounded-3xl border-2 border-dashed border-primary/20 p-16 text-center">
          <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -mr-20 -mt-20 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/10 rounded-full -ml-16 -mb-16 blur-2xl"></div>
          <div className="relative z-10">
            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-primary/20 to-primary-light/20 backdrop-blur-sm rounded-3xl flex items-center justify-center shadow-lg">
              <svg
                className="w-12 h-12 text-primary"
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
            <h3 className="text-2xl font-bold text-gray-900 mb-3">
              No upcoming episodes
            </h3>
            <p className="text-gray-600 mb-8 max-w-md mx-auto text-lg">
              Start your content journey by scheduling an episode
            </p>
            <button
              onClick={onCreateEpisode}
              className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-primary via-primary-dark to-primary-light text-white rounded-xl hover:shadow-2xl transform hover:scale-105 transition-all focus:outline-none focus:ring-4 focus:ring-primary/30 focus:ring-offset-2 font-semibold text-lg"
            >
              <svg
                className="w-6 h-6 mr-3"
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
      </div>
    )
  }

  return (
    <div className="mb-12">
      <div className="flex items-center mb-6">
        <div className="w-1.5 h-10 bg-gradient-to-b from-primary to-primary-light rounded-full mr-4"></div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Upcoming Episodes</h2>
          <p className="text-gray-500 text-sm mt-1">Your scheduled content</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {episodes.map((episode) => (
          <EpisodeCard key={episode.id} episode={episode} />
        ))}
      </div>
    </div>
  )
}
