import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Quote } from '../../types'

interface QuotesCardProps {
  readonly episodeId: string
  readonly quotes: Quote[]
  readonly isLoading?: boolean
  readonly error?: string | null
}

function QuotesCardComponent({ episodeId, quotes, isLoading = false, error = null }: QuotesCardProps) {
  const navigate = useNavigate()

  const handleViewQuotes = useCallback(() => {
    navigate(`/episodes/${episodeId}/quotes`)
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
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Quotes</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!quotes || quotes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Quotes</h3>
            <p className="text-sm text-gray-600 mb-4">
              0 quotes
            </p>
            <p className="text-sm text-gray-500">
              Quotes will appear here after extraction from the transcript.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const totalQuotes = quotes.length

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-amber-500 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewQuotes}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewQuotes()
        }
      }}
    >
      <div className="flex-1 p-6 pr-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-amber-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900">Quotes</h3>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                {totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'}
              </span>
            </div>

            <p className="text-sm text-gray-600">
              {totalQuotes} {totalQuotes === 1 ? 'quote' : 'quotes'} ready to share
            </p>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-amber-200 flex items-center justify-center bg-amber-50 group-hover:bg-amber-100 transition-colors">
        <svg className="w-4 h-4 text-amber-600 group-hover:text-amber-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const QuotesCard = memo(QuotesCardComponent)
