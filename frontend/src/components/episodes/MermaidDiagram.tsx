import { useEffect, useRef, useState } from 'react'

interface MermaidDiagramProps {
  diagram: string
  className?: string
}

let mermaidInstance: typeof import('mermaid').default | null = null

async function getMermaid() {
  if (!mermaidInstance) {
    const mermaidModule = await import('mermaid')
    mermaidInstance = mermaidModule.default
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'default',
      securityLevel: 'loose',
      fontFamily: 'system-ui, -apple-system, sans-serif',
    })
  }
  return mermaidInstance
}

export function MermaidDiagram({ diagram, className = '' }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !diagram) return

      setIsRendering(true)
      setError(null)

      try {
        const mermaid = await getMermaid()
        const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`
        const { svg } = await mermaid.render(id, diagram)

        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (err) {
        console.error('Mermaid rendering error:', err)
        setError('Failed to render diagram. The diagram syntax may be invalid.')
      } finally {
        setIsRendering(false)
      }
    }

    renderDiagram()
  }, [diagram])

  if (error) {
    return (
      <div className={`bg-[var(--color-error-bg)] border border-[var(--color-error)] rounded-lg p-4 ${className}`}>
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-[var(--color-error)] mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-[var(--color-text-primary)]">Diagram Error</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`relative ${className}`}>
      {isRendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-[var(--color-surface)] bg-opacity-75 rounded-lg">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[var(--color-accent)]"></div>
            <span className="text-sm text-[var(--color-text-secondary)]">Rendering diagram...</span>
          </div>
        </div>
      )}
      <div
        ref={containerRef}
        className="mermaid-container overflow-x-auto bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-4 flex justify-center"
      />
    </div>
  )
}
