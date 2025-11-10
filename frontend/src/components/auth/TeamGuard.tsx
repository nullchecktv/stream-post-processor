import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../hooks/useUser'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function TeamGuard() {
  const { profile, loading } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !profile?.activeTeamId) {
      navigate('/teams', {
        state: { from: location.pathname },
        replace: true
      })
    }
  }, [loading, profile?.activeTeamId, navigate, location.pathname])

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (!profile?.activeTeamId) {
    return null
  }

  return <Outlet />
}
