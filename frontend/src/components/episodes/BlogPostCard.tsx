import { memo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { BlogData } from '../../types'
import Card from '../common/Card'
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
      <Card aspectRatio="instagram">
        <div className="h-full flex flex-col animate-pulse">
          <div className="flex-1 bg-gray-200 dark:bg-gray-700 p-6 flex items-center justify-center">
            <div className="w-full space-y-3">
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto" />
              <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-2/3 mx-auto" />
            </div>
          </div>
          <div className="p-4 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
          </div>
        </div>
      </Card>
    )
  }

  if (error) {
    return (
      <Card aspectRatio="instagram">
        <div className="h-full flex flex-col items-center justify-center p-6 text-center">
          <svg className="w-12 h-12 text-red-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">Error Loading Blog Post</h3>
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        </div>
      </Card>
    )
  }

  if (isProcessing) {
    return (
      <Card aspectRatio="instagram">
        <div className="h-full flex flex-col">
          <div className="flex-1 bg-gradient-to-br from-[#E6F3D4] to-[#C8E6C9] p-6 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-[#5B8C5A] mx-auto mb-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 line-clamp-3">
                Generating Blog Post...
              </h3>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              AI is creating your blog post. This may take a moment.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  if (!blog || !blog.content) {
    return (
      <Card aspectRatio="instagram">
        <div className="h-full flex flex-col">
          <div className="flex-1 bg-gradient-to-br from-[#E6F3D4] to-[#C8E6C9] p-6 flex items-center justify-center">
            <div className="text-center">
              <svg className="w-12 h-12 text-[#5B8C5A] mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-900 line-clamp-3">
                No Blog Post Yet
              </h3>
            </div>
          </div>
          <div className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
              Blog posts will appear here after content generation.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  const lines = blog.content.split('\n').filter(line => line.trim())
  const title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Blog Post'

  const excerpt = lines
    .slice(1)
    .filter(line => !line.match(/^#+\s*/))
    .join(' ')
    .substring(0, 200)
    .trim() || 'No excerpt available'

  return (
    <Card aspectRatio="instagram" hoverable onClick={handleClick}>
      <div className="h-full flex flex-col">
        <div className="flex-1 bg-gradient-to-br from-[#E6F3D4] to-[#C8E6C9] p-6 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-3">
            {title}
          </h3>
        </div>

        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {excerpt}
          </p>

          <div className="flex items-center justify-between">
            <StatusIndicator status={blog.status} size="sm" />
            {blog.createdAt && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(blog.createdAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}

export const BlogPostCard = memo(BlogPostCardComponent)
