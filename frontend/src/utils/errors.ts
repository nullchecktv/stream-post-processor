export interface ApiError {
  status: number
  message: string
  error?: string
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    'message' in error
  )
}

export function formatErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    switch (error.status) {
      case 400:
        return error.message || 'Invalid request. Please check your input.'
      case 401:
        return 'Your session has expired. Please log in again.'
      case 403:
        return 'You do not have permission to perform this action.'
      case 404:
        return error.message || 'The requested resource was not found.'
      case 409:
        return error.message || 'This resource already exists.'
      case 500:
        return 'Something went wrong on our end. Please try again later.'
      default:
        return error.message || 'An unexpected error occurred.'
    }
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'An unexpected error occurred.'
}

export function shouldRetry(error: unknown): boolean {
  if (isApiError(error)) {
    return error.status >= 500 || error.status === 408 || error.status === 429
  }
  return false
}

export async function retryRequest<T>(
  fn: () => Promise<T>,
  maxRetries = 3,
  delay = 1000
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      if (!shouldRetry(error) || attempt === maxRetries - 1) {
        throw error
      }

      await new Promise(resolve => setTimeout(resolve, delay * (attempt + 1)))
    }
  }

  throw lastError
}
