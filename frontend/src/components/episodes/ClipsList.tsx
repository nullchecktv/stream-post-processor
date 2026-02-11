import { useState, useEffect, useRef, useCallback } from 'react'
import type { ClipListView, EpisodeDetail } from '../../types'
import { episodesApi } from '../../api/episodes'
import { ClipCard } from './ClipCard'
import { ClipModal } from './ClipModal'
import { LoadingSpinner } from '../common/LoadingSpinner'
import { EmptyState } from '../common/EmptyState'
import ContentGrid from '../common/ContentGrid'
import { useToast } from '../../contexts/ToastContext'

interface ClipsListProps {
  episodeId: string
  onClipsLoaded?: (counts: { total: number; proposed: number; processing: number; processed: number }, clips: ClipListView[]) => void
}

type ClipStatusFilter = 'all' | 'proposed' | 'processing' | 'created'

export function ClipsList({ episodeId, onClipsLoaded }: ClipsListProps) {
  const [clips, setClips] = useState<ClipListView[]>([])
  const [episode, setEpisode] = useState<EpisodeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<ClipStatusFilter>('all')
  const [selectedClipId, setSelectedClipId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const { showToast } = useToast()

  const fetchClipsRef = useRef<(() => Promise<void>) | null>(null)

  const fetchClips = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const [response, episodeData] = await Promise.all([
        episodesApi.listClips(episodeId),
        episodesApi.getDetail(episodeId)
      ])
      setClips(response.items)
      setEpisode(episodeData)

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
  }, [episodeId, onClipsLoaded])

  useEffect(() => {
    fetchClips()
  }, [fetchClips])

  useEffect(() => {
    const handleRefresh = () => {
      fetchClipsRef.current?.()
    }

    const handleContentItemStatusUpdate = (event: CustomEvent) => {
      const { message } = event.detail
      if (message.type === 'clip_status_updated' && message.metadata?.clipId) {
        setClips(prevClips =>
          prevClips.map(clip =>
            clip.id === message.metadata.clipId
              ? {
                  ...clip,
                  status: message.metadata.status,
                  error: message.metadata.error,
                  updatedAt: message.timestamp
                }
              : clip
          )
        )
      }
    }

    window.addEventListener('refreshPageContent', handleRefresh)
    window.addEventListener('contentItemStatusUpdated', handleContentItemStatusUpdate as EventListener)

    return () => {
      window.removeEventListener('refreshPageContent', handleRefresh)
      window.removeEventListener('contentItemStatusUpdated', handleContentItemStatusUpdate as EventListener)
    }
  }, [])

  const handlePlay = (clipId: string) => {
    setSelectedClipId(clipId)
    setShowModal(true)
  }

  const handleRetry = async (clipId: string) => {
    try {
      await episodesApi.generateClip(episodeId, clipId, { orientation: 'landscape' })
      await fetchClips()
    } catch (err) {
      console.error('Failed to retry clip generation:', err)
      showToast('Failed to retry clip generation', 'error')
    }
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setSelectedClipId(null)
  }

  const filteredClips = clips
    .filter(clip => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'proposed') return clip.status === 'Proposed'
      if (statusFilter === 'processing') return clip.status === 'Processing'
      if (statusFilter === 'created') return clip.status === 'Created'
      return false
    })
    .sort((a, b) => {
      if (a.status === 'Processing' && b.status !== 'Processing') return -1
      if (a.status !== 'Processing' && b.status === 'Processing') return 1
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
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
          <svg className="w-12 h-12 text-[var(--color-error)] mx-auto" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <p className="text-[var(--color-text-secondary)] mb-4">{error}</p>
        <button
          onClick={fetchClips}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] text-sm font-medium rounded-[var(--radius-md)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)]"
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
    <div className="space-y-[var(--space-6)]">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-[var(--color-text-primary)]">
          Clips ({filteredClips.length})
        </h2>
        <div className="flex items-center gap-2">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] ${
                statusFilter === 'all'
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              All ({statusCounts.all})
            </button>
            <button
              onClick={() => setStatusFilter('proposed')}
              className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] ${
                statusFilter === 'proposed'
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Proposed ({statusCounts.proposed})
            </button>
            <button
              onClick={() => setStatusFilter('processing')}
              className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] ${
                statusFilter === 'processing'
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Processing ({statusCounts.processing})
            </button>
            <button
              onClick={() => setStatusFilter('created')}
              className={`px-3 py-1.5 text-sm font-medium rounded-[var(--radius-md)] transition-colors duration-[var(--duration-fast)] ${
                statusFilter === 'created'
                  ? 'bg-[var(--color-accent)] text-[var(--color-text-on-accent)]'
                  : 'bg-[var(--color-surface-raised)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
              }`}
            >
              Created ({statusCounts.processed})
            </button>
          </div>
        </div>

      {statusCounts.processing > 0 && statusFilter === 'all' && (
        <div className="bg-[var(--color-info)] bg-opacity-10 border border-[var(--color-info)] rounded-[var(--radius-md)] p-[var(--space-4)] flex items-center gap-3">
          <svg className="w-5 h-5 text-[var(--color-info)] animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-[var(--color-text-primary)]">
              Processing {statusCounts.processing} {statusCounts.processing === 1 ? 'clip' : 'clips'}
            </p>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Clips are being generated and will appear when ready
            </p>
          </div>
        </div>
      )}

      {filteredClips.length === 0 ? (
        <EmptyState
          variant="default"
          title={`No ${toTitleCase(statusFilter)} Clips`}
          message={`There are no clips with status "${toTitleCase(statusFilter)}"`}
        />
      ) : (
        <ContentGrid columns={{ sm: 1, md: 1, lg: 2, xl: 2 }} gap={4}>
          {filteredClips.map(clip => (
            <ClipCard
              key={clip.id}
              clip={clip}
              episodeId={episodeId}
              trackCount={episode?.trackCount || episode?.tracks?.length || 0}
              hasSpeakers={episode?.hasSpeakers || false}
              onPlay={handlePlay}
              onRetry={handleRetry}
            />
          ))}
        </ContentGrid>
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

