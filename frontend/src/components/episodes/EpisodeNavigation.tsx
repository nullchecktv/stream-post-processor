import { useParams, useLocation, Link } from 'react-router-dom'

export function EpisodeNavigation() {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()

  const tabs = [
    { name: 'Overview', path: `/episodes/${id}/overview`, icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { name: 'Details', path: `/episodes/${id}/details`, icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    { name: 'Plan', path: `/episodes/${id}/plan`, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
    { name: 'Uploads', path: `/episodes/${id}/uploads`, icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12' },
    { name: 'Clips', path: `/episodes/${id}/clips`, icon: 'M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ]

  return (
    <div className="border-b border-gray-200 mb-6">
      <nav className="flex space-x-8" aria-label="Episode navigation">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path
          return (
            <Link
              key={tab.name}
              to={tab.path}
              className={`
                group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm transition-colors
                ${isActive
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }
              `}
            >
              <svg
                className={`
                  -ml-0.5 mr-2 h-5 w-5
                  ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}
                `}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d={tab.icon} />
              </svg>
              {tab.name}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
