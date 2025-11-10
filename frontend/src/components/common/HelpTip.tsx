import { useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { useHelpTips } from '../../hooks/useHelpTips'

interface HelpTipProps {
  id: string
  content: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: ReactNode
}

export function HelpTip({ id, content, position = 'bottom', children }: HelpTipProps) {
  const { isDismissed, dismissTip } = useHelpTips()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    if (!isDismissed(id)) {
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [id, isDismissed])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => dismissTip(id), 300)
  }

  if (isDismissed(id)) {
    return <>{children}</>
  }

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-primary',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-primary',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-primary',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-primary',
  }

  return (
    <div className="relative inline-block">
      {children}
      {isVisible && (
        <div
          className={`absolute z-50 ${positionClasses[position]} animate-fadeIn`}
          role="tooltip"
        >
          <div className="bg-white text-gray-800 text-sm rounded-xl shadow-2xl border border-gray-200 p-4 w-64 relative animate-scaleIn">
            <button
              onClick={handleDismiss}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors focus:outline-none"
              aria-label="Dismiss help tip"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="pr-6">{content}</div>
            <div
              className={`absolute w-0 h-0 border-8 ${arrowClasses[position].replace('border-t-primary', 'border-t-white').replace('border-b-primary', 'border-b-white').replace('border-l-primary', 'border-l-white').replace('border-r-primary', 'border-r-white')}`}
            />
          </div>
        </div>
      )}
    </div>
  )
}
