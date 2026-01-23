import { useState } from 'react'
import { episodesApi } from '../../api/episodes'
import { useToast } from '../../hooks/useToast'
import { MultiSelect } from '../common/MultiSelect'
import { formatDate } from '../../utils/date'

interface Track {
  name: string
  filename?: string
  uploadedAt?: string
  status: string
  speakers?: string[]
}

interface TrackCardProps {
  track: Track
  episodeId: string
  episodeSpeakers: string[]
  onUpdate: () => void
}

export function TrackCard({ track, episodeId, episodeSpeakers, onUpdate }: TrackCardProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedSpeakers, setSelectedSpeakers] = useState<string[]>(track.speakers || [])
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const { showError, showSuccess } = useToast()

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await episodesApi.updateTrack(episodeId, track.name, { speakers: selectedSpeakers })
      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Failed to update track:', error)
      showError(error instanceof Error ? error.message : 'Failed to update track speakers')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setSelectedSpeakers(track.speakers || [])
    setIsEditing(false)
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete the "${track.name}" track? This action cannot be undone.`)) {
      return
    }

    setIsDeleting(true)
    try {
      await episodesApi.deleteTrack(episodeId, track.name)
      showSuccess(`Track "${track.name}" deleted successfully`)
      onUpdate()
    } catch (error) {
      console.error('Failed to delete track:', error)
      showError(error instanceof Error ? error.message : 'Failed to delete track')
    } finally {
      setIsDeleting(false)
    }
  }

  if (isEditing) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
        <div className="flex items-start gap-3 mb-4">
          <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-gray-900 capitalize">{track.name}</p>
            {track.filename && (
              <p className="text-sm text-gray-600 truncate mt-1">{track.filename}</p>
            )}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Speakers
          </label>
          <MultiSelect
            options={episodeSpeakers}
            selected={selectedSpeakers}
            onChange={setSelectedSpeakers}
            placeholder={episodeSpeakers.length === 0 ? 'No speakers defined for this episode' : 'Select speakers'}
            disabled={episodeSpeakers.length === 0}
          />
          {episodeSpeakers.length === 0 && (
            <p className="mt-1 text-xs text-gray-500">
              Add speakers to the episode first to enable speaker selection.
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            onClick={handleCancel}
            disabled={isSaving}
            className="px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-purple-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-gray-900 capitalize">{track.name}</p>
          {track.filename && (
            <p className="text-sm text-gray-600 truncate mt-1">{track.filename}</p>
          )}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-xs text-gray-500">
            {track.uploadedAt && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatDate(track.uploadedAt)}
              </span>
            )}
            {track.speakers && track.speakers.length > 0 && (
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {track.speakers.join(', ')}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--color-accent)] text-white capitalize flex-shrink-0">
            {track.status}
          </span>
          <button
            onClick={() => setIsEditing(true)}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Edit track speakers"
          >
            <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Delete track"
          >
            {isDeleting ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
