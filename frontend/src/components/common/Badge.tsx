import type { ReactNode } from 'react'

export type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'accent' | 'neutral'
export type BadgeSize = 'sm' | 'md' | 'lg'

interface BadgeProps {
  children: ReactNode
  variant?: BadgeVariant
  size?: BadgeSize
  icon?: ReactNode
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-[var(--badge-success-bg)] text-[var(--badge-success-text)] border-[var(--badge-success-text)]/30',
  warning: 'bg-[var(--badge-warning-bg)] text-[var(--badge-warning-text)] border-[var(--badge-warning-text)]/30',
  error: 'bg-[var(--badge-error-bg)] text-[var(--badge-error-text)] border-[var(--badge-error-text)]/30',
  info: 'bg-[var(--badge-info-bg)] text-[var(--badge-info-text)] border-[var(--badge-info-text)]/30',
  accent: 'bg-[var(--color-accent-subtle)] text-[var(--color-accent)] border-[var(--color-accent)]/30',
  neutral: 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] border-[var(--color-border)]'
}

const sizeStyles: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
  lg: 'px-3 py-1.5 text-sm'
}

export function Badge({
  children,
  variant = 'neutral',
  size = 'md',
  icon,
  className = ''
}: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 font-medium rounded-full border
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `.trim().replace(/\s+/g, ' ')}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
