import { useCallback } from 'react'
import { useToast } from '../contexts/ToastContext'
import { formatErrorMessage } from '../utils/errors'

export function useErrorHandler() {
  const { showError } = useToast()

  const handleError = useCallback(
    (error: unknown, customMessage?: string) => {
      const message = customMessage || formatErrorMessage(error)
      showError(message)
      console.error('Error:', error)
    },
    [showError]
  )

  return { handleError }
}
