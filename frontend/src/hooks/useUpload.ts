import { useContext } from 'react'
import { UploadContext, type UploadContextType } from '../contexts/UploadContext'

export function useUpload(): UploadContextType {
  const context = useContext(UploadContext)
  if (!context) {
    throw new Error('useUpload must be used within an UploadProvider')
  }
  return context
}
