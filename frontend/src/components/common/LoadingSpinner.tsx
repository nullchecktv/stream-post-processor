interface LoadingSpinnerProps {
  variant?: 'inline' | 'page' | 'section' | 'card'
  size?: 'sm' | 'md' | 'lg'
}

export function LoadingSpinner({ variant = 'section', size = 'md' }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-3',
    lg: 'w-12 h-12 border-4',
  }

  const spinner = (
    <div
      className={`${sizeClasses[size]} border-primary border-t-transparent rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )

  if (variant === 'inline') {
    return spinner
  }

  if (variant === 'page') {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-90 flex items-center justify-center z-50 animate-fadeIn">
        <div className="text-center animate-slideUp">
          {spinner}
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (variant === 'card') {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 flex items-center justify-center animate-pulse">
        {spinner}
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center py-12">
      {spinner}
    </div>
  )
}
