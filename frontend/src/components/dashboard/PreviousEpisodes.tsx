import { useState, useEffect, useCallback } from 'react'
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

  const fetchEpisodes = useCallback(async (cursor?: string) => {
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
  }, [])

  useEffect(() => {
    if (isExpanded && episodes.length === 0) {
      fetchEpisodes()
    }
  }, [isExpanded, fetchEpisodes, episodes.length])

  useEffect(() => {
    const handleTeamSwitch = () => {
      if (isExpanded) {
        setEpisodes([])
        setNextToken(undefined)
        setHasMore(false)
        fetchEpisodes()
      }
    }

    window.addEventListener('team-switched', handleTeamSwitch)
    return () => window.removeEventListener('team-switched', handleTeamSwitch)
  }, [isExpanded, fetchEpisodes])

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
        className="flex items-center justify-between w-full text-left mb-6 p-4 rounded-2xl hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 group"
      >
        <div className="flex items-center">
          <div className="w-1.5 h-8 bg-gradient-to-b from-gray-300 to-gray-400 rounded-full mr-4"></div>
          <div>
            <h2 className="text-2xl font-bold text-gray-700 group-hover:text-gray-900 transition-colors">
              Previous Episodes
            </h2>
            <p className="text-gray-500 text-sm mt-0.5">Your content archive</p>
          </div>
        </div>
        <div className="flex items-center text-gray-500 group-hover:text-primary transition-colors">
          <span className="text-sm font-medium mr-2">
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
        <div className="space-y-3 pl-6">
          {loading && episodes.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm animate-pulse"
                >
                  <div className="h-4 bg-gray-200 rounded-lg w-3/4 mb-3" />
                  <div className="h-3 bg-gray-200 rounded-lg w-1/2" />
                </div>
              ))}
            </div>
          ) : episodes.length === 0 ? (
            <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-gray-100/50 rounded-2xl border border-gray-200">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <p className="text-gray-500 font-medium">No previous episodes yet</p>
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
                  className="w-full py-4 text-sm font-semibold text-primary hover:text-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-all focus:outline-none focus:ring-2 focus:ring-primary/20 rounded-xl hover:bg-primary/5"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Loading...
                    </span>
                  ) : (
                    'Load More Episodes'
                  )}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
