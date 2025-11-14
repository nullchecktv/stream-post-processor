import { useState, useEffect, useMemo } from 'react'
import { useEpisodes } from '../hooks/useEpisodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDebounce } from '../hooks/useDebounce'
import { EpisodeCardSkeleton } from '../components/common/EpisodeCardSkeleton'
import { EmptyState } from '../components/common/EmptyState'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { HelpTip } from '../components/common/HelpTip'
import { EpisodeCreationWizard } from '../components/episodes/EpisodeCreationWizard'
import { EpisodeCard } from '../components/episodes/EpisodeCard'

function EpisodesListPage() {
  usePageTitle('Episodes')
  const { episodes, loading, loadingMore, hasMore, loadMore } = useEpisodes()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  const filteredEpisodes = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return episodes

    const query = debouncedSearchQuery.toLowerCase()
    return episodes.filter(episode =>
      episode.title.toLowerCase().includes(query) ||
      episode.status?.toLowerCase().includes(query)
    )
  }, [episodes, debouncedSearchQuery])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setIsWizardOpen(true)
      }
    }

    globalThis.addEventListener('keydown', handleKeyDown)
    return () => globalThis.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCreateEpisode = () => {
    setIsWizardOpen(true)
  }

  const handleCloseWizard = () => {
    setIsWizardOpen(false)
  }

  const handleWizardComplete = () => {
    setIsWizardOpen(false)
  }

  return (
    <div className="relative min-h-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Episodes</h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your livestream episodes and content</p>
            </div>
            <Button onClick={handleCreateEpisode} variant="primary" className="w-full sm:w-auto">
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4v16m8-8H4" />
              </svg>
              Create Episode
            </Button>
          </div>

          <div className="w-full sm:max-w-md">
            <Input
              type="text"
              placeholder="Search episodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <EpisodeCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredEpisodes.length === 0 ? (
          <EmptyState
            variant={debouncedSearchQuery ? 'default' : 'no-episodes'}
            title={debouncedSearchQuery ? 'No episodes found' : undefined}
            message={debouncedSearchQuery ? 'Try adjusting your search' : undefined}
            actionLabel={!debouncedSearchQuery ? 'Create Your First Episode' : undefined}
            onAction={!debouncedSearchQuery ? handleCreateEpisode : undefined}
          />
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEpisodes.map((episode) => (
                <EpisodeCard
                  key={episode.id}
                  episode={episode}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-8 text-center">
                <Button
                  onClick={loadMore}
                  variant="ghost"
                  loading={loadingMore}
                >
                  Load More Episodes
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <EpisodeCreationWizard
        isOpen={isWizardOpen}
        onClose={handleCloseWizard}
        onComplete={handleWizardComplete}
      />

      <div className="fixed bottom-8 right-8 z-40">
        <HelpTip
          id="episodes-create-episode"
          content={
            <div>
              <p className="font-semibold mb-1">Create New Episode</p>
              <p>Click here to create a new episode. You can also use Ctrl+N (Cmd+N on Mac) as a keyboard shortcut.</p>
            </div>
          }
          position="left"
        >
          <button
            onClick={handleCreateEpisode}
            className="relative bg-gradient-to-br from-primary via-primary-dark to-primary-light text-white rounded-full p-5 shadow-2xl hover:shadow-primary/50 transition-all transform hover:scale-110 active:scale-95 focus:outline-none focus:ring-4 focus:ring-primary/40 focus:ring-offset-2 group"
            aria-label="Create new episode"
          >
            <div className="absolute inset-0 bg-white/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity animate-pulse" />
            <svg
              className="w-7 h-7 relative z-10"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2.5"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </HelpTip>
      </div>
    </div>
  )
}

export default EpisodesListPage

