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
        return 'bg-[var(--color-success)]'
      case 'failed':
        return 'bg-[var(--color-error)]'
      case 'uploading':
      case 'processing':
        return 'bg-[var(--color-accent)]'
      default:
        return 'bg-[var(--color-text-disabled)]'
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-4 space-y-2">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
            {upload.filename}
          </p>
          <p className="text-xs text-[var(--color-text-muted)]">
            {getTypeLabel()}
          </p>
        </div>
        {(upload.status === 'uploading' || upload.status === 'completed' || upload.status === 'failed') && onCancel && (
          <button
            onClick={() => onCancel(upload.id)}
            className="ml-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] flex-shrink-0 transition-colors duration-[var(--duration-fast)]"
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
          <span className="text-[var(--color-text-secondary)]">{getStatusText()}</span>
          <div className="flex items-center gap-2">
            {estimatedTimeRemaining && (
              <span className="text-[var(--color-text-muted)]">{estimatedTimeRemaining} remaining</span>
            )}
            <span className="font-medium text-[var(--color-text-primary)]">{upload.progress}%</span>
          </div>
        </div>

        <div className="w-full bg-[var(--color-surface-raised)] rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-[width,background-color] duration-[var(--duration-base)] ${getStatusColor()}`}
            style={{ width: `${upload.progress}%` }}
          />
        </div>
      </div>

      {upload.status === 'failed' && (
        <div className="space-y-2">
          {upload.error && (
            <p className="text-xs text-[var(--color-error)]">{upload.error}</p>
          )}
          {onRetry && (
            <button
              onClick={() => onRetry(upload.id)}
              className="w-full text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium py-1 transition-colors duration-[var(--duration-fast)]"
            >
              Retry Upload
            </button>
          )}
        </div>
      )}

      {upload.status === 'completed' && (
        <div className="flex items-center gap-1 text-xs text-[var(--color-success)]">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Upload complete</span>
        </div>
      )}
    </div>
  )
}
