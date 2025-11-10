import { useNavigate } from 'react-router-dom'
import type { EpisodeListView } from '../../types'
import { formatDate } from '../../utils/date'

interface EpisodeCardProps {
  episode: EpisodeListView
  variant?: 'default' | 'compact'
}

const statusColors: Record<string, string> = {
  draft: 'bg-gradient-to-br from-gray-100 to-gray-50 text-gray-700 border border-gray-200 shadow-sm',
  processing: 'bg-gradient-to-br from-blue-100 to-blue-50 text-blue-700 border border-blue-200 shadow-sm',
  published: 'bg-gradient-to-br from-primary/20 to-primary/10 text-primary-dark border border-primary/30 shadow-sm',
  archived: 'bg-gradient-to-br from-amber-100 to-amber-50 text-amber-700 border border-amber-200 shadow-sm',
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
        className="group flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 hover:border-primary hover:shadow-md transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 transform hover:-translate-y-0.5"
      >
        <div className="flex-1 min-w-0 flex items-center">
          <div className="w-10 h-10 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-lg flex items-center justify-center mr-3 group-hover:from-primary/20 group-hover:to-primary-light/20 transition-all">
            <svg className="w-5 h-5 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-gray-900 truncate group-hover:text-primary transition-colors">
              {episode.title}
            </h3>
            {episode.airDate && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(episode.airDate)}
              </p>
            )}
          </div>
        </div>
        {episode.status && (
          <span
            className={`ml-3 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
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
      className="group relative bg-white rounded-2xl border border-gray-100 hover:border-primary/50 hover:shadow-lg transition-all duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 overflow-hidden transform hover:-translate-y-1"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary-light/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="h-1.5 bg-gradient-to-r from-primary via-primary-dark to-primary-light"></div>
      <div className="relative p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-3">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2 line-clamp-2">
              {episode.title}
            </h3>
          </div>
          {episode.status && (
            <span
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap ${
                statusColors[episode.status] || statusColors.draft
              }`}
            >
              {episode.status}
            </span>
          )}
        </div>

        {episode.airDate && (
          <div className="flex items-center text-sm text-gray-600 mb-6 bg-gray-50 rounded-lg px-3 py-2 w-fit">
            <svg
              className="w-4 h-4 mr-2 text-primary"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{formatDate(episode.airDate)}</span>
          </div>
        )}

        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="w-8 h-8 bg-gradient-to-br from-primary/10 to-primary-light/10 rounded-lg flex items-center justify-center">
              <svg
                className="w-4 h-4 text-primary"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-medium">Episode</span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              handleClick()
            }}
            className="flex items-center text-sm text-primary hover:text-primary-dark font-semibold transition-all group-hover:translate-x-1"
          >
            View Details
            <svg className="w-4 h-4 ml-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
