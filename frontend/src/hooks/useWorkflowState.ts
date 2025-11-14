import { useMemo } from 'react'
import type { Episode } from '../types'

export type WorkflowStep = 0 | 1 | 2 | 3

export type StepState = 'not_started' | 'in_progress' | 'complete' | 'skipped' | 'locked'

export interface StepStatus {
  state: StepState
  canInteract: boolean
  actionLabel?: string
  actionRoute?: string
  viewRoute?: string
}

export interface WorkflowState {
  currentStep: WorkflowStep
  completedSteps: number[]
  steps: {
    1: StepStatus
    2: StepStatus
    3: StepStatus
  }
}

export function computeWorkflowState(
  episode: Episode,
  hasPlan: boolean = false,
  planSkipped: boolean = false
): WorkflowState {
  const completedSteps: number[] = []

  const hasTranscript = episode.metrics?.hasTranscript || false
  const hasTracks = (episode.metrics?.tracksCount || 0) > 0

  if (hasPlan) completedSteps.push(1)
  if (hasTranscript) completedSteps.push(2)
  if (hasTracks) completedSteps.push(3)

  const currentStep = (completedSteps.length > 0 ? Math.max(...completedSteps) : 0) as WorkflowStep

  const planComplete = hasPlan || planSkipped
  const step1State: StepState = hasPlan ? 'complete' : planSkipped ? 'skipped' : 'not_started'
  const step2State: StepState = hasTranscript ? 'complete' : planComplete ? 'not_started' : 'locked'
  const step3State: StepState = hasTracks ? 'complete' : planComplete ? 'not_started' : 'locked'

  return {
    currentStep,
    completedSteps,
    steps: {
      1: {
        state: step1State,
        canInteract: true,
        actionLabel: hasPlan ? undefined : 'Generate Plan',
        actionRoute: hasPlan ? undefined : `/episodes/${episode.id}/plan`,
        viewRoute: hasPlan ? `/episodes/${episode.id}/plan` : undefined
      },
      2: {
        state: step2State,
        canInteract: planComplete,
        actionLabel: hasTranscript ? undefined : 'Upload',
        actionRoute: hasTranscript ? undefined : `/episodes/${episode.id}/uploads`,
        viewRoute: hasTranscript ? `/episodes/${episode.id}/uploads` : undefined
      },
      3: {
        state: step3State,
        canInteract: planComplete,
        actionLabel: hasTracks ? undefined : 'Upload',
        actionRoute: hasTracks ? undefined : `/episodes/${episode.id}/uploads`,
        viewRoute: hasTracks ? `/episodes/${episode.id}/uploads` : undefined
      }
    }
  }
}

export function getWorkflowStepFromEpisode(episode: Episode, hasPlan: boolean = false): WorkflowStep {
  const hasTranscript = episode.metrics?.hasTranscript || false
  const hasTracks = (episode.metrics?.tracksCount || 0) > 0

  if (hasTracks) return 3
  if (hasTranscript) return 2
  if (hasPlan) return 1
  return 1
}

export function isStepComplete(step: number, episode: Episode, hasPlan: boolean = false): boolean {
  switch (step) {
    case 1:
      return hasPlan
    case 2:
      return episode.metrics?.hasTranscript || false
    case 3:
      return (episode.metrics?.tracksCount || 0) > 0
    default:
      return false
  }
}

export function useWorkflowState(
  episode: Episode | null,
  hasPlan: boolean = false,
  planSkipped: boolean = false
): WorkflowState | null {
  return useMemo(() => {
    if (!episode) return null
    return computeWorkflowState(episode, hasPlan, planSkipped)
  }, [episode, hasPlan, planSkipped])
}
