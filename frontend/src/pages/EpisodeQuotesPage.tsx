import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { quotesApi } from '../api/quotes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { QuoteCard } from '../components/episodes/QuoteCard'
import ContentGrid from '../components/common/ContentGrid'
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

  const fetchEpisode = useCallback(async () => {
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
  }, [id])

  const fetchQuotes = useCallback(async (cursor?: string) => {
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
  }, [id, showToast])

  useEffect(() => {
    fetchEpisode()
  }, [fetchEpisode])

  useEffect(() => {
    if (id) {
      fetchQuotes()
    }
  }, [id, fetchQuotes])

  useEffect(() => {
    const handleRefresh = () => {
      if (id) {
        fetchQuotes()
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
  }, [id, fetchQuotes])

  const handleDelete = async (quoteId: string) => {
    if (!id) return

    try {
      await quotesApi.delete(id, quoteId)
      setQuotes(prev => prev.filter(q => q.id !== quoteId))
    } catch (err) {
      console.error('Failed to delete quote:', err)
      showToast('Failed to delete quote. Please try again.', 'error')
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
        <div className="bg-[var(--color-surface)] border border-[var(--color-error)] rounded-lg p-4">
          <p className="text-[var(--color-error)]">{error || 'Episode not found'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--space-6)]">
      <Breadcrumb />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-center justify-between mb-[var(--space-4)]">
          <div>
            <h1 className="text-[length:var(--text-2xl)] font-semibold text-[var(--color-text-primary)]">
              Episode Quotes
            </h1>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)] mt-1">
              {quotes.length} quote{quotes.length !== 1 ? 's' : ''} for this episode
            </p>
          </div>
        </div>
      </div>

      {quotes.length === 0 && !loadingQuotes ? (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
          <h3 className="mt-[var(--space-4)] text-[length:var(--text-lg)] font-medium text-[var(--color-text-primary)]">No quotes yet</h3>
          <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
            Quotes will appear here once they are created from the episode transcript.
          </p>
        </div>
      ) : (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
          <ContentGrid columns={{ sm: 1, md: 2, lg: 3, xl: 3 }} gap={6}>
            {quotes.map(quote => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onDelete={handleDelete}
              />
            ))}
          </ContentGrid>

          {loadingQuotes && (
            <div className="mt-[var(--space-6)] flex justify-center">
              <LoadingSpinner variant="inline" />
            </div>
          )}

          {hasMore && !loadingQuotes && (
            <div className="mt-[var(--space-6)] flex justify-center">
              <button
                onClick={handleLoadMore}
                className="inline-flex items-center gap-[var(--space-2)] px-[var(--space-6)] py-[var(--space-3)] bg-[var(--color-surface)] text-[var(--color-text-primary)] text-[length:var(--text-sm)] font-medium rounded-[var(--radius-md)] border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] transition-colors duration-[var(--duration-fast)]"
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

