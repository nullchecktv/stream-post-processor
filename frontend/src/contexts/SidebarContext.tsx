import { createContext, useEffect, useState, type ReactNode } from 'react'

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  collapseSidebar: () => void
  expandSidebar: () => void
}

export const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

interface SidebarProviderProps {
  children: ReactNode
}

const STORAGE_KEY = 'sidebarCollapsed'

export function SidebarProvider({ children }: SidebarProviderProps) {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored === 'true'
  })

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, String(isCollapsed))
  }, [isCollapsed])

  const toggleSidebar = () => setIsCollapsed(prev => !prev)
  const collapseSidebar = () => setIsCollapsed(true)
  const expandSidebar = () => setIsCollapsed(false)

  return (
    <SidebarContext.Provider
      value={{
        isCollapsed,
        toggleSidebar,
        collapseSidebar,
        expandSidebar,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}
