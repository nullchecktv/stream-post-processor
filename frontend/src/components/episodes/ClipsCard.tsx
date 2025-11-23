import { memo, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ClipListView } from '../../types'

interface ClipsCardProps {
  readonly episodeId: string
  readonly clips: ClipListView[]
  readonly isLoading?: boolean
  readonly isProcessing?: boolean
  readonly canGenerate?: boolean
  readonly error?: string | null
}

function ClipsCardComponent({
  episodeId,
  clips,
  isLoading = false,
  isProcessing = false,
  canGenerate = false,
  error = null
}: ClipsCardProps) {
  const navigate = useNavigate()

  const handleViewClips = useCallback(() => {
    navigate(`/episodes/${episodeId}/clips`)
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
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Clips</h3>
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
            <h3 className="text-base font-semibold text-gray-900 mb-1">Clips</h3>
            <p className="text-sm text-gray-600 mb-2">
              Processing...
            </p>
            <p className="text-sm text-gray-500">
              AI is analyzing your transcript to detect clips. This may take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!clips || clips.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Clips</h3>
            <p className="text-sm text-gray-600 mb-4">
              0 clips
            </p>
            <p className="text-sm text-gray-500">
              {canGenerate
                ? 'Clips will appear here after AI detection and processing.'
                : 'Upload transcript and video tracks to generate clips.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statusBreakdown = useMemo(() => {
    return clips.reduce((acc, clip) => {
      const status = clip.status.toLowerCase()
      if (status === 'proposed') {
        acc.proposed++
      } else if (status === 'processing') {
        acc.processing++
      } else if (status === 'created') {
        acc.created++
      } else if (status === 'failed') {
        acc.failed++
      }
      return acc
    }, { proposed: 0, processing: 0, created: 0, failed: 0 })
  }, [clips])

  const totalClips = clips.length

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-green-500 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewClips}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewClips()
        }
      }}
    >
      <div className="flex-1 p-6 pr-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-green-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-semibold text-gray-900">Clips</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                {totalClips} {totalClips === 1 ? 'clip' : 'clips'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {statusBreakdown.proposed > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                  {statusBreakdown.proposed} Proposed
                </span>
              )}
              {statusBreakdown.processing > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-yellow-100 text-yellow-700">
                  {statusBreakdown.processing} Processing
                </span>
              )}
              {statusBreakdown.created > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-green-100 text-green-700">
                  {statusBreakdown.created} Created
                </span>
              )}
              {statusBreakdown.failed > 0 && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-700">
                  {statusBreakdown.failed} Failed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-green-200 flex items-center justify-center bg-green-50 group-hover:bg-green-100 transition-colors">
        <svg className="w-4 h-4 text-green-600 group-hover:text-green-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const ClipsCard = memo(ClipsCardComponent)
