import { memo } from 'react'
import { useNavigate } from 'react-router-dom'
import { type WorkflowState } from '../../hooks/useWorkflowState'

interface WorkflowProgressProps {
  readonly workflowState: WorkflowState
  readonly onSkipPlan?: () => void
  readonly onGeneratePlan?: () => void
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

function WorkflowProgressComponent({ workflowState, onSkipPlan, onGeneratePlan }: WorkflowProgressProps) {
  const navigate = useNavigate()

  const getStepState = (stepNumber: number): 'complete' | 'current' | 'locked' | 'skipped' | 'not_started' => {
    const stepStatus = workflowState.steps[stepNumber as 1 | 2 | 3]
    if (stepStatus.state === 'complete') return 'complete'
    if (stepStatus.state === 'skipped') return 'skipped'
    if (stepStatus.state === 'locked') return 'locked'
    if (stepStatus.state === 'not_started') return 'not_started'
    if (workflowState.completedSteps.includes(stepNumber)) return 'complete'
    if (stepNumber === workflowState.currentStep) return 'current'
    return 'not_started'
  }

  const handleAction = (stepNumber: number) => {
    if (stepNumber === 1 && onGeneratePlan && getStepState(1) === 'not_started') {
      onGeneratePlan()
      return
    }

    const stepStatus = workflowState.steps[stepNumber as 1 | 2 | 3]
    if (stepStatus.actionRoute) {
      navigate(stepStatus.actionRoute)
    } else if (stepStatus.viewRoute) {
      navigate(stepStatus.viewRoute)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent, stepNumber: number) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      const stepStatus = workflowState.steps[stepNumber as 1 | 2 | 3]
      if (stepStatus.canInteract) {
        handleAction(stepNumber)
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

    if (state === 'skipped') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 9l3 3m0 0l-3 3m3-3H8m13 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }

    return step?.icon
  }

  const getStepClasses = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    const stepStatus = workflowState.steps[stepNumber as 1 | 2 | 3]
    const baseClasses = 'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm'
    const clickable = stepStatus.canInteract

    if (state === 'complete') {
      return `${baseClasses} bg-gradient-to-br from-emerald-500 to-emerald-600 text-white ${clickable ? 'hover:shadow-md hover:scale-105 cursor-pointer' : ''}`
    }
    if (state === 'skipped') {
      return `${baseClasses} bg-gradient-to-br from-gray-400 to-gray-500 text-white ${clickable ? 'hover:shadow-md hover:scale-105 cursor-pointer' : ''}`
    }
    if (state === 'current') {
      return `${baseClasses} bg-gradient-to-br from-blue-500 to-blue-600 text-white ring-2 ring-blue-400 ring-offset-2 shadow-lg ${clickable ? 'hover:shadow-xl hover:scale-105 cursor-pointer' : ''}`
    }
    if (state === 'locked') {
      return `${baseClasses} bg-gray-100 text-gray-300 border border-gray-200 cursor-not-allowed opacity-50`
    }
    if (state === 'not_started') {
      return `${baseClasses} bg-white text-blue-600 border-2 border-blue-300 ${clickable ? 'hover:bg-blue-50 hover:border-blue-400 hover:scale-105 cursor-pointer' : ''}`
    }
    return `${baseClasses} bg-gray-100 text-gray-400 border border-gray-200 ${clickable ? 'hover:bg-gray-200 hover:border-gray-300 hover:scale-105 cursor-pointer' : ''}`
  }

  const getConnectorClasses = (stepNumber: number) => {
    const isComplete = workflowState.completedSteps.includes(stepNumber + 1)
    return `flex-1 h-0.5 mx-3 transition-all duration-300 ${
      isComplete ? 'bg-gradient-to-r from-emerald-500 to-emerald-600' : 'bg-gray-200'
    }`
  }

  const getLabelClasses = (stepNumber: number) => {
    const state = getStepState(stepNumber)
    if (state === 'complete') return 'text-gray-900 font-medium'
    if (state === 'skipped') return 'text-gray-600 font-medium'
    if (state === 'current') return 'text-gray-900 font-semibold'
    if (state === 'locked') return 'text-gray-400'
    if (state === 'not_started') return 'text-gray-700 font-medium'
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
    if (state === 'skipped') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          Skipped
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
    if (state === 'locked') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-400">
          Locked
        </span>
      )
    }
    if (state === 'not_started') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600">
          Ready
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
        Pending
      </span>
    )
  }

  const renderStepActions = (stepNumber: number) => {
    const state = getStepState(stepNumber)

    if (state === 'locked') {
      return null
    }

    if (stepNumber === 1 && onSkipPlan && state === 'not_started') {
      return (
        <button
          type="button"
          onClick={onSkipPlan}
          className="mt-2 inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors"
        >
          Skip
        </button>
      )
    }

    return null
  }

  return (
    <section
      className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-sm border border-gray-200 p-5"
      aria-label="Episode workflow progress"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">Progress</h2>
        <div className="text-xs text-gray-500">
          {workflowState.completedSteps.length} of {WORKFLOW_STEPS.length} complete
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
            {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => {
              const stepStatus = workflowState.steps[step.number as 1 | 2 | 3]
              const canClick = stepStatus.canInteract

              return (
                <div key={step.number} className="flex flex-col items-center">
                  <button
                    type="button"
                    className={getStepClasses(step.number)}
                    onClick={() => canClick && handleAction(step.number)}
                    onKeyDown={(e) => handleKeyDown(e, step.number)}
                    disabled={!canClick}
                    aria-label={`${step.label}`}
                    aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                    tabIndex={canClick ? 0 : -1}
                  >
                    {getStepIcon(step.number)}
                  </button>
                  <button
                    type="button"
                    onClick={() => canClick && handleAction(step.number)}
                    disabled={!canClick}
                    className={`mt-3 text-center max-w-[120px] ${canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                  >
                    <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                      {step.label}
                    </div>
                    {getStatusBadge(step.number)}
                  </button>
                  {renderStepActions(step.number)}
                </div>
              )
            })}
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
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => {
              const stepStatus = workflowState.steps[step.number as 1 | 2 | 3]
              const canClick = stepStatus.canInteract

              return (
                <div key={step.number} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center min-w-0">
                    <button
                      type="button"
                      className={getStepClasses(step.number)}
                      onClick={() => canClick && handleAction(step.number)}
                      onKeyDown={(e) => handleKeyDown(e, step.number)}
                      disabled={!canClick}
                      aria-label={`${step.label}`}
                      aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                      tabIndex={canClick ? 0 : -1}
                    >
                      {getStepIcon(step.number)}
                    </button>
                    <button
                      type="button"
                      onClick={() => canClick && handleAction(step.number)}
                      disabled={!canClick}
                      className={`mt-3 text-center max-w-[120px] ${canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                    >
                      <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                        {step.label}
                      </div>
                      {getStatusBadge(step.number)}
                    </button>
                    {renderStepActions(step.number)}
                  </div>

                  {index < arr.length - 1 && (
                    <div className={getConnectorClasses(step.number)} aria-hidden="true" />
                  )}
                </div>
              )
            })}
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
          {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => {
            const stepStatus = workflowState.steps[step.number as 1 | 2 | 3]
            const canClick = stepStatus.canInteract

            return (
              <div key={step.number} className="flex items-start">
                <button
                  type="button"
                  className={getStepClasses(step.number)}
                  onClick={() => canClick && handleAction(step.number)}
                  onKeyDown={(e) => handleKeyDown(e, step.number)}
                  disabled={!canClick}
                  aria-label={`${step.label}`}
                  aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                  tabIndex={canClick ? 0 : -1}
                >
                  {getStepIcon(step.number)}
                </button>
                <button
                  type="button"
                  onClick={() => canClick && handleAction(step.number)}
                  disabled={!canClick}
                  className={`flex-1 pt-2 ml-3 text-left ${canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                >
                  <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                    {step.label}
                  </div>
                  {getStatusBadge(step.number)}
                </button>
                {renderStepActions(step.number)}
              </div>
            )
          })}
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Post-Stream
          </div>
          <div className="space-y-2">
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => {
              const stepStatus = workflowState.steps[step.number as 1 | 2 | 3]
              const canClick = stepStatus.canInteract

              return (
                <div key={step.number} className="flex items-start">
                  <div className="flex flex-col items-center mr-3">
                    <button
                      type="button"
                      className={getStepClasses(step.number)}
                      onClick={() => canClick && handleAction(step.number)}
                      onKeyDown={(e) => handleKeyDown(e, step.number)}
                      disabled={!canClick}
                      aria-label={`${step.label}`}
                      aria-current={getStepState(step.number) === 'current' ? 'step' : undefined}
                      tabIndex={canClick ? 0 : -1}
                    >
                      {getStepIcon(step.number)}
                    </button>

                    {index < arr.length - 1 && (
                      <div
                        className={`w-0.5 h-8 mt-2 transition-all duration-300 rounded-full ${
                          workflowState.completedSteps.includes(step.number + 1)
                            ? 'bg-gradient-to-b from-emerald-500 to-emerald-600'
                            : 'bg-gray-200'
                        }`}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => canClick && handleAction(step.number)}
                    disabled={!canClick}
                    className={`flex-1 pt-2 text-left ${canClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                  >
                    <div className={`text-sm mb-1.5 ${getLabelClasses(step.number)}`}>
                      {step.label}
                    </div>
                    {getStatusBadge(step.number)}
                  </button>
                  {renderStepActions(step.number)}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}

export const WorkflowProgress = memo(WorkflowProgressComponent)
