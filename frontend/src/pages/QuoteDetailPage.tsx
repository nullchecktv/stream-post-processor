import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { quotesApi } from '../api/quotes'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { ChevronRight, Home, Download, Trash2 } from 'lucide-react'
import type { QuoteDetail, Episode } from '../types'

const statusConfig: Record<string, { colors: string; label: string }> = {
  Proposed: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Proposed'
  },
  Processing: {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Processing'
  },
  Created: {
    colors: 'bg-green-50 text-green-700 border-green-200',
    label: 'Created'
  },
  Failed: {
    colors: 'bg-red-50 text-red-700 border-red-200',
    label: 'Failed'
  },
  Edited: {
    colors: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Edited'
  }
}

function QuoteDetailPage() {
  const { episodeId, quoteId } = useParams<{ episodeId: string; quoteId: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [quote, setQuote] = useState<QuoteDetail | null>(null)
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [showSpeaker, setShowSpeaker] = useState(true)
  const [showEpisodeTitle, setShowEpisodeTitle] = useState(true)
  const [orientation, setOrientation] = useState<'landscape' | 'portrait'>('landscape')
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>('')
  const [episodeSpeakers, setEpisodeSpeakers] = useState<string[]>([])
  const [speakerError, setSpeakerError] = useState<string>('')

  usePageTitle(quote ? `Quote - ${quote.speaker}` : 'Quote Details')

  const isDirty = quote && (
    showSpeaker !== quote.showSpeaker ||
    showEpisodeTitle !== quote.showEpisodeTitle ||
    orientation !== quote.orientation ||
    selectedSpeaker !== quote.speaker
  )

  const fetchData = useCallback(async () => {
    if (!episodeId || !quoteId) {
      setError('Episode ID and Quote ID are required')
      setLoading(false)
      return
    }

    try {
      const [quoteData, episodeData] = await Promise.all([
        quotesApi.get(episodeId, quoteId, true),
        episodesApi.get(episodeId)
      ])
      console.log('Fetched quote data:', {
        imageUrl: quoteData.imageUrl,
        showSpeaker: quoteData.showSpeaker,
        showEpisodeTitle: quoteData.showEpisodeTitle,
        status: quoteData.status,
        updatedAt: quoteData.updatedAt
      })
      setQuote(quoteData)
      setEpisode(episodeData)
      setShowSpeaker(quoteData.showSpeaker)
      setShowEpisodeTitle(quoteData.showEpisodeTitle)
      setOrientation(quoteData.orientation)
      setSelectedSpeaker(quoteData.speaker)
      setEpisodeSpeakers(episodeData.speakers || [])
      setError(null)
    } catch (err) {
      console.error('Failed to fetch quote:', err)
      setError('Failed to load quote. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [episodeId, quoteId])

  const fetchDataRef = useRef(fetchData)

  useEffect(() => {
    fetchDataRef.current = fetchData
  }, [fetchData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      console.log('Quote refresh event received:', event)
      setRegenerating(false)
      setLoading(true)
      fetchDataRef.current()
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    return () => window.removeEventListener('refreshPageContent', handleRefresh)
  }, [])

  const handleDelete = async () => {
    if (!episodeId || !quoteId) return

    const confirmed = window.confirm(
      'Are you sure you want to delete this quote? This action cannot be undone.'
    )

    if (!confirmed) return

    try {
      setDeleting(true)
      await quotesApi.delete(episodeId, quoteId)
      showToast('Quote deleted successfully', 'success')
      navigate(`/episodes/${episodeId}/quotes`)
    } catch (err) {
      console.error('Failed to delete quote:', err)
      showToast('Failed to delete quote. Please try again.', 'error')
      setDeleting(false)
    }
  }

  const handleSave = async () => {
    if (!episodeId || !quoteId || !quote) return

    const willRegenerate =
      showSpeaker !== quote.showSpeaker ||
      showEpisodeTitle !== quote.showEpisodeTitle ||
      orientation !== quote.orientation

    try {
      setSaving(true)
      setSpeakerError('')

      await quotesApi.update(episodeId, quoteId, {
        speaker: selectedSpeaker !== quote.speaker ? selectedSpeaker : undefined,
        showSpeaker,
        showEpisodeTitle,
        orientation
      })

      setQuote({
        ...quote,
        speaker: selectedSpeaker,
        showSpeaker,
        showEpisodeTitle,
        orientation,
        updatedAt: new Date().toISOString()
      })

      if (willRegenerate) {
        setRegenerating(true)
      }
    } catch (err) {
      console.error('Failed to save quote:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to save quote settings'

      if (errorMessage.includes('InvalidSpeaker') || errorMessage.includes('invalid speaker')) {
        setSpeakerError('Selected speaker is not in the episode speaker list')
      }

      showToast('Failed to save quote settings. Please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDownload = async () => {
    if (!quote?.imageUrl) return

    try {
      const response = await fetch(quote.imageUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `quote-${quote.id}.png`
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

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (error || !quote || !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Quote not found'}</p>
        </div>
      </div>
    )
  }

  const config = statusConfig[quote.status] || statusConfig.Proposed
  // Display the graphic whenever an imageUrl exists, regardless of status
  const hasImage = !!quote.imageUrl

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
        <Link to={`/episodes/${episodeId}/quotes`} className="hover:text-primary transition-colors">
          Quotes
        </Link>
        <ChevronRight className="w-4 h-4 text-gray-400" />
        <span className="text-gray-900 font-medium">{quote.speaker}</span>
      </nav>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">Quote by {quote.speaker}</h1>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${config.colors}`}>
                  {config.label}
                </span>
                <span>{quote.timestamp}</span>
              </div>
            </div>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-2.5 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Delete quote"
              aria-label="Delete quote"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>

          {hasImage && quote.imageUrl && (
            <div className="mb-6 relative flex justify-center">
              <img
                key={`${quote.imageUrl}-${quote.updatedAt}`}
                src={quote.imageUrl}
                alt={`Quote by ${quote.speaker}`}
                className={`${quote.orientation === 'portrait' ? 'w-xs' : 'w-full'} h-auto rounded-lg border border-gray-200 shadow-sm transition-opacity ${
                  regenerating ? 'opacity-50' : 'opacity-100'
                }`}
                crossOrigin="anonymous"
                onError={(e) => {
                  console.error('Failed to load quote image:', quote.imageUrl, e)
                  e.currentTarget.style.display = 'none'
                }}
              />
              {regenerating && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/50 rounded-lg">
                  <div className="bg-white rounded-lg shadow-lg p-4 flex items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Regenerating graphic...</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {!hasImage && (
            <div className="mb-6 bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
              {regenerating ? (
                <>
                  <svg className="animate-spin mx-auto h-12 w-12 text-primary" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <p className="mt-2 text-sm text-gray-600 font-medium">
                    Generating graphic...
                  </p>
                </>
              ) : (
                <>
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">
                    No graphic generated yet
                  </p>
                </>
              )}
            </div>
          )}

          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Quote Text</h2>
            <blockquote className="text-lg text-gray-900 italic border-l-4 border-gray-300 pl-4 py-2">
              "{quote.text}"
            </blockquote>
          </div>

          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Details</h2>
            {episodeSpeakers.length === 0 && (
              <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  No speakers defined for this episode. Add speakers to the episode to enable speaker selection.
                </p>
              </div>
            )}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Speaker</span>
                {episodeSpeakers.length > 0 ? (
                  <div className="flex flex-col items-end gap-1">
                    <select
                      value={selectedSpeaker}
                      onChange={(e) => {
                        setSelectedSpeaker(e.target.value)
                        setSpeakerError('')
                      }}
                      className={`text-sm font-medium px-3 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary ${
                        speakerError ? 'border-red-500' : 'border-gray-300'
                      }`}
                    >
                      {episodeSpeakers.map(speaker => (
                        <option key={speaker} value={speaker}>
                          {speaker}
                        </option>
                      ))}
                    </select>
                    {speakerError && (
                      <span className="text-xs text-red-600">{speakerError}</span>
                    )}
                  </div>
                ) : (
                  <span className="text-sm font-medium text-gray-900">{quote.speaker}</span>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Timestamp</span>
                <span className="text-sm font-medium text-gray-900">{quote.timestamp}</span>
              </div>
              {quote.relevanceScore !== undefined && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Relevance Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all"
                        style={{ width: `${quote.relevanceScore}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {quote.relevanceScore}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Orientation</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setOrientation('landscape')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      orientation === 'landscape'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Landscape
                  </button>
                  <button
                    onClick={() => setOrientation('portrait')}
                    className={`px-3 py-1 text-sm rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                      orientation === 'portrait'
                        ? 'bg-primary text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Portrait
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Show Speaker</span>
                <button
                  onClick={() => setShowSpeaker(!showSpeaker)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    showSpeaker ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={showSpeaker}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showSpeaker ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Show Episode Title</span>
                <button
                  onClick={() => setShowEpisodeTitle(!showEpisodeTitle)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    showEpisodeTitle ? 'bg-primary' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={showEpisodeTitle}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      showEpisodeTitle ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex justify-end">
              <div className="flex items-center gap-2">
                {hasImage && (
                  <button
                    onClick={handleDownload}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                )}
                <button
                  onClick={handleSave}
                  disabled={!isDirty || saving}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end">
            <div className="text-xs text-gray-400">
              Created {new Date(quote.createdAt).toLocaleDateString()} • Updated {new Date(quote.updatedAt).toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default QuoteDetailPage
