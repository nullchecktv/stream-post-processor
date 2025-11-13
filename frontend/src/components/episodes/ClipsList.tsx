import { useState, useEffect } from 'react'
import type { ClipListView } from '../../types'
import { episodesApi } from '../../api/episodes'
import { ClipCard } from './ClipCard'
import { ClipModal } from './ClipModal'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { EmptyState } from '../common/EmptyState'
import { useToast } from '../../contexts/ToastContext'

interface ClipsListProps {
  episodeId: string
  onClipsLoaded?: (counts: { total: number; proposed: number; processing: number; processed: number }, clips: ClipListView[]) => void
}

type ClipStatusFilter = 'all' | 'proposed' | 'processing' | 'created'

export function ClipsList({ episodeId, onClipsLoaded }: ClipsListProps) {
  const [clips, setClips] = useState<ClipListView[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ClipStatusFilter>('all')
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()

  useEffect(() => {
    fetchClips()
  }, [episodeId])

  const fetchClips = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await episodesApi.listClips(episodeId)
      setClips(response.items)

      if (onClipsLoaded) {
        const counts = {
          total: response.items.length,
          proposed: response.items.filter(c => c.status === 'Proposed').length,
          processing: response.items.filter(c => c.status === 'Processing').length,
          processed: response.items.filter(c => c.status === 'Created').length
        }
        onClipsLoaded(counts, response.items)
      }
    } catch (err) {
      console.error('Failed to fetch clips:', err)
      setError('Failed to load clips. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (clipId: string) => {
    setSelectedClipId(clipId)
    setShowModal(true)
  }

  const handleApprove = async (clipId: string) => {
    try {
      await episodesApi.updateClipStatus(episodeId, clipId, { status: 'approved' })
      showToast('Clip approved successfully', 'success')
      await fetchClips()
    } catch (err) {
      console.error('Failed to approve clip:', err)
      showToast('Failed to approve clip', 'error')
    }
  }

  const handleReject = async (clipId: string) => {
    try {
      await episodesApi.updateClipStatus(episodeId, clipId, { status: 'rejected' })
      showToast('Clip rejected', 'success')
      await fetchClips()
    } catch (err) {
      console.error('Failed to reject clip:', err)
      showToast('Failed to reject clip', 'error')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedClipId(null)
  }

  const filteredClips = clips.filter(clip => {
    if (statusFilter === 'all') return true
    if (statusFilter === 'proposed') return clip.status === 'Proposed'
    if (statusFilter === 'processing') return clip.status === 'Processing'
    if (statusFilter === 'created') return clip.status === 'Created'
    return false
  })

  const statusCounts = {
    all: clips.length,
    proposed: clips.filter(c => c.status === 'Proposed').length,
    processing: clips.filter(c => c.status === 'Processing').length,
    processed: clips.filter(c => c.status === 'Created').length
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="mb-4">
          <svg className="w-12 h-12 text-red-400 mx-auto" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-4">{error}</p>
        <button
          onClick={fetchClips}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
        >
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Retry
        </button>
      </div>
    )
  }

  if (clips.length === 0) {
    return (
      <EmptyState
        variant="no-clips"
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">
          Clips ({filteredClips.length})
        </h2>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'all'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('proposed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'proposed'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Proposed ({statusCounts.proposed})
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'processing'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Processing ({statusCounts.processing})
            </button>
            <button
              onClick={() => setStatusFilter('created')}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                statusFilter === 'created'
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Created ({statusCounts.processed})
            </button>
          </div>
        </div>

      {filteredClips.length === 0 ? (
        <EmptyState
          variant="default"
          title={`No ${toTitleCase(statusFilter)} Clips`}
          message={`There are no clips with status "${toTitleCase(statusFilter)}"`}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredClips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              episodeId={episodeId}
              onPlay={handlePlay}
              onApprove={handleApprove}
              onReject={handleReject}
            />
          ))}
        </div>
      )}

      {showModal && selectedClipId && (
        <ClipModal
          clipId={selectedClipId}
          episodeId={episodeId}
          isOpen={showModal}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

