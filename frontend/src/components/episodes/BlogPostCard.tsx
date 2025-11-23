import { memo, useCallback } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BlogData } from '../../types'

interface BlogPostCardProps {
  readonly episodeId: string
  readonly blog: BlogData | null
  readonly isLoading?: boolean
  readonly error?: string | null
}

const STATUS_STYLES: Record<string, { bg: string; text: string; icon?: ReactNode }> = {
  'Proposed': { bg: 'bg-gray-100', text: 'text-gray-800' },
  'Processing': {
    bg: 'bg-blue-100',
    text: 'text-blue-800',
    icon: (
      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    )
  },
  'Created': {
    bg: 'bg-green-100',
    text: 'text-green-800',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  'Failed': {
    bg: 'bg-red-100',
    text: 'text-red-800',
    icon: (
      <svg className="w-3 h-3" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M6 18L18 6M6 6l12 12" />
      </svg>
    )
  },
  'Edited': { bg: 'bg-purple-100', text: 'text-purple-800' }
}

function BlogPostCardComponent({ episodeId, blog, isLoading = false, error = null }: BlogPostCardProps) {
  const navigate = useNavigate()

  const handleViewPost = useCallback(() => {
    navigate(`/episodes/${episodeId}/blog`)
  }, [navigate, episodeId])

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6" aria-busy="true">
        <div className="animate-pulse">
          <div className="flex items-center space-x-3 mb-4">
            <div className="w-10 h-10 bg-gray-200 rounded-full" />
            <div className="h-5 bg-gray-200 rounded w-32" />
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
            <h3 className="text-sm font-semibold text-red-900 mb-1">Error Loading Blog Post</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!blog || !blog.content) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-start space-x-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900 mb-1">Blog Post</h3>
            <p className="text-sm text-gray-600 mb-4">
              No blog post generated yet
            </p>
            <p className="text-sm text-gray-500">
              Blog posts will appear here after content generation.
            </p>
          </div>
        </div>
      </div>
    )
  }

  const statusStyle = STATUS_STYLES[blog.status] || STATUS_STYLES.Proposed

  const lines = blog.content.split('\n').filter(line => line.trim())
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Blog Post'

  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 border-l-4 border-l-purple-500 hover:shadow-md hover:border-gray-300 transition-all duration-200 cursor-pointer h-[140px] flex relative group overflow-hidden"
      onClick={handleViewPost}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleViewPost()
        }
      }}
    >
      <div className="flex-1 p-6 pr-4">
        <div className="flex items-start space-x-3 h-full">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-50 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-semibold text-gray-900">Blog Post</h3>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}
                title={blog.status === 'Failed' && blog.error ? blog.error : undefined}
              >
                {statusStyle.icon}
                {blog.status}
              </span>
            </div>
            <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
              {title}
            </h4>
            {blog.wordCount && (
              <p className="text-sm text-gray-600">
                {blog.wordCount.toLocaleString()} words
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="w-6 border-l border-purple-200 flex items-center justify-center bg-purple-50 group-hover:bg-purple-100 transition-colors">
        <svg className="w-4 h-4 text-purple-600 group-hover:text-purple-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </div>
  )
}

export const BlogPostCard = memo(BlogPostCardComponent)
