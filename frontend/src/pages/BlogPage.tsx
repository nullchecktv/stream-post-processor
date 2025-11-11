import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { ViewToggle } from '../components/common/ViewToggle'
import { FormatToggle } from '../components/common/FormatToggle'
import { MarkdownPreview } from '../components/common/MarkdownPreview'
import { RegenerateButton } from '../components/common/RegenerateButton'
import { StatusIndicator } from '../components/common/StatusIndicator'
import { InlineError } from '../components/common/InlineError'
import { ApiError } from '../api/client'
import type { BlogData } from '../types'

type ViewMode = 'outline' | 'content'
type FormatMode = 'markdown' | 'preview'

const STORAGE_KEY_PREFIX = 'blog_draft_'

function getStorageKey(episodeId: string): string {
  return `${STORAGE_KEY_PREFIX}${episodeId}`
}

function saveDraftToStorage(episodeId: string, outline: string): void {
  try {
    localStorage.setItem(getStorageKey(episodeId), outline)
  } catch (error) {
    console.error('Failed to save draft to local storage:', error)
  }
}

function loadDraftFromStorage(episodeId: string): string | null {
  try {
    return localStorage.getItem(getStorageKey(episodeId))
  } catch (error) {
    console.error('Failed to load draft from local storage:', error)
    return null
  }
}

function clearDraftFromStorage(episodeId: string): void {
  try {
    localStorage.removeItem(getStorageKey(episodeId))
  } catch (error) {
    console.error('Failed to clear draft from local storage:', error)
  }
}

function BlogPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { showToast } = useToast()
  const [blogData, setBlogData] = useState<BlogData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [errorType, setErrorType] = useState<'fetch' | 'save' | 'regenerate' | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('content')
  const [formatMode, setFormatMode] = useState<FormatMode>('preview')
  const [editedOutline, setEditedOutline] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  usePageTitle('Blog Post')

  const fetchBlog = useCallback(async () => {
    if (!id) {
      setError('Episode ID is required')
      setErrorType('fetch')
      setLoading(false)
      return
    }

    try {
      const data = await episodesApi.getBlog(id)
      setBlogData(data)

      const savedDraft = loadDraftFromStorage(id)
      if (savedDraft && savedDraft !== data.outline) {
        setEditedOutline(savedDraft)
        setIsDirty(true)
        showToast('Restored unsaved changes from local storage', 'info')
      } else {
        setEditedOutline(data.outline || '')
        setIsDirty(false)
      }

      setError(null)
      setErrorType(null)
    } catch (err) {
      console.error('Failed to fetch blog:', err)

      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('No blog post has been generated for this episode yet. The blog will be created automatically after the transcript is processed.')
          setErrorType('fetch')
        } else if (err.status === 403) {
          setError('You do not have permission to view this blog post.')
          setErrorType('fetch')
        } else if (err.status === 0) {
          setError('Unable to connect to the server. Please check your internet connection.')
          setErrorType('fetch')
        } else {
          setError(err.message || 'Failed to load blog post. Please try again.')
          setErrorType('fetch')
        }
      } else {
        setError('An unexpected error occurred while loading the blog post.')
        setErrorType('fetch')
      }

      const savedDraft = loadDraftFromStorage(id)
      if (savedDraft) {
        setEditedOutline(savedDraft)
        showToast('Loaded draft from local storage', 'info')
      }
    } finally {
      setLoading(false)
    }
  }, [id, showToast])

  useEffect(() => {
    fetchBlog()

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [fetchBlog])

  useEffect(() => {
    if (!blogData) return

    const isGenerating = blogData.status === 'content_generating' || blogData.status === 'regenerating'

    if (isGenerating && !pollingIntervalRef.current) {
      pollingIntervalRef.current = setInterval(async () => {
        try {
          const data = await episodesApi.getBlog(id!)
          setBlogData(data)
          setEditedOutline(data.outline || '')

          if (data.status === 'content_generated') {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current)
              pollingIntervalRef.current = null
            }
            setIsRegenerating(false)
            setIsDirty(false)
            showToast('Blog content generated successfully', 'success')
          }
        } catch (err) {
          console.error('Failed to poll blog status:', err)
        }
      }, 5000)
    } else if (!isGenerating && pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [blogData?.status, id, showToast])

  const handleOutlineChange = (value: string) => {
    setEditedOutline(value)
    const dirty = value !== (blogData?.outline || '')
    setIsDirty(dirty)

    if (id && dirty) {
      saveDraftToStorage(id, value)
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    if (dirty && blogData) {
      saveTimeoutRef.current = setTimeout(() => {
        handleSaveOutline(value)
      }, 2000)
    }
  }

  const handleSaveOutline = async (outline: string) => {
    if (!id || !outline.trim() || isSaving) return

    setIsSaving(true)
    setError(null)
    setErrorType(null)

    try {
      await episodesApi.updateBlog(id, { outline })

      if (id) {
        clearDraftFromStorage(id)
      }

      showToast('Outline saved successfully', 'success')
    } catch (err) {
      console.error('Failed to save outline:', err)

      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Blog post not found. It may have been deleted.')
          setErrorType('save')
        } else if (err.status === 400 || err.status === 422) {
          setError('Invalid outline format. Please check your markdown syntax.')
          setErrorType('save')
        } else {
          setError(err.message || 'Failed to save outline. Your changes are preserved locally.')
          setErrorType('save')
        }
      } else {
        setError('Failed to save outline. Your changes are preserved locally.')
        setErrorType('save')
      }

      showToast('Failed to save outline. Changes preserved locally.', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRegenerate = async () => {
    if (!id || !editedOutline.trim()) return

    if (editedOutline.length < 50) {
      setError('Outline is too short. Please provide at least 50 characters.')
      setErrorType('regenerate')
      showToast('Outline is too short for regeneration', 'error')
      return
    }

    setIsRegenerating(true)
    setError(null)
    setErrorType(null)

    try {
      await episodesApi.regenerateBlog(id, editedOutline)
      showToast('Blog regeneration started', 'success')

      const data = await episodesApi.getBlog(id)
      setBlogData(data)

      if (id) {
        clearDraftFromStorage(id)
      }
    } catch (err) {
      console.error('Failed to regenerate blog:', err)

      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError('Blog post not found. It may have been deleted.')
          setErrorType('regenerate')
        } else if (err.status === 400 || err.status === 422) {
          setError('Invalid outline format. Please check your markdown syntax and try again.')
          setErrorType('regenerate')
        } else if (err.status === 409) {
          setError('A regeneration is already in progress. Please wait for it to complete.')
          setErrorType('regenerate')
        } else {
          setError(err.message || 'Failed to start blog regeneration. Please try again.')
          setErrorType('regenerate')
        }
      } else {
        setError('Failed to start blog regeneration. Please try again.')
        setErrorType('regenerate')
      }

      showToast('Failed to regenerate blog. Please try again.', 'error')
      setIsRegenerating(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setErrorType(null)

    if (errorType === 'fetch') {
      setLoading(true)
      fetchBlog()
    } else if (errorType === 'save' && editedOutline) {
      handleSaveOutline(editedOutline)
    } else if (errorType === 'regenerate') {
      handleRegenerate()
    }
  }

  if (loading) {
    return (
      <div className="relative min-h-full">
        <LoadingSpinner variant="page" />
      </div>
    )
  }

  if (error && errorType === 'fetch' && !blogData) {
    return (
      <div className="space-y-6">
        <Breadcrumb />
        <div className="max-w-4xl mx-auto px-4 py-8">
          <InlineError message={error} onRetry={handleRetry} />
          <div className="mt-6 flex gap-4">
            <button
              onClick={() => navigate(`/episodes/${id}/overview`)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Return to Episode Overview
            </button>
            {editedOutline && (
              <button
                onClick={() => {
                  setError(null)
                  setErrorType(null)
                  setBlogData({
                    episodeId: id!,
                    outline: editedOutline,
                    content: '',
                    status: 'outline_created',
                    wordCount: 0,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  })
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                Continue with Draft
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (!blogData) {
    return null
  }

  const currentContent = viewMode === 'outline' ? editedOutline : blogData.content
  const hasContent = viewMode === 'outline' ? !!blogData.outline : !!blogData.content
  const isGenerating = blogData.status === 'content_generating' || blogData.status === 'regenerating'

  return (
    <div className="space-y-6">
      <Breadcrumb />

      {error && errorType !== 'fetch' && (
        <InlineError message={error} onRetry={handleRetry} />
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Blog Post
              </h1>
              <div className="flex items-center gap-3">
                <StatusIndicator status={blogData.status} size="md" />
                {isSaving && (
                  <span className="text-sm text-gray-500 flex items-center gap-1">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Saving...
                  </span>
                )}
              </div>
            </div>
            {viewMode === 'outline' && blogData.outline && (
              <RegenerateButton
                onClick={handleRegenerate}
                disabled={!isDirty || isGenerating || isSaving}
                loading={isRegenerating}
              />
            )}
          </div>
        </div>

        <div className="flex items-center justify-between mb-6">
          <ViewToggle
            value={viewMode}
            onChange={setViewMode}
            disabled={!blogData.outline && !blogData.content}
          />
          <FormatToggle
            value={formatMode}
            onChange={setFormatMode}
            disabled={!hasContent}
          />
        </div>

        <div className="space-y-6">
          {hasContent ? (
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-3">
                {viewMode === 'outline' ? 'Outline' : 'Content'}
              </h2>
              <div className="bg-gray-50 rounded-lg p-4">
                {viewMode === 'outline' && formatMode === 'markdown' ? (
                  <textarea
                    value={editedOutline}
                    onChange={(e) => handleOutlineChange(e.target.value)}
                    disabled={isGenerating}
                    className="w-full min-h-[400px] p-4 text-sm text-gray-900 font-mono bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                    placeholder="Enter blog outline in markdown format..."
                  />
                ) : formatMode === 'markdown' ? (
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 font-mono">
                    {currentContent}
                  </pre>
                ) : (
                  <MarkdownPreview content={currentContent || ''} />
                )}
              </div>
              {viewMode === 'content' && blogData.wordCount && (
                <p className="mt-2 text-sm text-gray-500">
                  Word count: {blogData.wordCount.toLocaleString()}
                </p>
              )}
              {isDirty && viewMode === 'outline' && (
                <p className="mt-2 text-sm text-amber-600">
                  Outline has been modified. Click "Regenerate Content" to update the blog post.
                </p>
              )}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                No {viewMode} available yet.
              </p>
            </div>
          )}

          {blogData.updatedAt && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Last updated: {new Date(blogData.updatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default BlogPage
