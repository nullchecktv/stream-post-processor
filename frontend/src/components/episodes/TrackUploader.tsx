import { useState, useRef, type ChangeEvent } from 'react'
import { episodesApi } from '../../api/episodes'
import { useUpload } from '../../hooks/useUpload'
import { useToast } from '../../hooks/useToast'
import { useActivity } from '../../hooks/useActivity'
import { HelpTip } from '../common/HelpTip'

interface TrackUploaderProps {
  episodeId: string
  onUploadComplete?: (trackName: string) => void
  onUploadError?: (error: string) => void
}

const CHUNK_SIZE = 10 * 1024 * 1024
const MULTIPART_THRESHOLD = 100 * 1024 * 1024
const MAX_CONCURRENT_UPLOADS = 3

interface PartUpload {
  partNumber: number
  etag: string
}

export function TrackUploader({ episodeId, onUploadComplete, onUploadError }: TrackUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [speakersRaw, setSpeakersRaw] = useState<string>("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const { addUpload, updateUpload } = useUpload()
  const { showSuccess, showError } = useToast()
  const { addActivity } = useActivity()

  const validateFile = (file: File): string | null => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
    const hasValidExtension = videoExtensions.some(ext => file.name.toLowerCase().endsWith(ext))

    if (!hasValidExtension) {
      return 'Only video files are supported (.mp4, .mov, .avi, .mkv, .webm)'
    }
    return null
  }

  const handleFileSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const error = validateFile(file)
    if (error) {
      showError(error)
      if (onUploadError) onUploadError(error)
      return
    }

    setSelectedFile(file)
  }

  const uploadPart = async (
    uploadUrl: string,
    chunk: Blob,
    partNumber: number
  ): Promise<string> => {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: chunk,
      signal: abortControllerRef.current?.signal,
    })

    if (!response.ok) {
      throw new Error(`Part ${partNumber} upload failed with status ${response.status}`)
    }

    const etag = response.headers.get('ETag')
    if (!etag) {
      throw new Error(`Part ${partNumber} upload did not return ETag`)
    }

    return etag.replace(/"/g, '')
  }

  const uploadMultipart = async (file: File, trackName: string, uploadId: string) => {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    const parts: PartUpload[] = []

    for (let i = 0; i < totalChunks; i += MAX_CONCURRENT_UPLOADS) {
      const batchSize = Math.min(MAX_CONCURRENT_UPLOADS, totalChunks - i)
      const partNumbers = Array.from({ length: batchSize }, (_, j) => i + j + 1)

      const { parts: signedParts } = await episodesApi.signTrackParts(episodeId, trackName, {
        uploadId,
        partNumbers,
      })

      const uploadPromises = signedParts.map(async ({ partNumber, uploadUrl }) => {
        const start = (partNumber - 1) * CHUNK_SIZE
        const end = Math.min(start + CHUNK_SIZE, file.size)
        const chunk = file.slice(start, end)

        const etag = await uploadPart(uploadUrl, chunk, partNumber)

        const progress = Math.round((partNumber / totalChunks) * 90)
        updateUpload(uploadId, { progress })

        return { partNumber, etag }
      })

      const batchParts = await Promise.all(uploadPromises)
      parts.push(...batchParts)
    }

    return parts
  }

  const uploadSimple = async (file: File, uploadUrl: string, uploadId: string) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 90)
        updateUpload(uploadId, { progress: percentComplete })
      }
    })

    await new Promise<void>((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`))
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Network error during upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload cancelled'))
      })

      xhr.open('PUT', uploadUrl)
      xhr.send(file)
    })
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      showError('Please select a file')
      return
    }

    const trackName = selectedFile.name.replace(/\.[^/.]+$/, '')

    setIsUploading(true)
    abortControllerRef.current = new AbortController()

    const uploadId = addUpload({
      episodeId,
      type: 'track',
      trackName,
      filename: selectedFile.name,
      status: 'pending',
      progress: 0,
    })

    try {
      updateUpload(uploadId, { status: 'uploading', progress: 5 })

      const speakers = speakersRaw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0)

      const { uploadId: s3UploadId, uploadUrl } = await episodesApi.initiateTrackUpload(
        episodeId,
        trackName,
        selectedFile.name,
        speakers.length ? speakers : undefined,
      )

      updateUpload(uploadId, { progress: 10 })

      if (selectedFile.size > MULTIPART_THRESHOLD) {
        const parts = await uploadMultipart(selectedFile, trackName, uploadId)

        updateUpload(uploadId, { progress: 92 })

        await episodesApi.completeTrackUpload(episodeId, trackName, {
          uploadId: s3UploadId,
          parts,
        })
      } else {
        await uploadSimple(selectedFile, uploadUrl, uploadId)

        updateUpload(uploadId, { progress: 92 })
      }

      updateUpload(uploadId, { status: 'processing', progress: 95 })

      addActivity({
        type: 'preprocessing_completed',
        title: 'Track Uploaded',
        message: `Track "${trackName}" uploaded successfully`,
        episodeId,
      })

      updateUpload(uploadId, { status: 'completed', progress: 100 })

      showSuccess(`Track "${trackName}" uploaded successfully`)
      setSelectedFile(null)
      setSpeakersRaw("")
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onUploadComplete) onUploadComplete(trackName)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        updateUpload(uploadId, { status: 'failed', error: 'Upload cancelled' })
        showError('Upload cancelled')
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed'
        updateUpload(uploadId, { status: 'failed', error: errorMessage })
        showError(errorMessage)
        if (onUploadError) onUploadError(errorMessage)
      }
    } finally {
      setIsUploading(false)
      abortControllerRef.current = null
    }
  }

  const handleCancel = () => {
    if (isUploading && abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    setSelectedFile(null)
    setSpeakersRaw("")
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="speakers" className="block text-sm font-medium text-gray-700 mb-1">
          Speaker Names (optional)
        </label>
        <input
          id="speakers"
          type="text"
          value={speakersRaw}
          onChange={(e) => setSpeakersRaw(e.target.value)}
          disabled={isUploading}
          placeholder="Alice, Bob, Carol"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <p className="mt-1 text-xs text-gray-500">Comma-separated names used for speaker labeling.</p>
      </div>

      <HelpTip
        id="track-upload-help"
        content={
          <div className="space-y-2">
            <p className="font-semibold text-gray-900">About Track Upload</p>
            <p className="text-sm text-gray-700">
              Upload video tracks from your livestream. The filename will be used as the track name.
            </p>
            <p className="text-sm text-gray-700">
              Large files (&gt;100MB) use multipart upload for reliability.
            </p>
          </div>
        }
        position="bottom"
      >
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id={`track-upload-${episodeId}`}
          />
          <label
            htmlFor={`track-upload-${episodeId}`}
            className="cursor-pointer block"
          >
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-600">
              {selectedFile ? selectedFile.name : 'Drop video file or click to browse'}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              MP4, MOV, AVI, MKV, or WebM format
            </p>
            {selectedFile && selectedFile.size > MULTIPART_THRESHOLD && (
              <p className="mt-1 text-xs text-blue-600">
                Large file detected - will use multipart upload
              </p>
            )}
          </label>
        </div>
      </HelpTip>

      {selectedFile && !isUploading && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Upload Track
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {isUploading && (
        <div className="flex items-center justify-between text-sm text-gray-600">
          <span>Uploading track...</span>
          <button
            onClick={handleCancel}
            className="text-red-600 hover:text-red-700"
          >
            Cancel Upload
          </button>
        </div>
      )}
    </div>
  )
}

