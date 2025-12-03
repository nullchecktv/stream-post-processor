import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Quote, QuoteStatus } from '../../types'

interface QuoteCardProps {
  quote: Quote
  onDelete: (id: string) => void
  onDownload: (id: string, imageUrl: string) => void
}

const statusConfig: Record<QuoteStatus | 'approved' | 'rejected', { colors: string; label: string; icon?: ReactNode }> = {
  Proposed: {
    colors: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'Proposed'
  },
  Created: {
    colors: 'bg-green-50 text-green-700 border-green-200',
    label: 'Created',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  Processing: {
    colors: 'bg-blue-50 text-blue-700 border-blue-200',
    label: 'Processing',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  Edited: {
    colors: 'bg-purple-50 text-purple-700 border-purple-200',
    label: 'Edited'
  },
  approved: {
    colors: 'bg-primary/10 text-primary border-primary/20',
    label: 'Approved'
  },
  rejected: {
    colors: 'bg-red-50 text-red-700 border-red-200',
    label: 'Rejected'
  },
  Failed: {
    colors: 'bg-red-50 text-red-700 border-red-200',
    label: 'Failed',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
}

export function QuoteCard({ quote, onDelete, onDownload }: QuoteCardProps) {
  const navigate = useNavigate()
  const { id: episodeId } = useParams<{ id: string }>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const config = statusConfig[quote.status] || statusConfig.Proposed
  const hasImage = quote.imageUrl && (quote.status === 'Created' || quote.status === 'approved' || quote.status === 'rejected')
  const isPortrait = quote.orientation === 'portrait'

  const handleDelete = () => {
    onDelete(quote.id)
    setShowDeleteConfirm(false)
  }

  const handleDownload = () => {
    if (quote.imageUrl) {
      onDownload(quote.id, quote.imageUrl)
    }
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) {
      return
    }
    navigate(`/episodes/${episodeId}/quotes/${quote.id}`)
  }

  return (
    <div
      onClick={handleCardClick}
      className="relative bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
    >
      <button
        onClick={(e) => {
          e.stopPropagation()
          setShowDeleteConfirm(true)
        }}
        aria-label="Delete quote"
        title="Delete quote"
        className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-300"
      >
        <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg border ${config.colors}`}
              title={quote.status === 'Failed' && quote.error ? quote.error : undefined}
            >
              {config.icon}
              {config.label}
            </span>
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-100 text-gray-700 border border-gray-200"
              title={`${isPortrait ? 'Portrait' : 'Landscape'} orientation`}
            >
              {isPortrait ? (
                <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="7" y="2" width="10" height="20" rx="2" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <rect x="2" y="7" width="20" height="10" rx="2" />
                </svg>
              )}
              {isPortrait ? 'Portrait' : 'Landscape'}
            </span>
            <span className="text-xs text-gray-500">{quote.timestamp}</span>
          </div>
          <blockquote className="text-base text-gray-900 italic border-l-4 border-gray-300 pl-3 mb-2">
            "{quote.text}"
          </blockquote>
          <p className="text-sm text-gray-600">
            — {quote.speaker}
          </p>
        </div>
      </div>

      {hasImage && quote.imageUrl && (
        <div className="mb-3 flex justify-center">
          <img
            src={`${quote.imageUrl}?t=${new Date(quote.createdAt).getTime()}`}
            alt={`Quote by ${quote.speaker}`}
            className={`rounded-lg border border-gray-200 ${isPortrait ? 'w-16 h-auto' : 'w-full h-auto'}`}
          />
        </div>
      )}

      {!showDeleteConfirm ? (
        <div className="flex items-center gap-2">
          {hasImage && quote.imageUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          )}
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm text-red-800 mb-3">
            Are you sure you want to delete this quote? This action cannot be undone.
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleDelete()
              }}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-error text-white text-sm font-medium rounded-lg hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-error transition-colors"
            >
              Yes, Delete
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
