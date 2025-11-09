import { createContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { usersApi } from '../api/users'
import type { UserProfile } from '../types'
import { useAuth } from '../hooks/useAuth'
import { useToast } from './ToastContext'

interface UserContextType {
  profile: UserProfile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
  updateProfile: (data: Partial<UserProfile>) => Promise<void>
}

// UserProfile interface includes team-related fields:
// - activeTeamId: string | null
// - teams: TeamMembership[]
// - ownedTeams: TeamMembership[]
// - memberTeams: TeamMembership[]
// These are automatically updated when refreshProfile() is called by TeamContext

export const UserContext = createContext<UserContextType | undefined>(undefined)

interface UserProviderProps {
  children: ReactNode
}

export function UserProvider({ children }: UserProviderProps) {
  const { isAuthenticated, loading: authLoading } = useAuth()
  const { showSuccess, showError } = useToast()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refreshProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setProfile(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)
      const data = await usersApi.getProfile()
      setProfile(data)
    } catch (err: unknown) {
      const is404 = typeof err === 'object' && err !== null && 'status' in err && err.status === 404
      const errorMessage = is404 ? 'Profile not found' : (err instanceof Error ? err.message : 'Failed to load profile')
      setError(errorMessage)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated])

  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      setError(null)
      const updatedProfile = await usersApi.updateProfile(data)
      setProfile(updatedProfile)
      showSuccess('Profile updated successfully')
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile'
      setError(errorMessage)
      showError(errorMessage)
      throw err
    }
  }

  useEffect(() => {
    if (!authLoading) {
      refreshProfile()
    }
  }, [authLoading, refreshProfile])

  return (
    <UserContext.Provider
      value={{
        profile,
        loading,
        error,
        refreshProfile,
        updateProfile,
      }}
    >
      {children}
    </UserContext.Provider>
  )
}
