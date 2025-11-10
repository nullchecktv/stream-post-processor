import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEpisodes } from '../hooks/useEpisodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useDebounce } from '../hooks/useDebounce'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { CreateEpisodeModal } from '../components/dashboard/CreateEpisodeModal'

function EpisodesListPage() {
  usePageTitle('Episodes')
  const navigate = useNavigate()
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

  const handleEpisodeClick = (episodeId: string) => {
    navigate(`/episodes/${episodeId}`)
  }

  const handleCreateEpisode = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'No date set'

    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800'
      case 'processing':
        return 'bg-blue-100 text-blue-800'
      case 'archived':
        return 'bg-gray-100 text-gray-800'
      case 'draft':
      default:
        return 'bg-yellow-100 text-yellow-800'
    }
  }

  return (
    <div className="relative min-h-full">
      {loading && <LoadingSpinner variant="page" />}
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

        {filteredEpisodes.length === 0 && !loading ? (
          <div className="text-center py-8 sm:py-12">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              {debouncedSearchQuery ? 'No episodes found' : 'No episodes yet'}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {debouncedSearchQuery ? 'Try adjusting your search' : 'Get started by creating your first episode'}
            </p>
            {!debouncedSearchQuery && (
              <div className="mt-6">
                <Button onClick={handleCreateEpisode} variant="primary" className="w-full sm:w-auto">
                  <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  Create Your First Episode
                </Button>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th scope="col" className="hidden sm:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th scope="col" className="hidden md:table-cell px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Air Date
                      </th>
                      <th scope="col" className="px-4 sm:px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredEpisodes.map((episode) => (
                      <tr
                        key={episode.id}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                        onClick={() => handleEpisodeClick(episode.id)}
                      >
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex flex-col">
                            <div className="text-sm font-medium text-gray-900">{episode.title}</div>
                            <div className="sm:hidden mt-1">
                              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(episode.status)}`}>
                                {episode.status || 'draft'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="hidden sm:table-cell px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(episode.status)}`}>
                            {episode.status || 'draft'}
                          </span>
                        </td>
                        <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(episode.airDate)}
                        </td>
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEpisodeClick(episode.id)
                            }}
                            className="text-primary hover:text-primary-dark transition-colors"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {hasMore && (
              <div className="mt-6 text-center">
                <Button
                  onClick={loadMore}
                  variant="ghost"
                  loading={loadingMore}
                  className="w-full sm:w-auto"
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

