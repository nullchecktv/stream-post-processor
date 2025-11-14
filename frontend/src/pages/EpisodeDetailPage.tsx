import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { quotesApi } from '../api/quotes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { EpisodeForm } from '../components/episodes/EpisodeForm'
import { QuoteCard } from '../components/episodes/QuoteCard'
import { PlanForm, type PlanFormData } from '../components/episodes/PlanForm'
import { PlanRecommendations } from '../components/episodes/PlanRecommendations'
import { MermaidDiagram } from '../components/episodes/MermaidDiagram'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { Episode, Quote, EpisodePlan } from '../types'
import type { EpisodeFormData } from '../utils/validation'

type TabType = 'details' | 'quotes' | 'plan'

function EpisodeDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [episode, setEpisode] = useState<Episode | null>(null)
  const [episodePlan, setEpisodePlan] = useState<EpisodePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [planLoading, setPlanLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [activeTab, setActiveTab] = useState<TabType>('details')
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const [quotesError, setQuotesError] = useState<string | null>(null)
  const [nextCursor, setNextCursor] = useState<string | null>(null)
  const [hasMoreQuotes, setHasMoreQuotes] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)

  usePageTitle(episode ? `Edit ${episode.title}` : 'Edit Episode')

  const fetchEpisode = async () => {
    if (!id) {
      setError('Episode ID is required')
      setLoading(false)
      return
    }

    try {
      const data = await episodesApi.get(id)
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
  }, [id])

  useEffect(() => {
    const handleRefresh = () => {
      if (activeTab === 'details') {
        fetchEpisode()
      } else if (activeTab === 'quotes' && id) {
        fetchQuotes()
      }
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    return () => window.removeEventListener('refreshPageContent', handleRefresh)
  }, [id, activeTab])

  useEffect(() => {
    if (activeTab === 'quotes' && id && quotes.length === 0) {
      fetchQuotes()
    }
  }, [activeTab, id])

  useEffect(() => {
    const fetchPlan = async () => {
      if (!id) return

      setPlanLoading(true)
      try {
        const data = await episodesApi.getPlan(id)
        setEpisodePlan(data)
      } catch (err) {
        console.error('Failed to fetch plan:', err)
      } finally {
        setPlanLoading(false)
      }
    }

    if (activeTab === 'plan') {
      fetchPlan()
    }
  }, [id, activeTab])

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchQuotes = async (cursor?: string) => {
    if (!id) return

    setQuotesLoading(true)
    setQuotesError(null)

    try {
      const response = await quotesApi.list(id, { cursor, limit: 20 })
      if (cursor) {
        setQuotes(prev => [...prev, ...response.items])
      } else {
        setQuotes(response.items)
      }
      setNextCursor(response.nextToken || null)
      setHasMoreQuotes(!!response.nextToken)
    } catch (err) {
      console.error('Failed to fetch quotes:', err)
      setQuotesError('Failed to load quotes. Please try again.')
    } finally {
      setQuotesLoading(false)
    }
  }

  const handleLoadMore = () => {
    if (nextCursor && !quotesLoading) {
      fetchQuotes(nextCursor)
    }
  }

  const handleDeleteQuote = async (quoteId: string) => {
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

  const handleDownloadQuote = async (quoteId: string, imageUrl: string) => {
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

  const handleSubmit = async (data: EpisodeFormData) => {
    if (!id) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      await episodesApi.update(id, data)
      const updatedEpisode = await episodesApi.get(id)
      setEpisode(updatedEpisode)
      setHasUnsavedChanges(false)
      showToast('Episode updated successfully!', 'success')
    } catch (err) {
      console.error('Failed to update episode:', err)
      showToast('Failed to save changes. Please try again.', 'error')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePlanSubmit = async (data: PlanFormData) => {
    if (!id) return

    setIsPlanSubmitting(true)

    try {
      const result = episodePlan?.plan
        ? await episodesApi.updatePlan(id, data)
        : await episodesApi.createPlan(id, data)

      setEpisodePlan(result)
      setShowPlanForm(false)
      showToast(episodePlan?.plan ? 'Plan updated successfully!' : 'Plan created successfully!', 'success')
    } catch (err) {
      console.error('Failed to save plan:', err)
      showToast('Failed to save plan. Please try again.', 'error')
    } finally {
      setIsPlanSubmitting(false)
    }
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to leave?'
      )
      if (!confirmed) return
    }
    navigate('/')
  }

  useEffect(() => {
    if (episode) {
      const formElement = document.querySelector('form')
      if (formElement) {
        const handleFormChange = () => {
          setHasUnsavedChanges(true)
        }
        formElement.addEventListener('input', handleFormChange)
        return () => formElement.removeEventListener('input', handleFormChange)
      }
    }
  }, [episode])

  if (loading) {
    return (
      <div className="relative min-h-full">
        <LoadingSpinner variant="page" />
      </div>
    )
  }

  if (error && !episode) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
          <button
            onClick={() => navigate('/')}
            className="mt-4 text-red-600 hover:text-red-800 underline"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (!episode) {
    return null
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {episode?.title || 'Episode'}
        </h1>
        <p className="text-gray-600">
          Manage episode details and content
        </p>
      </div>

      <div className="mb-6 border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('quotes')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'quotes'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Quotes
            {quotes.length > 0 && (
              <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
                {quotes.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plan'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Plan
          </button>
        </nav>
      </div>

      {successMessage && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800">{successMessage}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {activeTab === 'details' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <EpisodeForm
            episode={episode}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      )}

      {activeTab === 'quotes' && (
        <div>
          {quotesLoading && quotes.length === 0 ? (
            <div className="relative min-h-[400px]">
              <LoadingSpinner variant="page" />
            </div>
          ) : quotesError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">{quotesError}</p>
              <button
                onClick={() => fetchQuotes()}
                className="mt-4 text-red-600 hover:text-red-800 underline"
              >
                Try Again
              </button>
            </div>
          ) : quotes.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No quotes yet</h3>
              <p className="text-gray-600">
                Quotes will appear here once they are created from the episode transcript.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quotes.map(quote => (
                  <QuoteCard
                    key={quote.id}
                    quote={quote}
                    onDelete={handleDeleteQuote}
                    onDownload={handleDownloadQuote}
                  />
                ))}
              </div>

              {hasMoreQuotes && (
                <div className="mt-8 text-center">
                  <button
                    onClick={handleLoadMore}
                    disabled={quotesLoading}
                    className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {quotesLoading ? (
                      <>
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gray-700" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Loading...
                      </>
                    ) : (
                      'Load More'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'plan' && (
        <div className="space-y-6">
          {planLoading ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              {!episodePlan?.plan && !showPlanForm && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="text-center py-8">
                    <svg
                      className="mx-auto h-12 w-12 text-gray-400"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <h3 className="mt-4 text-lg font-medium text-gray-900">No plan yet</h3>
                    <p className="mt-2 text-sm text-gray-500">
                      Create a plan to organize your episode and get AI-powered recommendations.
                    </p>
                    <button
                      onClick={() => setShowPlanForm(true)}
                      className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                    >
                      Create Plan
                    </button>
                  </div>
                </div>
              )}

              {(showPlanForm || episodePlan?.plan) && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-semibold text-gray-900">
                      {episodePlan?.plan ? 'Episode Plan' : 'Create Episode Plan'}
                    </h2>
                    {episodePlan?.plan && !showPlanForm && (
                      <button
                        onClick={() => setShowPlanForm(true)}
                        className="text-sm text-primary hover:text-primary-dark font-medium"
                      >
                        Edit Plan
                      </button>
                    )}
                  </div>

                  {showPlanForm ? (
                    <PlanForm
                      plan={episodePlan?.plan}
                      onSubmit={handlePlanSubmit}
                      onCancel={episodePlan?.plan ? () => setShowPlanForm(false) : undefined}
                      isSubmitting={isPlanSubmitting}
                    />
                  ) : (
                    episodePlan?.plan && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Objectives</h3>
                          <ul className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 space-y-1">
                            {episodePlan.plan.objectives.map((objective, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                <span>{objective}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Concepts</h3>
                          <ul className="text-sm text-gray-900 bg-gray-50 rounded-lg p-3 space-y-1">
                            {episodePlan.plan.concepts.map((concept, index) => (
                              <li key={index} className="flex items-start">
                                <span className="text-primary mr-2">•</span>
                                <span>{concept}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        {episodePlan.plan.notes && (
                          <div>
                            <h3 className="text-sm font-medium text-gray-700 mb-2">Notes</h3>
                            <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                              {episodePlan.plan.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  )}
                </div>
              )}

              {episodePlan?.plan && !showPlanForm && (
                <>
                  <PlanRecommendations
                    recommendations={episodePlan.recommendations}
                    isLoading={false}
                  />

                  {episodePlan.recommendations?.suggestedFlow && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">
                        Suggested Episode Flow
                      </h3>
                      <MermaidDiagram diagram={episodePlan.recommendations.suggestedFlow} />
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EpisodeDetailPage
