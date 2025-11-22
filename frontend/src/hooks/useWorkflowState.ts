import { useMemo } from 'react'
import type { Episode, WorkflowSteps } from '../types'

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

export function computeWorkflowState(episode: Episode): WorkflowState {
  const workflowSteps = episode.workflowSteps
  const completedSteps: number[] = []

  if (workflowSteps) {
    if (workflowSteps.generatePlan.status === 'Completed') completedSteps.push(1)
    if (workflowSteps.uploadTranscript.status === 'Completed') completedSteps.push(2)
    if (workflowSteps.uploadTracks.status === 'Completed') completedSteps.push(3)
  } else {
    const hasTranscript = episode.metrics?.hasTranscript || false
    const hasTracks = (episode.metrics?.tracksCount || 0) > 0

    if (hasTranscript) completedSteps.push(2)
    if (hasTracks) completedSteps.push(3)
  }

  const currentStep = (completedSteps.length > 0 ? Math.max(...completedSteps) : 0) as WorkflowStep

  return {
    currentStep,
    completedSteps,
    nextAction: determineNextAction(workflowSteps, episode.id)
  }
}

export function determineNextAction(workflowSteps: WorkflowSteps | undefined, episodeId: string): NextAction {
  if (!workflowSteps) {
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

  const planStatus = workflowSteps.generatePlan.status
  const transcriptStatus = workflowSteps.uploadTranscript.status
  const tracksStatus = workflowSteps.uploadTracks.status

  const planComplete = planStatus === 'Completed' || planStatus === 'Skipped'
  const transcriptComplete = transcriptStatus === 'Completed'
  const tracksComplete = tracksStatus === 'Completed'

  if (!planComplete && planStatus !== 'In Progress' && planStatus !== 'Failed') {
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

  if (planStatus === 'In Progress') {
    return {
      title: 'Plan Generation In Progress',
      description: 'Your episode plan is being generated. This may take a moment.',
      buttonText: 'View Plan',
      route: `/episodes/${episodeId}/plan`,
      icon: 'clock'
    }
  }

  if (!transcriptComplete && transcriptStatus !== 'In Progress') {
    return {
      title: 'Upload Transcript',
      description: 'Upload the SRT transcript file to enable AI-powered clip detection',
      buttonText: 'Upload Transcript',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'document'
    }
  }

  if (transcriptStatus === 'In Progress') {
    return {
      title: 'Transcript Processing',
      description: 'Your transcript is being processed for clip detection.',
      buttonText: 'View Uploads',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'clock'
    }
  }

  if (!tracksComplete && tracksStatus !== 'In Progress') {
    return {
      title: 'Upload Video Tracks',
      description: 'Upload video tracks to generate clips from detected moments',
      buttonText: 'Upload Tracks',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'video'
    }
  }

  if (tracksStatus === 'In Progress') {
    return {
      title: 'Tracks Processing',
      description: 'Your video tracks are being processed.',
      buttonText: 'View Uploads',
      route: `/episodes/${episodeId}/uploads`,
      icon: 'clock'
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

export function getWorkflowStepFromEpisode(episode: Episode): WorkflowStep {
  if (episode.workflowSteps) {
    const { generatePlan, uploadTranscript, uploadTracks } = episode.workflowSteps

    if (uploadTracks.status === 'Completed') return 3
    if (uploadTranscript.status === 'Completed') return 2
    if (generatePlan.status === 'Completed' || generatePlan.status === 'Skipped') return 1
    return 1
  }

  const hasTranscript = episode.metrics?.hasTranscript || false
  const hasTracks = (episode.metrics?.tracksCount || 0) > 0

  if (hasTracks) return 3
  if (hasTranscript) return 2
  return 1
}

export function isStepComplete(step: number, episode: Episode): boolean {
  if (episode.workflowSteps) {
    switch (step) {
      case 1:
        return ['Completed', 'Skipped'].includes(episode.workflowSteps.generatePlan.status)
      case 2:
        return episode.workflowSteps.uploadTranscript.status === 'Completed'
      case 3:
        return episode.workflowSteps.uploadTracks.status === 'Completed'
      default:
        return false
    }
  }

  switch (step) {
    case 2:
      return episode.metrics?.hasTranscript || false
    case 3:
      return (episode.metrics?.tracksCount || 0) > 0
    default:
      return false
  }
}

export function useWorkflowState(episode: Episode | null): WorkflowState | null {
  return useMemo(() => {
    if (!episode) return null
    return computeWorkflowState(episode)
  }, [episode])
}
