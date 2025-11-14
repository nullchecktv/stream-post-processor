import { useNavigate } from 'react-router-dom'
import type { Plan } from '../../types'

interface PlanCardProps {
  readonly episodeId: string
  readonly plan: Plan | null
  readonly isLoading?: boolean
  readonly error?: string | null
}

export function PlanCard({ episodeId, plan, isLoading = false, error = null }: PlanCardProps) {
  const navigate = useNavigate()

  const handleViewPlan = () => {
    navigate(`/episodes/${episodeId}/plan`)
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" aria-busy="true">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="h-5 bg-gray-200 rounded w-24" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 rounded w-full" />
            <div className="h-4 bg-gray-200 rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6" role="alert">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Plan</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Plan</h3>
            <p className="text-sm text-gray-600 mb-4">
              No plan generated yet
            </p>
            <p className="text-sm text-gray-500">
              Generate a plan to get started with content creation for this episode.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const objectivesText = Array.isArray(plan.objectives)
    ? plan.objectives.join(', ')
    : plan.objectives

  const objectivesPreview = objectivesText.length > 120
    ? `${objectivesText.substring(0, 120)}...`
    : objectivesText

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">Plan</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Ready
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {objectivesPreview}
          </p>
          <button
            type="button"
            onClick={handleViewPlan}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
            aria-label="View plan details"
          >
            View Plan
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
