import { memo, useState } from 'react'
import type { WorkflowSteps } from '../../types'
import { episodesApi } from '../../api/episodes'
import { useToast } from '../../hooks/useToast'

interface WorkflowProgressProps {
  readonly episodeId: string
  readonly workflowSteps: WorkflowSteps
  readonly onSkipPlan?: () => void
}

const WORKFLOW_STEPS = [
  {
    number: 1,
    key: 'generatePlan' as const,
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
    key: 'uploadTranscript' as const,
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
    key: 'uploadTracks' as const,
    label: 'Upload Tracks',
    shortLabel: 'Tracks',
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
      </svg>
    )
  }
]

function WorkflowProgressComponent({ episodeId, workflowSteps, onSkipPlan }: WorkflowProgressProps) {
  const [isSkipping, setIsSkipping] = useState(false)
  const { showToast } = useToast()

  const getStepState = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const step = workflowSteps[stepKey]
    if (!step) return 'not-started'

    switch (step.status) {
      case 'Completed':
        return 'complete'
      case 'In Progress':
        return 'in-progress'
      case 'Failed':
        return 'failed'
      case 'Skipped':
        return 'skipped'
      default:
        return 'not-started'
    }
  }

  const canAccessUploads = () => {
    const planStatus = workflowSteps.generatePlan?.status
    return ['Completed', 'Skipped', 'Failed'].includes(planStatus || '')
  }

  const isUploadDisabled = () => {
    return !canAccessUploads()
  }

  const getDisabledTooltip = () => {
    const planStatus = workflowSteps.generatePlan?.status
    if (planStatus === 'Not Started') {
      return 'Complete or skip the Generate Plan step first'
    }
    if (planStatus === 'In Progress') {
      return 'Wait for plan generation to complete or skip it'
    }
    return ''
  }

  const handleSkipPlan = async () => {
    try {
      setIsSkipping(true)
      await episodesApi.skipPlanGeneration(episodeId)
      onSkipPlan?.()
    } catch (error) {
      showToast('Failed to skip plan generation', 'error')
    } finally {
      setIsSkipping(false)
    }
  }

  const getStepIcon = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const state = getStepState(stepKey)
    const step = WORKFLOW_STEPS.find(s => s.key === stepKey)

    if (state === 'complete') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      )
    }

    if (state === 'in-progress') {
      return (
        <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      )
    }

    if (state === 'failed') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      )
    }

    if (state === 'skipped') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 5l7 7-7 7" />
        </svg>
      )
    }

    return step?.icon
  }

  const getStepClasses = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const state = getStepState(stepKey)
    const disabled = stepKey !== 'generatePlan' && isUploadDisabled()
    const baseClasses = 'w-11 h-11 rounded-xl flex items-center justify-center transition-colors duration-300 shadow-sm'

    if (disabled) {
      return `${baseClasses} bg-[var(--color-surface)] text-[var(--color-text-disabled)] border border-[var(--color-border)] cursor-not-allowed opacity-50`
    }

    if (state === 'complete') {
      return `${baseClasses} bg-[var(--color-success)] text-[var(--color-text-on-accent)]`
    }
    if (state === 'in-progress') {
      return `${baseClasses} bg-[var(--color-accent)] text-[var(--color-text-on-accent)] ring-2 ring-[var(--color-accent)] ring-opacity-40 ring-offset-2 shadow-lg`
    }
    if (state === 'failed') {
      return `${baseClasses} bg-[var(--color-error)] text-[var(--color-text-on-accent)] ring-2 ring-[var(--color-error)] ring-opacity-40 ring-offset-2`
    }
    if (state === 'skipped') {
      return `${baseClasses} bg-[var(--color-surface-raised)] text-[var(--color-text-muted)]`
    }
    return `${baseClasses} bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]`
  }

  const getConnectorClasses = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const nextStep = stepKey === 'generatePlan' ? 'uploadTranscript' : 'uploadTracks'
    const isComplete = getStepState(nextStep) === 'complete'
    return `flex-1 h-0.5 mx-3 transition-colors duration-300 ${
      isComplete ? 'bg-[var(--color-success)]' : 'bg-[var(--color-divider)]'
    }`
  }

  const getLabelClasses = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const state = getStepState(stepKey)
    const disabled = stepKey !== 'generatePlan' && isUploadDisabled()

    if (disabled) return 'text-[var(--color-text-disabled)]'
    if (state === 'complete') return 'text-[var(--color-text-primary)] font-medium'
    if (state === 'in-progress') return 'text-[var(--color-text-primary)] font-semibold'
    if (state === 'failed') return 'text-[var(--color-error)] font-medium'
    if (state === 'skipped') return 'text-[var(--color-text-muted)] font-medium'
    return 'text-[var(--color-text-secondary)]'
  }

  const getStatusBadge = (stepKey: 'generatePlan' | 'uploadTranscript' | 'uploadTracks') => {
    const state = getStepState(stepKey)
    const disabled = stepKey !== 'generatePlan' && isUploadDisabled()
    const step = workflowSteps[stepKey]

    if (disabled) {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-disabled)] cursor-help"
          title={getDisabledTooltip()}
        >
          Locked
        </span>
      )
    }

    if (state === 'complete') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-raised)] text-[var(--color-success)] border border-[var(--color-success)]">
          Complete
        </span>
      )
    }
    if (state === 'in-progress') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-raised)] text-[var(--color-info)] border border-[var(--color-info)]">
          In Progress
        </span>
      )
    }
    if (state === 'failed') {
      return (
        <span
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-raised)] text-[var(--color-error)] border border-[var(--color-error)] cursor-help"
          title={step?.error || 'Processing failed'}
        >
          Failed
        </span>
      )
    }
    if (state === 'skipped') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface-raised)] text-[var(--color-text-muted)] border border-[var(--color-border)]">
          Skipped
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)]">
        Not Started
        </span>
    )
  }

  const completedCount = Object.values(workflowSteps).filter(step => step.status === 'Completed').length

  return (
    <section
      className="bg-[var(--color-surface)] rounded-xl shadow-sm border border-[var(--color-border)] p-5"
      aria-label="Episode workflow progress"
    >
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-[var(--color-text-primary)] uppercase tracking-wide">Workflow Progress</h2>
        <div className="text-xs text-[var(--color-text-secondary)]">
          {completedCount} of {WORKFLOW_STEPS.length} complete
        </div>
      </div>

      <div className="hidden md:flex gap-4">
        <div className="flex-1 bg-[var(--color-surface-raised)] rounded-lg p-4 border border-[var(--color-warning)]">
          <div className="text-xs font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pre-Stream
          </div>
          <div className="flex items-center justify-center">
            {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => (
              <div key={step.number} className="flex flex-col items-center">
                <div className={getStepClasses(step.key)}>
                  {getStepIcon(step.key)}
                </div>
                <div className="mt-3 text-center max-w-[120px]">
                  <div className={`text-sm mb-1.5 ${getLabelClasses(step.key)}`}>
                    {step.label}
                  </div>
                  {getStatusBadge(step.key)}
                  {step.key === 'generatePlan' && getStepState(step.key) === 'not-started' && (
                    <button
                      type="button"
                      onClick={handleSkipPlan}
                      disabled={isSkipping}
                      className="mt-2 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium disabled:opacity-50 transition-colors"
                    >
                      {isSkipping ? 'Skipping...' : 'Skip'}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex-[2] bg-[var(--color-surface-raised)] rounded-lg p-4 border border-[var(--color-info)]">
          <div className="text-xs font-semibold text-[var(--color-info)] uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Post-Stream
          </div>
          <div className="flex items-center justify-between">
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => (
              <div key={step.number} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center min-w-0">
                  <div
                    className={getStepClasses(step.key)}
                    title={step.key !== 'generatePlan' && isUploadDisabled() ? getDisabledTooltip() : undefined}
                  >
                    {getStepIcon(step.key)}
                  </div>
                  <div className="mt-3 text-center max-w-[120px]">
                    <div className={`text-sm mb-1.5 ${getLabelClasses(step.key)}`}>
                      {step.label}
                    </div>
                    {getStatusBadge(step.key)}
                  </div>
                </div>

                {index < arr.length - 1 && (
                  <div className={getConnectorClasses(step.key)} aria-hidden="true" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="md:hidden space-y-3">
        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-warning)]">
          <div className="text-xs font-semibold text-[var(--color-warning)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Pre-Stream
          </div>
          {WORKFLOW_STEPS.filter(s => s.number === 1).map((step) => (
            <div key={step.number} className="flex items-start">
              <div className={getStepClasses(step.key)}>
                {getStepIcon(step.key)}
              </div>
              <div className="flex-1 pt-2 ml-3">
                <div className={`text-sm mb-1.5 ${getLabelClasses(step.key)}`}>
                  {step.label}
                </div>
                {getStatusBadge(step.key)}
                {step.key === 'generatePlan' && getStepState(step.key) === 'not-started' && (
                  <button
                    type="button"
                    onClick={handleSkipPlan}
                    disabled={isSkipping}
                    className="mt-2 text-xs text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium disabled:opacity-50 transition-colors"
                  >
                    {isSkipping ? 'Skipping...' : 'Skip'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[var(--color-surface-raised)] rounded-lg p-3 border border-[var(--color-info)]">
          <div className="text-xs font-semibold text-[var(--color-info)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Post-Stream
          </div>
          <div className="space-y-2">
            {WORKFLOW_STEPS.filter(s => s.number > 1).map((step, index, arr) => (
              <div key={step.number} className="flex items-start">
                <div className="flex flex-col items-center mr-3">
                  <div
                    className={getStepClasses(step.key)}
                    title={step.key !== 'generatePlan' && isUploadDisabled() ? getDisabledTooltip() : undefined}
                  >
                    {getStepIcon(step.key)}
                  </div>

                  {index < arr.length - 1 && (
                    <div
                      className={`w-0.5 h-8 mt-2 transition-colors duration-300 rounded-full ${
                        getStepState(arr[index + 1].key) === 'complete'
                          ? 'bg-[var(--color-success)]'
                          : 'bg-[var(--color-divider)]'
                      }`}
                      aria-hidden="true"
                    />
                  )}
                </div>

                <div className="flex-1 pt-2">
                  <div className={`text-sm mb-1.5 ${getLabelClasses(step.key)}`}>
                    {step.label}
                  </div>
                  {getStatusBadge(step.key)}
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
