import { useState, useEffect, useCallback } from 'react'
import { episodesApi } from '../api/episodes'
import { useToast } from './useToast'
import type { EpisodeListView } from '../types'

export function useEpisodes() {
  const [episodes, setEpisodes] = useState<EpisodeListView[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextToken, setNextToken] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)
  const { showToast } = useToast()

  const fetchEpisodes = useCallback(async (reset = false) => {
    try {
      if (reset) {
        setLoading(true)
        setEpisodes([])
        setNextToken(undefined)
      } else {
        setLoadingMore(true)
      }

      const response = await episodesApi.list({
        nextToken: reset ? undefined : nextToken,
        limit: 20,
      })

      setEpisodes(prev => reset ? response.items : [...prev, ...response.items])
      setNextToken(response.nextToken)
      setHasMore(!!response.nextToken)
    } catch (err) {
      console.error('Failed to fetch episodes:', err)
      showToast('Failed to load episodes', 'error')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [nextToken, showToast])

  useEffect(() => {
    fetchEpisodes(true)
  }, [])

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) {
      fetchEpisodes(false)
    }
  }, [loadingMore, hasMore, fetchEpisodes])

  const refresh = useCallback(() => {
    fetchEpisodes(true)
  }, [fetchEpisodes])

  return {
    episodes,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    refresh,
  }
}
