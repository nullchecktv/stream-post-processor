import { useNavigate } from 'react-router-dom'
import type { EpisodeListView } from '../../types'
import { formatDate } from '../../utils/date'

interface EpisodeCardProps {
  episode: EpisodeListView
  variant?: 'default' | 'compact'
}

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800 border border-gray-200',
  processing: 'bg-blue-50 text-blue-700 border border-blue-200',
  published: 'bg-primary/10 text-primary-dark border border-primary/30',
  archived: 'bg-amber-50 text-amber-700 border border-amber-200',
}

export function EpisodeCard({ episode, variant = 'default' }: EpisodeCardProps) {
  const navigate = useNavigate()

  const handleClick = () => {
    navigate(`/episodes/${episode.id}`)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      handleClick()
    }
  }

  if (variant === 'compact') {
    return (
      <div
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 hover:border-primary hover:shadow-sm transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-gray-900 truncate">
            {episode.title}
          </h3>
          {episode.airDate && (
            <p className="text-xs text-gray-500 mt-0.5">
              {formatDate(episode.airDate)}
            </p>
          )}
        </div>
        {episode.status && (
          <span
            className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
              statusColors[episode.status] || statusColors.draft
            }`}
          >
            {episode.status}
          </span>
        )}
      </div>
    )
  }

  return (
    <div
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      className="bg-white rounded-xl border-2 border-gray-200 hover:border-primary hover:shadow-lg transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 overflow-hidden transform hover:-translate-y-1 group"
    >
      <div className="h-2 bg-gradient-to-r from-primary to-primary-light"></div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 flex-1 mr-3">
            {episode.title}
          </h3>
          {episode.status && (
            <span
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                statusColors[episode.status] || statusColors.draft
              }`}
            >
              {episode.status}
            </span>
          )}
        </div>

        {episode.airDate && (
          <div className="flex items-center text-sm text-gray-600 mb-4">
            <svg
              className="w-4 h-4 mr-2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {formatDate(episode.airDate)}
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-500">Episode</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
          >
            View Details →
          </button>
        </div>
      </div>
    </div>
  )
}
