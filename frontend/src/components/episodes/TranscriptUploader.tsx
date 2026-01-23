import { useState, useRef, type ChangeEvent } from 'react'
import { episodesApi } from '../../api/episodes'
import { useUpload } from '../../hooks/useUpload'
import { useToast } from '../../hooks/useToast'
import { HelpTip } from '../common/HelpTip'

interface TranscriptUploaderProps {
  episodeId: string
  hasExistingTranscript?: boolean
  onUploadComplete?: () => void
  onUploadError?: (error: string) => void
}

const MAX_FILE_SIZE = 10 * 1024 * 1024

export function TranscriptUploader({ episodeId, hasExistingTranscript = false, onUploadComplete, onUploadError }: TranscriptUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { addUpload, updateUpload } = useUpload()
  const { showError } = useToast()

  const validateFile = (file: File): string | null => {
    if (!file.name.toLowerCase().endsWith('.srt')) {
      return 'Only .srt files are supported'
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB`
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

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    const uploadId = addUpload({
      episodeId,
      type: 'transcript',
      filename: selectedFile.name,
      status: 'pending',
      progress: 0,
    })

    try {
      updateUpload(uploadId, { status: 'uploading', progress: 10 })

      const { uploadUrl, requiredHeaders } = await episodesApi.uploadTranscript(episodeId, selectedFile.name)

      updateUpload(uploadId, { progress: 20 })

      const xhr = new XMLHttpRequest()

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percentComplete = 20 + Math.round((event.loaded / event.total) * 70)
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

        if (requiredHeaders) {
          Object.entries(requiredHeaders).forEach(([key, value]) => {
            xhr.setRequestHeader(key, value)
          })
        }

        xhr.send(selectedFile)
      })

      updateUpload(uploadId, { status: 'processing', progress: 95 })

      updateUpload(uploadId, { status: 'completed', progress: 100 })

      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      if (onUploadComplete) onUploadComplete()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      updateUpload(uploadId, { status: 'failed', error: errorMessage })
      showError(errorMessage)
      if (onUploadError) onUploadError(errorMessage)
    } finally {
      setIsUploading(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="space-y-4">
      {hasExistingTranscript && (
        <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-info)] rounded-[var(--radius-lg)]">
          <p className="text-[length:var(--text-sm)] text-[var(--color-text-primary)]">
            A transcript has already been uploaded for this episode. You can upload a new one to replace it.
          </p>
        </div>
      )}

      <HelpTip
        id="transcript-upload-help"
        content={
          <div className="space-y-2">
            <p className="font-semibold text-[var(--color-text-primary)]">About Transcript Upload</p>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              Upload an SRT (SubRip) format transcript file. This file contains timestamped text of your episode's dialogue.
            </p>
            <p className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              The AI will analyze the transcript to detect engaging moments and suggest clips automatically.
            </p>
          </div>
        }
        position="bottom"
      >
        <div className="border-2 border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-6)] text-center hover:border-[var(--color-accent)] transition-colors duration-[var(--duration-fast)]">
          <input
            ref={fileInputRef}
            type="file"
            accept=".srt"
            onChange={handleFileSelect}
            disabled={isUploading}
            className="hidden"
            id={`transcript-upload-${episodeId}`}
          />
          <label
            htmlFor={`transcript-upload-${episodeId}`}
            className="cursor-pointer block"
          >
            <svg
              className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
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
            <p className="mt-2 text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              {selectedFile ? selectedFile.name : hasExistingTranscript ? 'Drop .srt file to replace or click to browse' : 'Drop .srt file or click to browse'}
            </p>
            <p className="mt-1 text-[length:var(--text-xs)] text-[var(--color-text-muted)]">
              SRT format only, max {MAX_FILE_SIZE / 1024 / 1024}MB
            </p>
          </label>
        </div>
      </HelpTip>

      {selectedFile && !isUploading && (
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            className="flex-1 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] px-4 py-2 rounded-[var(--radius-lg)] hover:bg-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)]"
          >
            {hasExistingTranscript ? 'Replace Transcript' : 'Upload Transcript'}
          </button>
          <button
            onClick={handleCancel}
            className="px-4 py-2 border border-[var(--color-border)] rounded-[var(--radius-lg)] hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)] text-[var(--color-text-primary)]"
          >
            Cancel
          </button>
        </div>
      )}

      {isUploading && (
        <div className="text-center text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
          Uploading transcript...
        </div>
      )}
    </div>
  )
}
