import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { EpisodeForm } from '../components/episodes/EpisodeForm'
import { PlanForm, type PlanFormData } from '../components/episodes/PlanForm'
import { PlanRecommendations } from '../components/episodes/PlanRecommendations'
import { MermaidDiagram } from '../components/episodes/MermaidDiagram'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { Episode, EpisodePlan } from '../types'
import type { EpisodeFormData } from '../utils/validation'

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
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'details' | 'plan'>('details')

  usePageTitle(episode ? `Edit ${episode.title}` : 'Edit Episode')

  useEffect(() => {
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

    fetchEpisode()
  }, [id])

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

  const handleSubmit = async (data: EpisodeFormData) => {
    if (!id) return

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      const updatedEpisode = await episodesApi.update(id, data)
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
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {episode.title}
        </h1>
        <p className="text-gray-600">
          Episode #{episode.episodeNumber}
        </p>
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

      <div className="mb-6 border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Episode Details
          </button>
          <button
            onClick={() => setActiveTab('plan')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'plan'
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Episode Plan
          </button>
        </nav>
      </div>

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
                          <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                            {episodePlan.plan.objectives}
                          </p>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-700 mb-2">Concepts</h3>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap bg-gray-50 rounded-lg p-3">
                            {episodePlan.plan.concepts}
                          </p>
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

              {episode.statusHistory && episode.statusHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Status History</h3>
                  <div className="space-y-3">
                    {episode.statusHistory.map((entry, index) => (
                      <div key={index} className="flex items-center text-sm">
                        <span className="font-medium text-gray-900 min-w-[200px]">
                          {entry.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                        <span className="text-gray-500">
                          {new Date(entry.timestamp).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default EpisodeDetailPage
