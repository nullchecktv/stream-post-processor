import { Link, useLocation } from 'react-router-dom'
import { ChevronRight, Home } from 'lucide-react'
import { useTeams } from '../../hooks/useTeams'
import { useState, useEffect } from 'react'
import { episodesApi } from '../../api/episodes'

interface BreadcrumbItem {
  label: string
  path?: string
}

export function Breadcrumb() {
  const location = useLocation()
  const { teams } = useTeams()
  const [episodeTitle, setEpisodeTitle] = useState<string | null>(null)

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const episodeIndex = pathSegments.indexOf('episodes')

    if (episodeIndex !== -1 && pathSegments[episodeIndex + 1]) {
      const episodeId = pathSegments[episodeIndex + 1]
      if (episodeId !== 'overview' && episodeId !== 'details' && episodeId !== 'plan' && episodeId !== 'uploads' && episodeId !== 'clips' && episodeId !== 'blog') {
        episodesApi.get(episodeId)
          .then(episode => setEpisodeTitle(episode.title))
          .catch(() => setEpisodeTitle(null))
      }
    } else {
      setEpisodeTitle(null)
    }
  }, [location.pathname])

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
      } else if (segment === 'settings' && pathSegments[i - 2] === 'teams') {
        const teamId = pathSegments[i - 1]
        breadcrumbs.push({ label: 'Settings', path: `/teams/${teamId}/settings/general` })
      } else if (segment === 'general' && pathSegments[i - 1] === 'settings') {
        breadcrumbs.push({ label: 'General' })
      } else if (segment === 'branding' && pathSegments[i - 1] === 'settings') {
        breadcrumbs.push({ label: 'Branding' })
      } else if (segment === 'writing' && pathSegments[i - 1] === 'settings') {
        breadcrumbs.push({ label: 'Writing' })
      } else if (segment === 'members' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Members' })
      } else if (pathSegments[i - 1] === 'teams' && segment !== 'settings' && segment !== 'members') {
        const team = teams.find(t => t.id === segment)
        breadcrumbs.push({
          label: team?.name || 'Team',
          path: `/teams/${segment}`
        })
      } else if (pathSegments[i - 1] === 'episodes' && segment !== 'overview' && segment !== 'details' && segment !== 'plan' && segment !== 'uploads' && segment !== 'clips' && segment !== 'blog') {
        breadcrumbs.push({
          label: episodeTitle || 'Episode',
          path: `/episodes/${segment}/overview`
        })
      } else if (segment === 'overview' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Overview' })
      } else if (segment === 'details' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Details' })
      } else if (segment === 'plan' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Plan' })
      } else if (segment === 'uploads' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Uploads' })
      } else if (segment === 'clips' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Clips' })
      } else if (segment === 'blog' && pathSegments[i - 1]) {
        breadcrumbs.push({ label: 'Blog' })
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
