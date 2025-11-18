import { createContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession, signIn as amplifySignIn, resetPassword as amplifyResetPassword, confirmResetPassword as amplifyConfirmResetPassword } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { useNavigate } from 'react-router-dom'
import { refreshMomentoToken } from '../api/tokens'
import { refreshCognitoToken } from '../api/auth'

interface AuthUser {
  userId: string
  username: string
  email?: string
  tenantId?: string
  momentoToken?: string
}

interface AuthContextType {
  isAuthenticated: boolean
  user: AuthUser | null
  momentoToken: string | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshAuth: () => Promise<void>
  resetPassword: (email: string) => Promise<void>
  confirmResetPassword: (email: string, code: string, newPassword: string) => Promise<void>
  updateMomentoToken: (token: string) => void
  refreshAuthToken: () => Promise<string>
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const navigate = useNavigate()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [momentoToken, setMomentoToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      if (currentUser && session.tokens?.idToken) {
        const idTokenPayload = session.tokens.idToken.payload
        const extractedMomentoToken = idTokenPayload.momentoToken as string | undefined
        const extractedTenantId = idTokenPayload['custom:tenantId'] as string | undefined

        setIsAuthenticated(true)
        setUser({
          userId: currentUser.userId,
          username: currentUser.username,
          email: idTokenPayload.email as string | undefined,
          tenantId: extractedTenantId,
          momentoToken: extractedMomentoToken,
        })

        if (!extractedMomentoToken) {
          try {
            const { momentoToken: refreshedToken } = await refreshMomentoToken()
            setMomentoToken(refreshedToken)
            setUser(prev => prev ? { ...prev, momentoToken: refreshedToken } : null)
          } catch (error) {
            console.error('Failed to refresh Momento token:', error)
            setMomentoToken(null)
          }
        } else {
          setMomentoToken(extractedMomentoToken)
        }
      } else {
        setIsAuthenticated(false)
        setUser(null)
        setMomentoToken(null)
      }
    } catch (error) {
      setIsAuthenticated(false)
      setUser(null)
      setMomentoToken(null)
    } finally {
      setLoading(false)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      await amplifySignIn({
        username: email,
        password,
      })
      await checkAuth()
    } catch (error) {
      console.error('Sign in error:', error)
      throw error
    }
  }

  const signOut = async () => {
    try {
      await amplifySignOut()
      setIsAuthenticated(false)
      setUser(null)
      setMomentoToken(null)
    } catch (error) {
      console.error('Sign out error:', error)
      throw error
    }
  }

  const refreshAuth = async () => {
    setLoading(true)
    await checkAuth()
  }

  const resetPassword = async (email: string) => {
    try {
      await amplifyResetPassword({ username: email })
    } catch (error) {
      console.error('Reset password error:', error)
      throw error
    }
  }

  const confirmResetPassword = async (email: string, code: string, newPassword: string) => {
    try {
      await amplifyConfirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })
    } catch (error) {
      console.error('Confirm reset password error:', error)
      throw error
    }
  }

  const updateMomentoToken = (token: string) => {
    setMomentoToken(token)
  }

  const refreshAuthToken = async (): Promise<string> => {
    try {
      const newJwt = await refreshCognitoToken()
      const session = await fetchAuthSession()

      if (session.tokens?.idToken) {
        const idTokenPayload = session.tokens.idToken.payload
        const extractedMomentoToken = idTokenPayload.momentoToken as string | undefined
        const extractedTenantId = idTokenPayload['custom:tenantId'] as string | undefined

        setUser(prev => prev ? {
          ...prev,
          tenantId: extractedTenantId,
        } : null)

        setMomentoToken(extractedMomentoToken || null)
      }

      localStorage.setItem('jwt_token', newJwt)

      return newJwt
    } catch (error) {
      console.error('Auth token refresh failed:', error)
      await signOut()
      navigate('/login')
      throw error
    }
  }

  useEffect(() => {
    checkAuth()

    const hubListener = Hub.listen('auth', ({ payload }) => {
      switch (payload.event) {
        case 'signedIn':
          checkAuth()
          break
        case 'signedOut':
          setIsAuthenticated(false)
          setUser(null)
          setMomentoToken(null)
          break
        case 'tokenRefresh':
          checkAuth()
          break
        case 'tokenRefresh_failure':
          setIsAuthenticated(false)
          setUser(null)
          setMomentoToken(null)
          break
      }
    })

    const handleMomentoTokenRefresh = async () => {
      try {
        const { momentoToken: refreshedToken } = await refreshMomentoToken()
        setMomentoToken(refreshedToken)
      } catch (error) {
        console.error('Failed to update Momento token after refresh:', error)
      }
    }

    window.addEventListener('momento-token-refreshed', handleMomentoTokenRefresh)

    return () => {
      hubListener()
      window.removeEventListener('momento-token-refreshed', handleMomentoTokenRefresh)
    }
  }, [])

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        momentoToken,
        loading,
        signIn,
        signOut,
        refreshAuth,
        resetPassword,
        confirmResetPassword,
        updateMomentoToken,
        refreshAuthToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
