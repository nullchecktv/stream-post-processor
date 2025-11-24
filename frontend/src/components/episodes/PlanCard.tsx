import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Plan } from '../../types'

interface PlanCardProps {
  readonly episodeId: string
  readonly plan: Plan | null
  readonly isLoading?: boolean
  readonly isProcessing?: boolean
  readonly error?: string | null
}

function PlanCardComponent({
  episodeId,
  plan,
  isLoading = false,
  isProcessing = false,
  error = null
}: PlanCardProps) {
  const navigate = useNavigate()

  const handleViewPlan = useCallback(() => {
    navigate(`/episodes/${episodeId}/plan`)
  }, [navigate, episodeId])

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

  if (isProcessing) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Plan</h3>
            <p className="text-sm text-gray-600 mb-2">
              Processing...
            </p>
            <p className="text-sm text-gray-500">
              AI is generating recommendations for your plan. This may take a moment.
            </p>
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
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-blue-500 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewPlan}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewPlan()
        }
      }}
    >
      <div className="flex-1 p-6 pr-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900">Plan</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Ready
              </span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-3">
              {objectivesPreview}
            </p>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-blue-200 flex items-center justify-center bg-blue-50 group-hover:bg-blue-100 transition-colors">
        <svg className="w-4 h-4 text-blue-600 group-hover:text-blue-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const PlanCard = memo(PlanCardComponent)
