import { useLocation } from 'react-router-dom'

export interface SidebarLabel {
  id: string
  label: string
  color: 'red' | 'orange' | 'green' | 'blue' | 'purple' | 'gray'
  count?: number
}

export function useSidebarLabels(): SidebarLabel[] {
  const location = useLocation()

  if (location.pathname === '/' || location.pathname.startsWith('/dashboard')) {
    return []
  }

  if (location.pathname.startsWith('/episodes')) {
    return [
      { id: 'draft', label: 'Draft', color: 'gray', count: 4 },
      { id: 'processing', label: 'Processing', color: 'orange', count: 2 },
      { id: 'published', label: 'Published', color: 'green', count: 15 },
      { id: 'archived', label: 'Archived', color: 'purple', count: 8 },
    ]
  }

  if (location.pathname.startsWith('/teams')) {
    return [
      { id: 'active', label: 'Active Members', color: 'green', count: 5 },
      { id: 'pending', label: 'Pending Invites', color: 'orange', count: 2 },
      { id: 'inactive', label: 'Inactive', color: 'gray', count: 1 },
    ]
  }

  return []
}
