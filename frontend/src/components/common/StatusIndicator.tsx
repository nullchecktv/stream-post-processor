import { LoadingSpinner } from './LoadingSpinner'
import type { BlogStatus } from '../../types'

interface StatusIndicatorProps {
  readonly status: BlogStatus
  readonly size?: 'sm' | 'md' | 'lg'
  readonly showIcon?: boolean
}

const statusConfig: Record<BlogStatus, {
  label: string
  bgColor: string
  textColor: string
  borderColor: string
  icon: 'loading' | 'success' | 'error' | 'info'
}> = {
  outline_created: {
    label: 'Outline Created',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-info)]',
    borderColor: 'border-[var(--color-info)]',
    icon: 'info'
  },
  content_generating: {
    label: 'Generating Content',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-warning)]',
    borderColor: 'border-[var(--color-warning)]',
    icon: 'loading'
  },
  content_generated: {
    label: 'Content Generated',
    bgColor: 'bg-gradient-success',
    textColor: 'text-white',
    borderColor: 'border-transparent',
    icon: 'success'
  },
  outline_edited: {
    label: 'Outline Edited',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-accent)]',
    borderColor: 'border-[var(--color-accent)]',
    icon: 'info'
  },
  content_edited: {
    label: 'Content Edited',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-accent)]',
    borderColor: 'border-[var(--color-accent)]',
    icon: 'info'
  },
  regenerating: {
    label: 'Regenerating',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-warning)]',
    borderColor: 'border-[var(--color-warning)]',
    icon: 'loading'
  },
  failed: {
    label: 'Generation Failed',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-error)]',
    borderColor: 'border-[var(--color-error)]',
    icon: 'error'
  }
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'w-5 h-5'
  }
}

const icons = {
  loading: () => (
    <LoadingSpinner size="sm" variant="inline" />
  ),
  success: (className: string) => (
    <svg className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (className: string) => (
    <svg className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  info: (className: string) => (
    <svg className={className} fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

export function StatusIndicator({ status, size = 'md', showIcon = true }: StatusIndicatorProps) {
  const config = statusConfig[status] || {
    label: status || 'Unknown',
    bgColor: 'bg-[var(--color-surface-raised)]',
    textColor: 'text-[var(--color-text-secondary)]',
    borderColor: 'border-[var(--color-border)]',
    icon: 'info' as const
  }
  const sizes = sizeConfig[size]

  return (
    <output
      className={`inline-flex items-center gap-1.5 font-semibold rounded-[var(--radius-lg)] border ${config.bgColor} ${config.textColor} ${config.borderColor} ${sizes.container}`}
      aria-label={`Blog status: ${config.label}`}
    >
      {showIcon && (
        <span className={sizes.icon}>
          {icons[config.icon](sizes.icon)}
        </span>
      )}
      <span>{config.label}</span>
    </output>
  )
}
