import { useNavigate } from 'react-router-dom'
import type { EpisodeListView } from '../../types'
import { formatDate } from '../../utils/date'
import { EpisodeStatusChip } from './EpisodeStatusChip'
import { MiniWorkflowProgress } from './MiniWorkflowProgress'

interface EpisodeCardProps {
  episode: EpisodeListView
  variant?: 'default' | 'compact'
  tracksCount?: number
  transcriptCount?: number
  clipsCount?: number
}

function computeCurrentStep(episode: EpisodeListView): number {
  if (!episode.metrics) return 1

  const { hasPlan, hasTranscript, tracksCount } = episode.metrics

  if (tracksCount > 0) return 4
  if (hasTranscript) return 3
  if (hasPlan) return 2
  return 1
}

export function EpisodeCard({
  episode,
  variant = 'default',
  tracksCount = 0,
  transcriptCount = 0,
  clipsCount = 0
}: EpisodeCardProps) {
  const navigate = useNavigate()
  const currentStep = computeCurrentStep(episode)

  const handleClick = () => {
    navigate(`/episodes/${episode.id}/overview`)
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
              Episode #{episode.episodeNumber}: {episode.title}
            </h3>
            {episode.airDate && (
              <p className="text-xs text-gray-500 mt-1 flex items-center">
                <svg className="w-3 h-3 mr-1" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDate(episode.airDate)}
              </p>
            )}
            <div className="mt-2 w-24">
              <MiniWorkflowProgress currentStep={currentStep} />
            </div>
          </div>
        </div>
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
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-500">Episode #{episode.episodeNumber}</span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors mb-2 line-clamp-2">
              {episode.title}
            </h3>
            <div className="mt-3">
              <MiniWorkflowProgress currentStep={currentStep} />
            </div>
          </div>
        </div>

        <div className="space-y-3 mb-4">
          {episode.airDate && (
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>Aired: {formatDate(episode.airDate)}</span>
            </div>
          )}

          {episode.platforms && episode.platforms.length > 0 && (
            <div className="flex items-center text-sm text-gray-600">
              <svg
                className="w-4 h-4 mr-2 text-gray-400"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
              </svg>
              <span>Platforms: {episode.platforms.join(', ')}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span>{tracksCount} track{tracksCount !== 1 ? 's' : ''}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{transcriptCount > 0 ? 'Transcript' : 'No transcript'}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{clipsCount} clip{clipsCount !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
