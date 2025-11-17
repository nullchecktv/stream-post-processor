import { useState, useEffect, useCallback, useRef } from 'react'
import { apiRequest } from '../api/client'

export type WorkflowStepStatus = 'Locked' | 'Ready' | 'In Progress' | 'Complete' | 'Skipped' | 'Failed'
export type ContentGenerationStatus = 'Pending' | 'Processing' | 'Complete' | 'Failed'
export type WorkflowStepName = 'generate-plan' | 'upload-transcript' | 'upload-tracks'
export type ContentType = 'blog' | 'quotes' | 'clips'

export interface WorkflowStep {
  stepName: WorkflowStepName
  status: WorkflowStepStatus
  startedAt?: string
  completedAt?: string
  errorMessage?: string
}

export interface ContentGeneration {
  contentType: ContentType
  status: ContentGenerationStatus
  startedAt?: string
  completedAt?: string
  itemCount?: number
  errorMessage?: string
}

export interface WorkflowState {
  steps: WorkflowStep[]
  contentGeneration: ContentGeneration[]
  isLoading: boolean
  error: string | null
}

interface WorkflowStateResponse {
  steps: WorkflowStep[]
  contentGeneration: ContentGeneration[]
}

interface MomentoMessage {
  type: string
  metadata?: {
    episodeId?: string
    workflowState?: WorkflowStateResponse
  }
}

export function useWorkflowState(episodeId: string | null) {
  const [state, setState] = useState<WorkflowState>({
    steps: [],
    contentGeneration: [],
    isLoading: true,
    error: null
  })

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isMountedRef = useRef(true)

  const fetchWorkflowState = useCallback(async () => {
    if (!episodeId) {
      setState({
        steps: [],
        contentGeneration: [],
        isLoading: false,
        error: null
      })
      return
    }

    try {
      const response = await apiRequest<WorkflowStateResponse>(`/episodes/${episodeId}/workflow`)

      if (isMountedRef.current) {
        setState({
          steps: response.steps,
          contentGeneration: response.contentGeneration,
          isLoading: false,
          error: null
        })
      }
    } catch (error) {
      console.error('Failed to fetch workflow state:', error)

      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Failed to load workflow state'
        }))
      }
    }
  }, [episodeId])

  const handleWorkflowUpdate = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<{ message: MomentoMessage }>
    const message = customEvent.detail.message

    if (
      (message.type === 'workflow_step_updated' || message.type === 'content_generation_updated') &&
      message.metadata?.episodeId === episodeId &&
      message.metadata?.workflowState
    ) {
      if (isMountedRef.current) {
        setState(prev => ({
          ...prev,
          steps: message.metadata!.workflowState!.steps,
          contentGeneration: message.metadata!.workflowState!.contentGeneration
        }))
      }
    }
  }, [episodeId])

  const isProcessing = useCallback(() => {
    const hasProcessingStep = state.steps.some(
      step => step.status === 'In Progress' || step.status === 'Ready'
    )
    const hasProcessingContent = state.contentGeneration.some(
      content => content.status === 'Pending' || content.status === 'Processing'
    )
    return hasProcessingStep || hasProcessingContent
  }, [state.steps, state.contentGeneration])

  const startPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
    }

    pollingIntervalRef.current = setInterval(() => {
      if (isProcessing()) {
        fetchWorkflowState()
      }
    }, 5000)
  }, [isProcessing, fetchWorkflowState])

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
  }, [])

  useEffect(() => {
    isMountedRef.current = true
    fetchWorkflowState()

    return () => {
      isMountedRef.current = false
    }
  }, [fetchWorkflowState])

  useEffect(() => {
    globalThis.addEventListener('refreshPageContent', handleWorkflowUpdate)

    return () => {
      globalThis.removeEventListener('refreshPageContent', handleWorkflowUpdate)
    }
  }, [handleWorkflowUpdate])

  useEffect(() => {
    if (isProcessing()) {
      startPolling()
    } else {
      stopPolling()
    }

    return () => {
      stopPolling()
    }
  }, [isProcessing, startPolling, stopPolling])

  const refetch = useCallback(() => {
    fetchWorkflowState()
  }, [fetchWorkflowState])

  const getStep = useCallback((stepName: WorkflowStepName): WorkflowStep | undefined => {
    return state.steps.find(step => step.stepName === stepName)
  }, [state.steps])

  const getContentGeneration = useCallback((contentType: ContentType): ContentGeneration | undefined => {
    return state.contentGeneration.find(content => content.contentType === contentType)
  }, [state.contentGeneration])

  return {
    ...state,
    refetch,
    isProcessing: isProcessing(),
    getStep,
    getContentGeneration
  }
}
