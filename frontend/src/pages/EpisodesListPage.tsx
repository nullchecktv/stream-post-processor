import { useState, useMemo } from 'react'
import { useEpisodes } from '../hooks/useEpisodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDebounce } from '../hooks/useDebounce'
import { EpisodeCardSkeleton } from '../components/common/EpisodeCardSkeleton'
import { EmptyState } from '../components/common/EmptyState'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { CreateEpisodeModal } from '../components/dashboard/CreateEpisodeModal'
import { EpisodeCard } from '../components/episodes/EpisodeCard'

function EpisodesListPage() {
  usePageTitle('Episodes')
  const { episodes, loading, loadingMore, hasMore, loadMore } = useEpisodes()
  const [searchQuery, setSearchQuery] = useState('')
  const debouncedSearchQuery = useDebounce(searchQuery, 300)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const filteredEpisodes = useMemo(() => {
    if (!debouncedSearchQuery.trim()) return episodes

    const query = debouncedSearchQuery.toLowerCase()
    return episodes.filter(episode =>
      episode.title.toLowerCase().includes(query) ||
      episode.status?.toLowerCase().includes(query)
    )
  }, [episodes, debouncedSearchQuery])

  const handleCreateEpisode = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
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

      <CreateEpisodeModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  )
}

export default EpisodesListPage

