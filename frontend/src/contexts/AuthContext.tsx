import { createContext, useEffect, useState, type ReactNode } from 'react'
import { getCurrentUser, signOut as amplifySignOut, fetchAuthSession, signIn as amplifySignIn, resetPassword as amplifyResetPassword, confirmResetPassword as amplifyConfirmResetPassword } from 'aws-amplify/auth'
import { Hub } from 'aws-amplify/utils'
import { refreshMomentoToken } from '../api/tokens'

interface AuthUser {
  userId: string
  username: string
  email?: string
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
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [momentoToken, setMomentoToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const checkAuth = async () => {
    try {
      const currentUser = await getCurrentUser()
      const session = await fetchAuthSession()

      if (currentUser && session.tokens) {
        setIsAuthenticated(true)
        setUser({
          userId: currentUser.userId,
          username: currentUser.username,
          email: session.tokens.idToken?.payload.email as string | undefined,
        })

        const tokenFromSession = session.tokens.idToken?.payload.momentoToken as string | null

        if (!tokenFromSession) {
          try {
            const { momentoToken: refreshedToken } = await refreshMomentoToken()
            setMomentoToken(refreshedToken)
          } catch (error) {
            console.error('Failed to refresh Momento token:', error)
            setMomentoToken(null)
          }
        } else {
          setMomentoToken(tokenFromSession)
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

    return () => hubListener()
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
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
