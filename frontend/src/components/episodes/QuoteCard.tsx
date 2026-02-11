import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import type { Quote, QuoteStatus } from '../../types'
import { Badge } from '../common/Badge'
import Card from '../common/Card'

interface QuoteCardProps {
  quote: Quote
  onDelete: (id: string) => void
}

const getQuoteStatusVariant = (status: QuoteStatus | 'approved' | 'rejected'): 'success' | 'warning' | 'error' | 'info' | 'accent' => {
  switch (status) {
    case 'Created':
      return 'success'
    case 'Processing':
      return 'info'
    case 'Failed':
    case 'rejected':
      return 'error'
    case 'Edited':
    case 'approved':
      return 'accent'
    case 'Proposed':
    default:
      return 'warning'
  }
}

const getQuoteStatusIcon = (status: QuoteStatus | 'approved' | 'rejected') => {
  switch (status) {
    case 'Processing':
      return (
        <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      )
    case 'Created':
      return (
        <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M5 13l4 4L19 7" />
        </svg>
      )
    case 'Failed':
      return (
        <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    default:
      return null
  }
}

const getQuoteStatusLabel = (status: QuoteStatus | 'approved' | 'rejected'): string => {
  if (status === 'approved') return 'Approved'
  if (status === 'rejected') return 'Rejected'
  return status
}

export function QuoteCard({ quote, onDelete }: QuoteCardProps) {
  const navigate = useNavigate()
  const { id: episodeId } = useParams<{ id: string }>()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

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
          className="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 transition-colors duration-200 z-10"
        >
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {!showDeleteConfirm ? (
          <>
            <div className="flex-1 flex items-center">
              <blockquote className="text-lg font-medium text-[var(--color-text-primary)] line-clamp-4">
                "{quote.text}"
              </blockquote>
            </div>

            <div className="flex items-center justify-between mt-4">
              {quote.speaker && (
                <span className="text-sm font-medium text-[var(--color-text-secondary)]">
                  — {quote.speaker}
                </span>
              )}
              <Badge
                variant={getQuoteStatusVariant(quote.status)}
                size="sm"
                icon={getQuoteStatusIcon(quote.status)}
              >
                {getQuoteStatusLabel(quote.status)}
              </Badge>
            </div>
          </>
        ) : (
          <div className="flex flex-col justify-center h-full">
            <div className="bg-[var(--color-surface)]/90 border border-[var(--color-error)] rounded-lg p-4">
              <p className="text-sm text-[var(--color-text-primary)] mb-3">
                Are you sure you want to delete this quote? This action cannot be undone.
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete()
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[var(--color-error)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-error)]/90 focus:outline-none focus:ring-2 focus:ring-[var(--color-error)] focus:ring-offset-2 transition-colors duration-200"
                >
                  Yes, Delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowDeleteConfirm(false)
                  }}
                  className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-[var(--color-surface)] text-[var(--color-text-primary)] text-sm font-medium rounded-md border border-[var(--color-border)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 transition-colors duration-200"
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
