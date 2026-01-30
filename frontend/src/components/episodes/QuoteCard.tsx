import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Quote, QuoteStatus } from '../../types'
import Card from '../common/Card'

interface QuoteCardProps {
  quote: Quote
  onDelete: (id: string) => void
}

const statusConfig: Record<QuoteStatus | 'approved' | 'rejected', { colors: string; label: string; icon?: ReactNode }> = {
  Proposed: {
    colors: 'bg-[var(--color-warning)] text-[var(--color-background)] border-[var(--color-warning)]',
    label: 'Proposed'
  },
  Created: {
    colors: 'bg-[var(--color-success)] text-[var(--color-background)] border-[var(--color-success)]',
    label: 'Created',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  Processing: {
    colors: 'bg-[var(--color-info)] text-[var(--color-background)] border-[var(--color-info)]',
    label: 'Processing',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  Edited: {
    colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]',
    label: 'Edited'
  },
  approved: {
    colors: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]',
    label: 'Approved'
  },
  rejected: {
    colors: 'bg-[var(--color-error)] text-[var(--color-background)] border-[var(--color-error)]',
    label: 'Rejected'
  },
  Failed: {
    colors: 'bg-[var(--color-error)] text-[var(--color-background)] border-[var(--color-error)]',
    label: 'Failed',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  }
}

export function QuoteCard({ quote, onDelete }: QuoteCardProps) {
  const navigate = useNavigate()
  const { id: episodeId } = useParams<{ id: string }>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const config = statusConfig[quote.status] || statusConfig.Proposed

  const handleDelete = () => {
    onDelete(quote.id)
    setShowDeleteConfirm(false)
  }

  const handleCardClick = () => {
    navigate(`/episodes/${episodeId}/quotes/${quote.id}`)
  }

  return (
    <Card aspectRatio="square" hoverable onClick={handleCardClick}>
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-br from-accent to-primary-light relative">
        <button
          onClick={(e) => {
            e.stopPropagation()
            setShowDeleteConfirm(true)
          }}
          aria-label="Delete quote"
          title="Delete quote"
          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-gray-700 hover:text-gray-900 hover:bg-white/50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200 z-10"
        >
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!showDeleteConfirm ? (
          <>
            <div className="flex-1 flex items-center">
              <blockquote className="text-lg font-medium text-gray-900 line-clamp-4">
                "{quote.text}"
              </blockquote>
            </div>

            <div className="flex items-center justify-between mt-4">
              {quote.speaker && (
                <span className="text-sm font-medium text-gray-700">
                  — {quote.speaker}
                </span>
              )}
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md border ${config.colors}`}
                title={quote.status === 'Failed' && quote.error ? quote.error : undefined}
              >
                {config.icon}
                {config.label}
              </span>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center h-full">
            <div className="bg-white/90 border border-red-500 rounded-lg p-4">
              <p className="text-sm text-gray-900 mb-3">
                Are you sure you want to delete this quote? This action cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors duration-200"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(false)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-white text-gray-900 text-sm font-medium rounded-md border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
