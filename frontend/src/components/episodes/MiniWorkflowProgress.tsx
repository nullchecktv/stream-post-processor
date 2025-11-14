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
              h-1.5 flex-1 rounded-full transition-all duration-200
              ${isComplete ? 'bg-green-500' : 'bg-gray-200'}
              ${isCurrent ? 'ring-2 ring-green-500 ring-offset-1' : ''}
            `}
            title={`Step ${step}${isComplete ? ' - Complete' : ''}`}
          />
        )
      })}
    </div>
  )
}
