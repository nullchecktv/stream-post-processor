import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BlogData } from '../../types'
import { StatusIndicator } from '../common/StatusIndicator'

interface BlogPostCardProps {
  readonly episodeId: string
  readonly blog: BlogData | null
  readonly isLoading?: boolean
  readonly isProcessing?: boolean
  readonly error?: string | null
}

function BlogPostCardComponent({
  episodeId,
  blog,
  isLoading = false,
  isProcessing = false,
  error = null
}: BlogPostCardProps) {
  const navigate = useNavigate()

  const handleClick = useCallback(() => {
    navigate(`/episodes/${episodeId}/blog`)
  }, [navigate, episodeId])

  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]" aria-busy="true">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-[var(--color-surface-raised)] rounded-full" />
            <div className="h-5 bg-[var(--color-surface-raised)] rounded w-24" />
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-full" />
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-3/4" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-error)] p-[var(--space-6)]" role="alert">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-[var(--color-error)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-1">Error Loading Blog Post</h3>
            <p className="text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (isProcessing) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-success)] animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Blog Post</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-2">
              Processing...
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              AI is creating your blog post. This may take a moment.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!blog || !blog.content) {
    return (
      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-surface-raised)] rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-[var(--color-text-primary)] mb-1">Blog Post</h3>
            <p className="text-sm text-[var(--color-text-secondary)] mb-4">
              No blog post yet
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">
              Blog posts will appear here after content generation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const lines = blog.content.split('\n').filter(line => line.trim())
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Blog Post'

  return (
    <div
      className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] border-l-4 border-l-[var(--color-success)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border)] transition-colors duration-[var(--duration-fast)] cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <div className="flex-1 p-[var(--space-6)] pr-[var(--space-4)]">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-[var(--color-success)] bg-opacity-10 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-[var(--color-success)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-[var(--color-text-primary)]">Blog Post</h3>
              <StatusIndicator status={blog.status} size="sm" />
            </div>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
              {title}
            </p>
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-[var(--color-divider)] flex items-center justify-center bg-[var(--color-surface-raised)] group-hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
        <svg className="w-4 h-4 text-[var(--color-success)] transition-colors duration-[var(--duration-fast)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const BlogPostCard = memo(BlogPostCardComponent)
