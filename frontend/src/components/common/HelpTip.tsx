import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isDismissed(id)) {
      setTimeout(() => setIsVisible(true), 500)
    }
  }, [id, isDismissed])

  useEffect(() => {
    if (isVisible && containerRef.current) {
      const updatePosition = () => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          const offset = 12
          let top = 0
          let left = 0

          switch (position) {
            case 'top':
              top = rect.top - offset
              left = rect.left + rect.width / 2
              break
            case 'bottom':
              top = rect.bottom + offset
              left = rect.left + rect.width / 2
              break
            case 'left':
              top = rect.top + rect.height / 2
              left = rect.left - offset
              break
            case 'right':
              top = rect.top + rect.height / 2
              left = rect.right + offset
              break
          }

          setCoords({ top, left })
        }
      }

      updatePosition()
      window.addEventListener('scroll', updatePosition, true)
      window.addEventListener('resize', updatePosition)

      return () => {
        window.removeEventListener('scroll', updatePosition, true)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [isVisible, position])

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => dismissTip(id), 300)
  }

  if (isDismissed(id)) {
    return <>{children}</>
  }

  const transformClasses = {
    top: '-translate-x-1/2 -translate-y-full',
    bottom: '-translate-x-1/2',
    left: '-translate-x-full -translate-y-1/2',
    right: '-translate-y-1/2',
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[var(--color-surface-raised)]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[var(--color-surface-raised)]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[var(--color-surface-raised)]',
    right: 'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[var(--color-surface-raised)]',
  }

  return (
    <>
      <div ref={containerRef} className="inline-block w-full">
        {children}
      </div>
      {isVisible && createPortal(
        <div
          className="fixed z-50 pointer-events-none"
          style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          role="tooltip"
        >
          <div className={`${transformClasses[position]} animate-fadeIn pointer-events-auto`}>
            <div className="bg-[var(--color-surface-raised)] text-[var(--color-text-primary)] text-sm rounded-xl shadow-2xl border border-[var(--color-border)] p-4 w-64 relative animate-scaleIn">
              <button
                onClick={handleDismiss}
                className="absolute top-2 right-2 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors duration-[var(--duration-fast)] focus:outline-none"
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
              <div className={`absolute w-0 h-0 border-8 ${arrowClasses[position]}`} />
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
