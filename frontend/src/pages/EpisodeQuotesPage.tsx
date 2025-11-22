import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { quotesApi } from '../api/quotes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { QuoteCard } from '../components/episodes/QuoteCard'
import type { EpisodeDetail, Quote } from '../types'

function EpisodeQuotesPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | undefined>()
  const [hasMore, setHasMore] = useState(false)

  usePageTitle(episode ? `${episode.title} - Quotes` : 'Episode Quotes')

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

  const fetchQuotes = async (cursor?: string) => {
    if (!id) return

    try {
      setLoadingQuotes(true)
      const response = await quotesApi.list(id, { limit: 20, cursor })

      if (cursor) {
        setQuotes(prev => [...prev, ...response.items])
      } else {
        setQuotes(response.items)
      }

      setNextCursor(response.nextToken)
      setHasMore(!!response.nextToken)
    } catch (err) {
      console.error('Failed to fetch quotes:', err)
      showToast('Failed to load quotes. Please try again.', 'error')
    } finally {
      setLoadingQuotes(false)
    }
  }

  useEffect(() => {
    fetchEpisode()
  }, [id])

  const fetchQuotesRef = useRef(fetchQuotes)

  useEffect(() => {
    fetchQuotesRef.current = fetchQuotes
  })

  useEffect(() => {
    if (id) {
      fetchQuotes()
    }
  }, [id])

  useEffect(() => {
    const handleRefresh = () => {
      if (id) {
        fetchQuotesRef.current()
      }
    }

    const handleContentItemStatusUpdate = (event: CustomEvent) => {
      const { message } = event.detail
      if (message.type === 'quote_status_updated' && message.metadata?.quoteId) {
        setQuotes(prevQuotes =>
          prevQuotes.map(quote =>
            quote.id === message.metadata.quoteId
              ? {
                  ...quote,
                  status: message.metadata.status,
                  error: message.metadata.error,
                  updatedAt: message.timestamp
                }
              : quote
          )
        )
      }
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    window.addEventListener('contentItemStatusUpdated', handleContentItemStatusUpdate as EventListener)

    return () => {
      window.removeEventListener('refreshPageContent', handleRefresh)
      window.removeEventListener('contentItemStatusUpdated', handleContentItemStatusUpdate as EventListener)
    }
  }, [])

  const handleDelete = async (quoteId: string) => {
    if (!id) return

    try {
      await quotesApi.delete(id, quoteId)
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
      showToast('Quote deleted successfully', 'success')
    } catch (err) {
      console.error('Failed to delete quote:', err)
      showToast('Failed to delete quote. Please try again.', 'error')
    }
  }

  const handleDownload = async (quoteId: string, imageUrl: string) => {
    try {
      const response = await fetch(imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quote-${quoteId}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      showToast('Quote downloaded successfully', 'success')
    } catch (err) {
      console.error('Failed to download quote:', err)
      showToast('Failed to download quote. Please try again.', 'error')
    }
  }



  const handleLoadMore = () => {
    if (nextCursor && !loadingQuotes) {
      fetchQuotes(nextCursor)
    }
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
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Episode Quotes
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {quotes.length} quote{quotes.length !== 1 ? 's' : ''} for this episode
            </p>
          </div>
        </div>
      </div>

      {quotes.length === 0 && !loadingQuotes ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">No quotes yet</h3>
          <p className="mt-2 text-sm text-gray-500">
            Quotes will appear here once they are created from the episode transcript.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onDelete={handleDelete}
                onDownload={handleDownload}
              />
            ))}
          </div>

          {loadingQuotes && (
            <div className="mt-6 flex justify-center">
              <LoadingSpinner variant="inline" />
            </div>
          )}

          {hasMore && !loadingQuotes && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default EpisodeQuotesPage

