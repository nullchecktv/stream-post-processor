import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  helperText?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, className = '', id, ...props }, ref) => {
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`
    const hasError = !!error

    const baseClasses = 'w-full px-3 py-2 border rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-background)] bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] disabled:bg-[var(--color-surface)] disabled:text-[var(--color-text-disabled)] disabled:cursor-not-allowed disabled:border-[var(--color-border)]'
    const stateClasses = hasError
      ? 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]'
      : 'border-[var(--color-border)] focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)]'

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[var(--color-text-secondary)] mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`${baseClasses} ${stateClasses} ${className}`}
          aria-invalid={hasError}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1 text-sm text-[var(--color-error)]"
            role="alert"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={`${inputId}-helper`}
            className="mt-1 text-sm text-[var(--color-text-muted)]"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'
