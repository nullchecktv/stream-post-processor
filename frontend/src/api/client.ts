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

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (response.status === 401) {
    await signOut()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw {
      status: response.status,
      message: error.message || 'Request failed',
      error: error.error,
    }
  }

  if (response.status === 204) {
    return null as T
  }

  const data = await response.json()

  if (method === 'GET') {
    apiCache.set(cacheKey, data)
  }

  return data
}
