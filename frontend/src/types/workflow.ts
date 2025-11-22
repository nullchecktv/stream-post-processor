export type WorkflowStepStatus =
  | 'Not Started'
  | 'In Progress'
  | 'Completed'
  | 'Failed'
  | 'Skipped'

export interface WorkflowStep {
  status: WorkflowStepStatus
  startedAt?: string
  completedAt?: string
  error?: string
}

export interface WorkflowSteps {
  generatePlan: WorkflowStep
  uploadTranscript: WorkflowStep
  uploadTracks: WorkflowStep
}
