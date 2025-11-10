import { fetchAuthSession, signOut } from 'aws-amplify/auth'
import { API_BASE_URL } from '../utils/constants'
import { apiCache } from '../utils/cache'

async function getAuthToken(): Promise<string> {
  try {
    const session = await fetchAuthSession()
    return session.tokens?.accessToken?.toString() || ''
  } catch (error) {
    console.error('Failed to get auth token:', error)
    return ''
  }
}

interface RequestOptions extends RequestInit {
  headers?: Record<string, string>
  skipCache?: boolean
}

export class ApiError extends Error {
  status: number
  errorType?: string
  details?: unknown

  constructor(
    status: number,
    message: string,
    errorType?: string,
    details?: unknown
  ) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.errorType = errorType
    this.details = details
  }
}

function getErrorMessage(status: number, errorData: any): string {
  if (errorData.message) {
    return errorData.message
  }

  switch (status) {
    case 400:
      return 'Invalid request. Please check your input and try again.'
    case 403:
      return 'You do not have permission to perform this action.'
    case 404:
      return 'The requested resource was not found.'
    case 409:
      if (errorData.error?.includes('duplicate') || errorData.error?.includes('already')) {
        return 'This resource already exists or you are already a member.'
      }
      return 'There was a conflict with your request. Please try again.'
    case 422:
      return 'The data you provided is invalid. Please check and try again.'
    case 500:
      return 'An unexpected error occurred. Please try again later.'
    case 502:
    case 503:
      return 'The service is temporarily unavailable. Please try again later.'
    default:
      return 'An error occurred. Please try again.'
  }
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const method = options.method || 'GET'
  const cacheKey = `${method}:${endpoint}`

  if (method === 'GET' && !options.skipCache) {
    const cached = apiCache.get<T>(cacheKey)
    if (cached !== null) {
      return cached
    }
  }

  const token = await getAuthToken()

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

    if (response.status === 401) {
      await signOut()
      window.location.href = '/login'
      throw new ApiError(401, 'Your session has expired. Please log in again.')
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const message = getErrorMessage(response.status, errorData)
      throw new ApiError(
        response.status,
        message,
        errorData.error,
        errorData.details
      )
    }

    if (response.status === 204) {
      return null as T
    }

    const data = await response.json()

    if (method === 'GET') {
      apiCache.set(cacheKey, data)
    }

    return data
  } catch (error) {
    if (error instanceof ApiError) {
      throw error
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError(
        0,
        'Unable to connect to the server. Please check your internet connection.'
      )
    }

    throw new ApiError(
      500,
      'An unexpected error occurred. Please try again.'
    )
  }
}
