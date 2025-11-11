import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '../common/ErrorBoundary'

export function TeamLayout() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === `/teams/${teamId}/settings`) {
      navigate(`/teams/${teamId}/settings/general`, { replace: true })
    }
  }, [location.pathname, teamId, navigate])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
