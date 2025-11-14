import { useNavigate } from 'react-router-dom'
import type { BlogData } from '../../types'

interface BlogPostCardProps {
  readonly episodeId: string
  readonly blog: BlogData | null
  readonly isLoading?: boolean
  readonly error?: string | null
}

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  'Draft': { bg: 'bg-gray-100', text: 'text-gray-800' },
  'Generating': { bg: 'bg-blue-100', text: 'text-blue-800' },
  'Published': { bg: 'bg-green-100', text: 'text-green-800' },
  'Failed': { bg: 'bg-red-100', text: 'text-red-800' }
}

export function BlogPostCard({ episodeId, blog, isLoading = false, error = null }: BlogPostCardProps) {
  const navigate = useNavigate()

  const handleViewPost = () => {
    navigate(`/episodes/${episodeId}/blog`)
  }

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

  const statusStyle = STATUS_STYLES[blog.status] || STATUS_STYLES.Draft

  const excerpt = blog.content.length > 150
    ? `${blog.content.substring(0, 150).replace(/[#*_`]/g, '')}...`
    : blog.content.replace(/[#*_`]/g, '')

  const title = blog.content.split('\n')[0].replace(/^#\s*/, '') || 'Blog Post'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow duration-200">
      <div className="flex items-start space-x-3 mb-4">
        <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h3 className="text-base font-semibold text-gray-900">Blog Post</h3>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.text}`}>
              {blog.status}
            </span>
          </div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-1">
            {title}
          </h4>
          <p className="text-sm text-gray-600 mb-4 line-clamp-2">
            {excerpt}
          </p>
          {blog.wordCount && (
            <p className="text-xs text-gray-500 mb-3">
              {blog.wordCount.toLocaleString()} words
            </p>
          )}
          <div className="flex items-center space-x-3">
            <button
              type="button"
              onClick={handleViewPost}
              className="inline-flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 rounded"
              aria-label="View blog post"
            >
              View Post
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleViewPost}
              className="inline-flex items-center text-sm font-medium text-gray-600 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 rounded"
              aria-label="Edit blog post"
            >
              Edit
              <svg className="ml-1 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
