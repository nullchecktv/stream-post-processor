import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useUser } from '../../hooks/useUser'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function ProfileGuard() {
  const { profile, loading, error } = useUser()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!loading && !profile && error) {
      if (location.pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true })
      }
    }
  }, [profile, loading, error, navigate, location.pathname])

  if (loading) {
    return <LoadingSpinner variant="page" size="lg" />
  }

  if (!profile && error) {
    return <LoadingSpinner variant="page" size="lg" />
  }

  return <Outlet />
}
