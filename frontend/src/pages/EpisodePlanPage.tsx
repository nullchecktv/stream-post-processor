import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { PlanForm, type PlanFormData } from '../components/episodes/PlanForm'
import { PlanRecommendations } from '../components/episodes/PlanRecommendations'
import { DetailedOutline } from '../components/episodes/DetailedOutline'
import { MermaidDiagram } from '../components/episodes/MermaidDiagram'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { EpisodePlan } from '../types'

function EpisodePlanPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [episodePlan, setEpisodePlan] = useState<EpisodePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)

  usePageTitle('Episode Plan')

  useEffect(() => {
    const fetchPlan = async () => {
      if (!id) return

      setLoading(true)
      try {
        const data = await episodesApi.getPlan(id)
        setEpisodePlan(data)
      } catch (err) {
        console.error('Failed to fetch plan:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchPlan()
  }, [id])

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

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />

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

          {episodePlan.recommendations?.detailedOutline && (
            <DetailedOutline outline={episodePlan.recommendations.detailedOutline} />
          )}

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
    </div>
  )
}

export default EpisodePlanPage
