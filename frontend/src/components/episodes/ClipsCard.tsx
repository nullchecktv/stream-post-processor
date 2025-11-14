import { useNavigate } from 'react-router-dom'
import type { ClipListView } from '../../types'

interface ClipsCardProps {
  readonly episodeId: string
  readonly clips: ClipListView[]
  readonly isLoading?: boolean
  readonly error?: string | null
}

export function ClipsCard({ episodeId, clips, isLoading = false, error = null }: ClipsCardProps) {
  const navigate = useNavigate()

  const handleViewClips = () => {
    navigate(`/episodes/${episodeId}/clips`)
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
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Clips</h3>
            <p className="text-sm text-red-700">{error}</p>
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
              Clips will appear here after AI detection and processing.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statusBreakdown = clips.reduce((acc, clip) => {
    const status = clip.status.toLowerCase()
    if (status === 'detected' || status === 'proposed') {
      acc.proposed++
    } else if (status === 'processed' || status === 'approved') {
      acc.processed++
    } else if (status === 'processing') {
      acc.processing++
    }
    return acc
  }, { proposed: 0, processed: 0, processing: 0 })

  const totalClips = clips.length

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">Clips</h3>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {totalClips} {totalClips === 1 ? 'clip' : 'clips'}
            </span>
          </div>

          <div className="space-y-2 mb-4">
            {statusBreakdown.proposed > 0 && (
              <div className="flex items-center text-sm">
                <span className="w-2 h-2 bg-blue-500 rounded-full mr-2" />
                <span className="text-gray-600">
                  {statusBreakdown.proposed} Proposed
                </span>
              </div>
            )}
            {statusBreakdown.processing > 0 && (
              <div className="flex items-center text-sm">
                <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2" />
                <span className="text-gray-600">
                  {statusBreakdown.processing} Processing
                </span>
              </div>
            )}
            {statusBreakdown.processed > 0 && (
              <div className="flex items-center text-sm">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-2" />
                <span className="text-gray-600">
                  {statusBreakdown.processed} Processed
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleViewClips}
            className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
            aria-label="View all clips"
          >
            View Clips
            <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
