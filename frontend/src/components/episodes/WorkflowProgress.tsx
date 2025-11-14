import { type WorkflowStep } from '../../hooks/useWorkflowState'

interface WorkflowProgressProps {
  readonly currentStep: WorkflowStep
  readonly completedSteps: readonly number[]
  readonly onStepClick?: (step: number) => void
}

const WORKFLOW_STEPS = [
  { number: 1, label: 'Create Episode', shortLabel: 'Create' },
  { number: 2, label: 'Generate Plan', shortLabel: 'Plan' },
  { number: 3, label: 'Upload Transcript', shortLabel: 'Transcript' },
  { number: 4, label: 'Upload Tracks', shortLabel: 'Tracks' }
]

export function WorkflowProgress({ currentStep, completedSteps, onStepClick }: WorkflowProgressProps) {
  const getStepState = (stepNumber: number): 'complete' | 'current' | 'locked' => {
    if (completedSteps.includes(stepNumber)) return 'complete'
    if (stepNumber === currentStep) return 'current'
    return 'locked'
  }

  const handleKeyDown = (event: React.KeyboardEvent, stepNumber: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (isClickable(stepNumber)) {
        onStepClick?.(stepNumber)
      }
    }
  }

  const getStepIcon = (stepNumber: number) => {
    const state = getStepState(stepNumber)

    if (state === 'complete') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      )
    }

    return <span className="text-sm font-semibold">{stepNumber}</span>
  }

  const getStepClasses = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    const baseClasses = 'w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200'

    if (state === 'complete') {
      return `${baseClasses} bg-green-600 text-white`
    }
    if (state === 'current') {
      return `${baseClasses} bg-blue-600 text-white ring-4 ring-blue-200`
    }
    return `${baseClasses} bg-gray-300 text-gray-600`
  }

  const getConnectorClasses = (stepNumber: number) => {
    const isComplete = completedSteps.includes(stepNumber + 1)
    return `flex-1 h-1 mx-2 transition-all duration-200 ${
      isComplete ? 'bg-green-600' : 'bg-gray-300'
    }`
  }

  const getStatusText = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    if (state === 'complete') return 'Done'
    if (state === 'current') return 'Next'
    return 'Locked'
  }

  const isClickable = (stepNumber: number) => {
    return completedSteps.includes(stepNumber) && onStepClick !== undefined
  }

  const getStatusColor = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    if (state === 'complete') return 'text-green-600'
    if (state === 'current') return 'text-blue-600'
    return 'text-gray-500'
  }

  return (
    <section
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6"
      aria-label="Episode workflow progress"
    >
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Workflow Progress</h2>

      <div className="hidden md:flex items-center justify-between">
        {WORKFLOW_STEPS.map((step, index) => (
          <div key={step.number} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center">
              <button
                type="button"
                className={getStepClasses(step.number)}
                onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                onKeyDown={(e) => handleKeyDown(e, step.number)}
                disabled={!isClickable(step.number)}
                aria-label={`${step.label} - ${getStatusText(step.number)}`}
                aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                tabIndex={isClickable(step.number) ? 0 : -1}
              >
                {getStepIcon(step.number)}
              </button>
              <div className="mt-3 text-center">
                <div className="text-sm font-medium text-gray-900">{step.label}</div>
                <div className={`text-xs mt-1 ${getStatusColor(step.number)}`}>
                  {getStatusText(step.number)}
                </div>
              </div>
            </div>

            {index < WORKFLOW_STEPS.length - 1 && (
              <div className={getConnectorClasses(step.number)} aria-hidden="true" />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden space-y-4">
        {WORKFLOW_STEPS.map((step, index) => (
          <div key={step.number} className="flex items-start">
            <div className="flex flex-col items-center mr-4">
              <button
                type="button"
                className={getStepClasses(step.number)}
                onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                onKeyDown={(e) => handleKeyDown(e, step.number)}
                disabled={!isClickable(step.number)}
                aria-label={`${step.label} - ${getStatusText(step.number)}`}
                aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                tabIndex={isClickable(step.number) ? 0 : -1}
              >
                {getStepIcon(step.number)}
              </button>

              {index < WORKFLOW_STEPS.length - 1 && (
                <div
                  className={`w-1 h-12 mt-2 transition-all duration-200 ${
                    completedSteps.includes(step.number + 1) ? 'bg-green-600' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
              )}
            </div>

            <div className="flex-1 pt-2">
              <div className="text-base font-medium text-gray-900">{step.label}</div>
              <div className={`text-sm mt-1 ${getStatusColor(step.number)}`}>
                {getStatusText(step.number)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
