import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { LoadingSpinner } from '../common/LoadingSpinner'

export function AuthGuard() {
  const { isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/login')
    }
  }, [isAuthenticated, loading, navigate])

  if (loading) {
    return <LoadingSpinner variant="page" size="lg" />
  }

  if (!isAuthenticated) {
    return <LoadingSpinner variant="page" size="lg" />
  }

  return <Outlet />
}
