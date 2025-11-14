import { useState, useEffect } from 'react'
import { useUpload } from '../../hooks/useUpload'
import { UploadProgress } from './UploadProgress'

interface UploadManagerProps {
  position?: 'bottom-right' | 'bottom-left'
  collapsible?: boolean
}

const MINIMIZED_KEY = 'uploadManager.isMinimized'

export function UploadManager({ position = 'bottom-right', collapsible = true }: UploadManagerProps) {
  const { uploads, activeUploadsCount, removeUpload } = useUpload()
  const [isExpanded, setIsExpanded] = useState(true)
  const [isMinimized, setIsMinimized] = useState(() => {
    const stored = localStorage.getItem(MINIMIZED_KEY)
    return stored === 'true'
  })

  useEffect(() => {
    if (activeUploadsCount > 0 && isMinimized) {
      setIsMinimized(false)
      localStorage.setItem(MINIMIZED_KEY, 'false')
    }
  }, [activeUploadsCount, isMinimized])

  const handleToggleExpand = () => {
    if (collapsible) {
      setIsExpanded(!isExpanded)
    }
  }

  const handleMinimize = () => {
    const newMinimized = !isMinimized
    setIsMinimized(newMinimized)
    localStorage.setItem(MINIMIZED_KEY, String(newMinimized))
  }

  const handleRemove = (uploadId: string) => {
    removeUpload(uploadId)
  }

  if (uploads.length === 0) {
    return null
  }

  const positionClasses = position === 'bottom-right'
    ? 'right-4 bottom-4'
    : 'left-4 bottom-4'

  if (isMinimized) {
    return (
      <div className={`fixed ${positionClasses} z-50`}>
        <button
          onClick={handleMinimize}
          className="bg-white border border-gray-200 rounded-full shadow-lg p-3 hover:bg-gray-50 transition-colors"
          aria-label="Show uploads"
        >
          <div className="relative">
            <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            {activeUploadsCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                {activeUploadsCount}
              </span>
            )}
          </div>
        </button>
      </div>
    )
  }

  return (
    <div className={`fixed ${positionClasses} z-50 w-96 max-w-[calc(100vw-2rem)]`}>
      <div className="bg-white border border-gray-200 rounded-lg shadow-xl overflow-hidden">
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">
              Uploads
            </h3>
            {activeUploadsCount > 0 && (
              <span className="bg-blue-600 text-white text-xs font-bold rounded-full px-2 py-0.5">
                {activeUploadsCount} active
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {collapsible && (
              <button
                onClick={handleToggleExpand}
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                aria-label={isExpanded ? 'Collapse' : 'Expand'}
              >
                <svg
                  className={`w-5 h-5 text-gray-600 transition-transform ${isExpanded ? '' : 'rotate-180'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={handleMinimize}
              className="p-1 hover:bg-gray-200 rounded transition-colors"
              aria-label="Minimize"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="max-h-96 overflow-y-auto">
            <div className="p-4 space-y-3">
              {uploads.length === 0 ? (
                <div className="text-center py-8">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="mt-2 text-sm text-gray-500">No active uploads</p>
                </div>
              ) : (
                uploads.map((upload) => (
                  <UploadProgress
                    key={upload.id}
                    upload={upload}
                    onCancel={handleRemove}
                  />
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
