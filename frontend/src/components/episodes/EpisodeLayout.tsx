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
    <div className="max-w-7xl mx-auto px-[var(--space-4)] sm:px-[var(--space-6)] lg:px-[var(--space-8)] py-[var(--space-4)] sm:py-[var(--space-6)] lg:py-[var(--space-8)]">
      <ErrorBoundary>
        <Outlet />
      </ErrorBoundary>
    </div>
  )
}
