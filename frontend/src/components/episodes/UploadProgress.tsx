import { useMemo } from 'react'
import type { UploadState } from '../../types'

interface UploadProgressProps {
  upload: UploadState
  onRetry?: (uploadId: string) => void
  onCancel?: (uploadId: string) => void
}

export function UploadProgress({ upload, onRetry, onCancel }: UploadProgressProps) {
  const estimatedTimeRemaining = useMemo(() => {
    if (upload.status !== 'uploading' || upload.progress === 0) {
      return null
    }

    const startTime = new Date(upload.startedAt).getTime()
    const now = Date.now()
    const elapsed = now - startTime
    const progressDecimal = upload.progress / 100

    if (progressDecimal === 0) return null

    const estimatedTotal = elapsed / progressDecimal
    const remaining = estimatedTotal - elapsed

    if (remaining < 60000) {
      return `${Math.round(remaining / 1000)}s`
    }
    return `${Math.round(remaining / 60000)}m`
  }, [upload.startedAt, upload.progress, upload.status])

  const getStatusColor = () => {
    switch (upload.status) {
      case 'completed':
        return 'bg-green-500'
      case 'failed':
        return 'bg-red-500'
      case 'uploading':
      case 'processing':
        return 'bg-blue-500'
      default:
        return 'bg-gray-300'
    }
  }

  const getStatusText = () => {
    switch (upload.status) {
      case 'pending':
        return 'Pending...'
      case 'uploading':
        return 'Uploading...'
      case 'processing':
        return 'Processing...'
      case 'completed':
        return 'Complete'
      case 'failed':
        return 'Failed'
      default:
        return upload.status
    }
  }

  const getTypeLabel = () => {
    if (upload.type === 'transcript') {
      return 'Transcript'
    }
    return upload.trackName ? `Track: ${upload.trackName}` : 'Track'
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {upload.filename}
          </p>
          <p className="text-xs text-gray-500">
            {getTypeLabel()}
          </p>
        </div>
        {(upload.status === 'uploading' || upload.status === 'completed' || upload.status === 'failed') && onCancel && (
          <button
            onClick={() => onCancel(upload.id)}
            className="ml-2 text-gray-400 hover:text-gray-600 flex-shrink-0"
            aria-label={upload.status === 'uploading' ? 'Cancel upload' : 'Remove'}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-600">{getStatusText()}</span>
          <div className="flex items-center gap-2">
            {estimatedTimeRemaining && (
              <span className="text-gray-500">{estimatedTimeRemaining} remaining</span>
            )}
            <span className="font-medium text-gray-900">{upload.progress}%</span>
          </div>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStatusColor()}`}
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      </div>

      {upload.status === 'failed' && (
        <div className="space-y-2">
          {upload.error && (
            <p className="text-xs text-red-600">{upload.error}</p>
          )}
          {onRetry && (
            <button
              onClick={() => onRetry(upload.id)}
              className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1"
            >
              Retry Upload
            </button>
          )}
        </div>
      )}

      {upload.status === 'completed' && (
        <div className="flex items-center gap-1 text-xs text-green-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Upload complete</span>
        </div>
      )}
    </div>
  )
}
