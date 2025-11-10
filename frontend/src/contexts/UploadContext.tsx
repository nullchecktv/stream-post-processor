import { createContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react'
import type { UploadState } from '../types'
import { useAuth } from '../hooks/useAuth'

export interface UploadContextType {
  uploads: UploadState[]
  addUpload: (upload: Omit<UploadState, 'id' | 'startedAt'>) => string
  updateUpload: (id: string, updates: Partial<UploadState>) => void
  removeUpload: (id: string) => void
  getEpisodeUploads: (episodeId: string) => UploadState[]
  activeUploadsCount: number
}

export const UploadContext = createContext<UploadContextType | undefined>(undefined)

interface UploadProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'episode-uploads'

export function UploadProvider({ children }: UploadProviderProps) {
  const { user, isAuthenticated } = useAuth()
  const [uploads, setUploads] = useState<UploadState[]>([])

  const storageKey = useMemo(() => {
    return user?.email ? `${STORAGE_KEY}-${user.email}` : STORAGE_KEY
  }, [user?.email])

  useEffect(() => {
    if (!isAuthenticated) {
      setUploads([])
      return
    }

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsedUploads = JSON.parse(stored) as UploadState[]
        const now = new Date().getTime()
        const oneDayAgo = now - 24 * 60 * 60 * 1000

        const validUploads = parsedUploads.filter(upload => {
          if (upload.status === 'completed' || upload.status === 'failed') {
            const completedAt = upload.completedAt ? new Date(upload.completedAt).getTime() : 0
            return completedAt > oneDayAgo
          }
          return true
        })

        setUploads(validUploads)

        if (validUploads.length !== parsedUploads.length) {
          localStorage.setItem(storageKey, JSON.stringify(validUploads))
        }
      }
    } catch (error) {
      console.error('Failed to load uploads from storage:', error)
      setUploads([])
    }
  }, [isAuthenticated, storageKey])

  useEffect(() => {
    if (isAuthenticated && uploads.length > 0) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(uploads))
      } catch (error) {
        console.error('Failed to save uploads to storage:', error)
      }
    }
  }, [uploads, isAuthenticated, storageKey])

  const addUpload = useCallback((upload: Omit<UploadState, 'id' | 'startedAt'>): string => {
    const id = `upload-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const newUpload: UploadState = {
      ...upload,
      id,
      startedAt: new Date().toISOString(),
    }
    setUploads(prev => [...prev, newUpload])
    return id
  }, [])

  const updateUpload = useCallback((id: string, updates: Partial<UploadState>) => {
    setUploads(prev => prev.map(upload => {
      if (upload.id === id) {
        const updated = { ...upload, ...updates }
        if ((updates.status === 'completed' || updates.status === 'failed') && !updated.completedAt) {
          updated.completedAt = new Date().toISOString()
        }
        return updated
      }
      return upload
    }))
  }, [])

  const removeUpload = useCallback((id: string) => {
    setUploads(prev => prev.filter(upload => upload.id !== id))
  }, [])

  const getEpisodeUploads = useCallback((episodeId: string): UploadState[] => {
    return uploads.filter(upload => upload.episodeId === episodeId)
  }, [uploads])

  const activeUploadsCount = useMemo(() => {
    return uploads.filter(upload =>
      upload.status === 'pending' || upload.status === 'uploading' || upload.status === 'processing'
    ).length
  }, [uploads])

  return (
    <UploadContext.Provider
      value={{
        uploads,
        addUpload,
        updateUpload,
        removeUpload,
        getEpisodeUploads,
        activeUploadsCount,
      }}
    >
      {children}
    </UploadContext.Provider>
  )
}
