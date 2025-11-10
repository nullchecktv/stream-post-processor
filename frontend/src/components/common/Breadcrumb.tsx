import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useTeams } from '../../hooks/useTeams'

interface BreadcrumbItem {
  label: string
  path?: string
}

export function Breadcrumb() {
  const location = useLocation()
  const { teams } = useTeams()

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }]

    if (pathSegments.length === 0) {
      return breadcrumbs
    }

    for (let i = 0; i < pathSegments.length; i++) {
      const segment = pathSegments[i]

      if (segment === 'teams') {
        breadcrumbs.push({ label: 'Teams', path: '/teams' })
      } else if (segment === 'notifications') {
        breadcrumbs.push({ label: 'Notifications', path: '/notifications' })
      } else if (segment === 'profile') {
        breadcrumbs.push({ label: 'Profile', path: '/profile' })
      } else if (segment === 'episodes') {
        breadcrumbs.push({ label: 'Episodes', path: '/episodes' })
      } else if (segment === 'settings' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Settings' })
      } else if (segment === 'members' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Members' })
      } else if (pathSegments[i - 1] === 'teams' && segment !== 'settings' && segment !== 'members') {
        const team = teams.find(t => t.id === segment)
        breadcrumbs.push({
          label: team?.name || 'Team',
          path: `/teams/${segment}`
        })
      } else if (pathSegments[i - 1] === 'episodes') {
        breadcrumbs.push({ label: 'Episode Details' })
      }
    }

    return breadcrumbs
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center gap-2 text-sm text-gray-600 mb-4" aria-label="Breadcrumb">
      {breadcrumbs.map((crumb, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}
          {crumb.path ? (
            <Link
              to={crumb.path}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              {index === 0 && <Home className="w-4 h-4" />}
              <span>{crumb.label}</span>
            </Link>
          ) : (
            <span className="text-gray-900 font-medium flex items-center gap-1">
              {index === 0 && <Home className="w-4 h-4" />}
              <span>{crumb.label}</span>
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}
