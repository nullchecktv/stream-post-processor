interface MiniWorkflowProgressProps {
  currentStep: number
  totalSteps?: number
}

export function MiniWorkflowProgress({ currentStep, totalSteps = 4 }: MiniWorkflowProgressProps) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1
        const isComplete = step <= currentStep
        const isCurrent = step === currentStep

        return (
          <div
            key={step}
            className={`
              h-1.5 flex-1 rounded-full transition-colors duration-[var(--duration-base)]
              ${isComplete ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-border)]'}
              ${isCurrent ? 'ring-2 ring-[var(--color-accent)] ring-offset-1 ring-offset-[var(--color-surface)]' : ''}
            `}
            title={`Step ${step}${isComplete ? ' - Complete' : ''}`}
          />
        )
      })}
    </div>
  )
}
