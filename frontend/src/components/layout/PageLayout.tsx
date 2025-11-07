import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { TopHeader } from './TopHeader'
import { useSidebar } from '../../hooks/useSidebar'

export function PageLayout() {
  const { isCollapsed } = useSidebar()

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <TopHeader />
      <Sidebar />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ease-in-out pt-16 ${
          isCollapsed ? 'md:ml-16' : 'md:ml-60'
        }`}
      >
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
