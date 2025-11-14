import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { refreshMomentoToken } from '../api/tokens'

export function useMomentoToken() {
  const { momentoToken, updateMomentoToken } = useAuth()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ensureToken = async () => {
      if (!momentoToken && !isRefreshing) {
        setIsRefreshing(true)
        setError(null)
        try {
          const { momentoToken: refreshedToken } = await refreshMomentoToken()
          updateMomentoToken(refreshedToken)
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token'
          setError(errorMessage)
          console.error('Failed to refresh Momento token:', err)
        } finally {
          setIsRefreshing(false)
        }
      }
    }

    ensureToken()
  }, [momentoToken, isRefreshing, updateMomentoToken])

  return {
    momentoToken,
    isRefreshing,
    error,
    hasToken: !!momentoToken
  }
}
