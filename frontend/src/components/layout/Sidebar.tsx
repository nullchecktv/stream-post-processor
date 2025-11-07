import { useState, useEffect } from 'react'
import { ChevronRight, ChevronsLeft, ChevronsRight, Activity, User as UserIcon } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSidebar } from '../../hooks/useSidebar'
import { useUser } from '../../hooks/useUser'
import { useSidebarLabels } from '../../hooks/useSidebarLabels'
import { SidebarItem } from './SidebarItem'
import { SidebarSection } from './SidebarSection'
import { SidebarLabel } from './SidebarLabel'
import { Home, Video, Users, Settings } from 'lucide-react'

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { profile } = useUser()
  const navigate = useNavigate()
  const labels = useSidebarLabels()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) {
        setIsMobileOpen(false)
      }
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const handleBackdropClick = () => {
    if (isMobile) {
      setIsMobileOpen(false)
    }
  }

  const handleToggle = () => {
    if (isMobile) {
      setIsMobileOpen(!isMobileOpen)
    } else {
      toggleSidebar()
    }
  }

  const getInitials = (name?: string) => {
    if (!name) return '?'
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const activeTeam = profile?.teams?.find(t => t.teamId === profile.activeTeamId)

  const sidebarWidth = isCollapsed ? 'w-16' : 'w-60'
  const mobileClasses = isMobile
    ? isMobileOpen
      ? 'translate-x-0 w-70'
      : '-translate-x-full'
    : ''

  return (
    <>
      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={handleBackdropClick}
        />
      )}

      {isMobile && !isMobileOpen && (
        <button
          onClick={handleToggle}
          className="fixed top-4 left-4 z-30 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50"
          aria-label="Open menu"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      <aside
        className={`
          fixed left-0 top-16 bg-white border-r border-gray-200
          flex flex-col transition-all duration-300 ease-in-out z-40 group
          ${sidebarWidth} ${mobileClasses}
        `}
        style={{ height: 'calc(100vh - 4rem)' }}
        onMouseEnter={() => !isMobile && isCollapsed && setShowExpandButton(true)}
        onMouseLeave={() => !isMobile && isCollapsed && setShowExpandButton(false)}
      >
        {!isMobile && isCollapsed && showExpandButton && (
          <button
            onClick={toggleSidebar}
            className="absolute left-full top-1/2 -translate-y-1/2 bg-white border border-l-0 border-gray-200 rounded-r-lg px-1.5 py-8 hover:bg-gray-50 transition-all shadow-md z-50"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4 text-gray-600" />
          </button>
        )}

        {activeTeam && (
          <div className={`py-4 border-b border-gray-200 ${isCollapsed ? 'flex justify-center' : 'px-4'}`}>
            {isCollapsed ? (
              <button
                onClick={() => navigate(`/teams/${activeTeam.teamId}`)}
                className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0 hover:bg-gray-800 transition-colors"
              >
                {activeTeam.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => navigate(`/teams/${activeTeam.teamId}`)}
                className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <div className="w-10 h-10 bg-gray-900 text-white rounded-lg flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {activeTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {activeTeam.name}
                  </div>
                  <div className="text-xs text-gray-500">Team Workspace</div>
                </div>
                <ChevronsLeft
                  onClick={(e) => {
                    e.stopPropagation()
                    toggleSidebar()
                  }}
                  className="w-5 h-5 text-gray-400 hover:text-gray-600 cursor-pointer"
                />
              </button>
            )}
          </div>
        )}

        <div className="px-3 py-3">
          {isCollapsed ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-center p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="User profile"
            >
              <div
                className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: '#5B8C5A' }}
              >
                {getInitials(profile?.name)}
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <div
                className="w-9 h-9 rounded-full text-white flex items-center justify-center text-sm font-medium flex-shrink-0"
                style={{ backgroundColor: '#5B8C5A' }}
              >
                {getInitials(profile?.name)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {profile?.name || 'User'}
                </div>
              </div>
            </button>
          )}
        </div>

        <div className="px-3 py-2 border-b border-gray-200">
          {isCollapsed ? (
            <button
              className="w-full flex items-center justify-center py-3 text-gray-700 relative"
              aria-label="Activity"
            >
              <Activity className="w-7 h-7" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          ) : (
            <button
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-700"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6" />
                <span className="text-sm font-medium">Activity</span>
              </div>
              <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-semibold rounded-full">
                7
              </span>
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          <SidebarSection title="PAGES" isCollapsed={isCollapsed}>
            <SidebarItem
              to="/"
              icon={Home}
              label="Dashboard"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              to="/episodes"
              icon={Video}
              label="Episodes"
              isCollapsed={isCollapsed}
            />
            <SidebarItem
              to="/teams"
              icon={Users}
              label="Teams"
              isCollapsed={isCollapsed}
            />
          </SidebarSection>

          {labels.length > 0 && (
            <SidebarSection title="FILTERS" isCollapsed={isCollapsed}>
              {labels.map((label) => (
                <SidebarLabel
                  key={label.id}
                  label={label.label}
                  color={label.color}
                  count={label.count}
                  isCollapsed={isCollapsed}
                  onClick={() => console.log('Filter by:', label.id)}
                />
              ))}
            </SidebarSection>
          )}
        </nav>

        <div className="border-t border-gray-200 py-2">
          <SidebarItem
            to="/settings"
            icon={Settings}
            label="Settings"
            isCollapsed={isCollapsed}
          />
        </div>
      </aside>
    </>
  )
}
