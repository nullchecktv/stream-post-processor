import { memo } from 'react'
import { type WorkflowStep } from '../../hooks/useWorkflowState'

interface WorkflowProgressProps {
  readonly currentStep: WorkflowStep
  readonly completedSteps: readonly number[]
  readonly onStepClick?: (step: number) => void
}

const WORKFLOW_STEPS = [
  {
    number: 1,
    label: 'Generate Plan',
    shortLabel: 'Plan',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    )
  },
  {
    number: 2,
    label: 'Upload Transcript',
    shortLabel: 'Transcript',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  {
    number: 3,
    label: 'Upload Tracks',
    shortLabel: 'Tracks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    )
  }
]

function WorkflowProgressComponent({ currentStep, completedSteps, onStepClick }: WorkflowProgressProps) {
  const getStepState = (stepNumber: number): 'complete' | 'current' | 'locked' => {
    if (completedSteps.includes(stepNumber)) return 'complete'
    if (currentStep === 0) return 'locked'
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
    const step = WORKFLOW_STEPS.find(s => s.number === stepNumber)

    if (state === 'complete') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }

    return step?.icon
  }

  const getStepClasses = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    const baseClasses = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm'
    const clickable = isClickable(stepNumber)

    if (state === 'complete') {
      return `${baseClasses} bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ${clickable ? 'hover:shadow-md hover:scale-105 cursor-pointer' : ''}`
    }
    if (state === 'current') {
      return `${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 shadow-lg ${clickable ? 'hover:shadow-xl hover:scale-105 cursor-pointer' : ''}`
    }
    return `${baseClasses} bg-gray-100 text-gray-400 border border-gray-200 ${clickable ? 'hover:bg-gray-200 hover:border-gray-300 hover:scale-105 cursor-pointer' : ''}`
  }

  const getConnectorClasses = (stepNumber: number) => {
    const isComplete = completedSteps.includes(stepNumber + 1)
    return `flex-1 h-0.5 mx-3 transition-all duration-300 ${
      isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gray-200'
    }`
  }

  const isClickable = (stepNumber: number) => {
    return onStepClick !== undefined
  }

  const getLabelClasses = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    if (state === 'complete') return 'text-gray-900 font-medium'
    if (state === 'current') return 'text-gray-900 font-semibold'
    return 'text-gray-500'
  }

  const getStatusBadge = (stepNumber: number) => {
    const state = getStepState(stepNumber)

    if (state === 'complete') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
          Complete
        </span>
      )
    }
    if (state === 'current') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          In Progress
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Pending
      </span>
    )
  }

  return (
    <section
      className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-5"
      aria-label="Episode workflow progress"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Workflow Progress</h2>
        <div className="text-xs text-gray-500">
          {completedSteps.length} of {WORKFLOW_STEPS.length} complete
        </div>
      </div>

      <div className="hidden md:flex gap-4">
        <div className="flex-1 bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pre-Stream
          </div>
          <div className="flex items-center justify-center">
            {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <button
                  type="button"
                  className={getStepClasses(step.number)}
                  onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                  onKeyDown={(e) => handleKeyDown(e, step.number)}
                  disabled={!isClickable(step.number)}
                  aria-label={`${step.label}`}
                  aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                  tabIndex={isClickable(step.number) ? 0 : -1}
                >
                  {getStepIcon(step.number)}
                </button>
                <div className="mt-3 text-center max-w-[120px]">
                  <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                    {step.label}
                  </div>
                  {getStatusBadge(step.number)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-[2] bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-4 border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Post-Stream
          </div>
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center min-w-0">
                  <button
                    type="button"
                    className={getStepClasses(step.number)}
                    onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                    onKeyDown={(e) => handleKeyDown(e, step.number)}
                    disabled={!isClickable(step.number)}
                    aria-label={`${step.label}`}
                    aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                    tabIndex={isClickable(step.number) ? 0 : -1}
                  >
                    {getStepIcon(step.number)}
                  </button>
                  <div className="mt-3 text-center max-w-[120px]">
                    <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                      {step.label}
                    </div>
                    {getStatusBadge(step.number)}
                  </div>
                </div>

                {index < arr.length - 1 && (
                  <div className={getConnectorClasses(step.number)} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-3 border border-amber-200">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pre-Stream
          </div>
          {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => (
            <div key={step.number} className="flex items-start">
              <button
                type="button"
                className={getStepClasses(step.number)}
                onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                onKeyDown={(e) => handleKeyDown(e, step.number)}
                disabled={!isClickable(step.number)}
                aria-label={`${step.label}`}
                aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                tabIndex={isClickable(step.number) ? 0 : -1}
              >
                {getStepIcon(step.number)}
              </button>
              <div className="flex-1 pt-2 ml-3">
                <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                  {step.label}
                </div>
                {getStatusBadge(step.number)}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Post-Stream
          </div>
          <div className="space-y-2">
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => (
              <div key={step.number} className="flex items-start">
                <div className="flex flex-col items-center mr-3">
                  <button
                    type="button"
                    className={getStepClasses(step.number)}
                    onClick={() => isClickable(step.number) && onStepClick?.(step.number)}
                    onKeyDown={(e) => handleKeyDown(e, step.number)}
                    disabled={!isClickable(step.number)}
                    aria-label={`${step.label}`}
                    aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                    tabIndex={isClickable(step.number) ? 0 : -1}
                  >
                    {getStepIcon(step.number)}
                  </button>

                  {index < arr.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-2 transition-all duration-300 rounded-full ${
                        completedSteps.includes(step.number + 1)
                          ? 'bg-gradient-to-b from-emerald-500 to-emerald-600'
                          : 'bg-gray-200'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="flex-1 pt-2">
                  <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                    {step.label}
                  </div>
                  {getStatusBadge(step.number)}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export const WorkflowProgress = memo(WorkflowProgressComponent)
