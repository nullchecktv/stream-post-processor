import { useMemo } from 'react'
import type { Episode } from '../types'

export type WorkflowStep = 0 | 1 | 2 | 3

export interface NextAction {
  title: string
  description: string
  buttonText: string
  route: string
  icon: string
  skipRoute?: string
  skipText?: string
}

export interface WorkflowState {
  currentStep: WorkflowStep
  completedSteps: number[]
  nextAction: NextAction
}

export function computeWorkflowState(episode: Episode, hasPlan: boolean = false): WorkflowState {
  const completedSteps: number[] = []

  const hasTranscript = episode.metrics?.hasTranscript || false
  const hasTracks = (episode.metrics?.tracksCount || 0) > 0

  if (hasPlan) completedSteps.push(1)
  if (hasTranscript) completedSteps.push(2)
  if (hasTracks) completedSteps.push(3)

  const currentStep = (completedSteps.length > 0 ? Math.max(...completedSteps) : 0) as WorkflowStep

  return {
    currentStep,
    completedSteps,
    nextAction: determineNextAction(completedSteps, episode.id)
  }
}

export function determineNextAction(completedSteps: number[], episodeId: string): NextAction {
  const hasTranscript = completedSteps.includes(2)
  const hasTracks = completedSteps.includes(3)
  const hasPlan = completedSteps.includes(1)

  if (!hasTranscript && !hasPlan) {
    return {
      title: 'Generate Content Plan',
      description: 'Create a structured plan with objectives and concepts for this episode',
      buttonText: 'Generate Plan',
      route: `/episodes/${episodeId}/plan`,
      icon: 'lightbulb',
      skipRoute: `/episodes/${episodeId}/uploads`,
      skipText: 'Skip to Uploads'
    }
  }

  if (!hasTranscript) {
    return {
      title: 'Upload Transcript',
      description: 'Upload the SRT transcript file to enable AI-powered clip detection',
      buttonText: 'Upload Transcript',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'document'
    }
  }

  if (!hasTracks) {
    return {
      title: 'Upload Video Tracks',
      description: 'Upload video tracks to generate clips from detected moments',
      buttonText: 'Upload Tracks',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'video'
    }
  }

  return {
    title: 'All Set!',
    description: 'Your episode is ready. View generated content below.',
    buttonText: 'View Content',
    route: `/episodes/${episodeId}/content`,
    icon: 'check-circle'
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

export function useWorkflowState(episode: Episode | null, hasPlan: boolean = false): WorkflowState | null {
  return useMemo(() => {
    if (!episode) return null
    return computeWorkflowState(episode, hasPlan)
  }, [episode, hasPlan])
}
