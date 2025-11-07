import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { episodesApi } from '../../api/episodes'
import { EpisodeCard } from '../episodes/EpisodeCard'
import type { EpisodeListView } from '../../types'

export function PreviousEpisodes() {
  const [episodes, setEpisodes] = useState<EpisodeListView[]>([])
  const [loading, setLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [nextToken, setNextToken] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)

  useEffect(() => {
    if (isExpanded && episodes.length === 0) {
      fetchEpisodes()
    }
  }, [isExpanded])

  const fetchEpisodes = async (cursor?: string) => {
    try {
      setLoading(true)
      const response = await episodesApi.list({ nextToken: cursor, limit: 10 })

      const now = new Date()
      const previous = response.items.filter(episode => {
        if (!episode.airDate) return false
        return new Date(episode.airDate) < now
      })

      setEpisodes(prev => cursor ? [...prev, ...previous] : previous)
      setNextToken(response.nextToken)
      setHasMore(!!response.nextToken)
    } catch (err) {
      console.error('Failed to fetch previous episodes:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (nextToken && !loading) {
      fetchEpisodes(nextToken)
    }
  }

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="mb-8">
      <button
        onClick={toggleExpanded}
        className="flex items-center justify-between w-full text-left mb-4 focus:outline-none group"
      >
        <div className="flex items-center">
          <div className="w-1 h-6 bg-primary-light rounded-full mr-3"></div>
          <h2 className="text-xl font-semibold text-gray-700 group-hover:text-gray-900 transition-colors">
            Previous Episodes
          </h2>
        </div>
        <div className="flex items-center text-gray-500 group-hover:text-gray-700 transition-colors">
          <span className="text-sm mr-2">
            {isExpanded ? 'Hide' : 'Show'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {loading && episodes.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 p-3 animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No previous episodes
            </div>
          ) : (
            <>
              {episodes.map((episode) => (
                <EpisodeCard key={episode.id} episode={episode} variant="compact" />
              ))}

              {hasMore && (
                <button
                  onClick={handleLoadMore}
                  disabled={loading}
                  className="w-full py-3 text-sm font-medium text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
