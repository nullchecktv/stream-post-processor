import { useMemo } from 'react'
import type { Episode } from '../types'

export type WorkflowStep = 1 | 2 | 3 | 4

export interface NextAction {
  title: string
  description: string
  buttonText: string
  route: string
  icon: string
}

export interface WorkflowState {
  currentStep: WorkflowStep
  completedSteps: number[]
  nextAction: NextAction
}

export function computeWorkflowState(episode: Episode, hasPlan: boolean = false): WorkflowState {
  const completedSteps: number[] = [1]

  const hasTranscript = episode.metrics?.hasTranscript || false
  const hasTracks = (episode.metrics?.tracksCount || 0) > 0

  if (hasPlan) completedSteps.push(2)
  if (hasTranscript) completedSteps.push(3)
  if (hasTracks) completedSteps.push(4)

  const currentStep = Math.max(...completedSteps) as WorkflowStep

  return {
    currentStep,
    completedSteps,
    nextAction: determineNextAction(completedSteps, episode.id)
  }
}

export function determineNextAction(completedSteps: number[], episodeId: string): NextAction {
  if (!completedSteps.includes(2)) {
    return {
      title: 'Generate Content Plan',
      description: 'Create a structured plan with objectives and concepts for this episode',
      buttonText: 'Generate Plan',
      route: `/episodes/${episodeId}/plan`,
      icon: 'lightbulb'
    }
  }

  if (!completedSteps.includes(3)) {
    return {
      title: 'Upload Transcript',
      description: 'Upload the SRT transcript file to enable AI-powered clip detection',
      buttonText: 'Upload Transcript',
      route: `/episodes/${episodeId}/details`,
      icon: 'document'
    }
  }

  if (!completedSteps.includes(4)) {
    return {
      title: 'Upload Video Tracks',
      description: 'Upload video tracks to generate clips from detected moments',
      buttonText: 'Upload Tracks',
      route: `/episodes/${episodeId}/details`,
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

  if (hasTracks) return 4
  if (hasTranscript) return 3
  if (hasPlan) return 2
  return 1
}

export function isStepComplete(step: number, episode: Episode, hasPlan: boolean = false): boolean {
  switch (step) {
    case 1:
      return true
    case 2:
      return hasPlan
    case 3:
      return episode.metrics?.hasTranscript || false
    case 4:
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
