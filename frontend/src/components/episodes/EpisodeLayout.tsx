import { useEffect } from 'react'
import { Outlet, useParams, useNavigate, useLocation } from 'react-router-dom'
import { ErrorBoundary } from '../common/ErrorBoundary'

export function EpisodeLayout() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (location.pathname === `/episodes/${id}`) {
      navigate(`/episodes/${id}/overview`, { replace: true })
    }
  }, [location.pathname, id, navigate])

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
