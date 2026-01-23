import { useState, useEffect } from 'react'
import { ChevronRight, ChevronsLeft, ChevronsRight, Activity } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useSidebar } from '../../hooks/useSidebar'
import { useUser } from '../../hooks/useUser'
import { SidebarItem } from './SidebarItem'
import { SidebarSection } from './SidebarSection'
import { Video, Users, Settings, BarChart3, FileText, Upload, Film, MessageSquareQuote, Palette, BookOpen, PenTool } from 'lucide-react'
import { useNotifications } from '../../hooks/useNotifications'

export function Sidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar()
  const { profile } = useUser()
  const { unreadCount } = useNotifications()
  const navigate = useNavigate()
  const location = useLocation()
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)

  const isEpisodePage = location.pathname.startsWith('/episodes/')
  const episodeId = location.pathname.match(/\/episodes\/([^/]+)/)?.[1]

  const isTeamSettingsPage = location.pathname.match(/\/teams\/([^/]+)\/settings/)
  const teamId = location.pathname.match(/\/teams\/([^/]+)/)?.[1]

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
          className="fixed inset-0 bg-[var(--color-overlay)] z-40"
          onClick={handleBackdropClick}
        />
      )}

      {isMobile && !isMobileOpen && (
        <button
          onClick={handleToggle}
          className="fixed top-4 left-4 z-30 p-2 bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-md hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]"
          aria-label="Open menu"
        >
          <ChevronRight className="w-5 h-5 text-[var(--color-text-primary)]" />
        </button>
      )}

      <aside
        className={`
          fixed left-0 top-16 bg-[var(--color-surface)] border-r border-[var(--color-border)]
          flex flex-col transition-[width,transform] duration-300 ease-in-out z-40 group
          ${sidebarWidth} ${mobileClasses}
        `}
        style={{ height: 'calc(100vh - 4rem)' }}
        onMouseEnter={() => { if (!isMobile) setShowExpandButton(true) }}
        onMouseLeave={() => { if (!isMobile) setShowExpandButton(false) }}
        role="navigation"
        aria-label="Main navigation"
      >
        {!isMobile && isCollapsed && showExpandButton && (
          <button
            onClick={toggleSidebar}
            className="absolute left-full top-1/2 -translate-y-1/2 bg-[var(--color-surface)] border border-l-0 border-[var(--color-border)] rounded-r-[var(--radius-lg)] px-1.5 py-8 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)] shadow-md z-50"
            aria-label="Expand sidebar"
          >
            <ChevronsRight className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {!isMobile && !isCollapsed && showExpandButton && (
          <button
            onClick={toggleSidebar}
            className="absolute left-full top-1/2 -translate-y-1/2 bg-[var(--color-surface)] border border-l-0 border-[var(--color-border)] rounded-r-[var(--radius-lg)] px-1.5 py-8 hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)] shadow-md z-50"
            aria-label="Collapse sidebar"
          >
            <ChevronsLeft className="w-4 h-4 text-[var(--color-text-secondary)]" />
          </button>
        )}

        {activeTeam && (
          <div className={`py-4 border-b border-[var(--color-border)] ${isCollapsed ? 'flex justify-center' : 'px-4'}`}>
            {isCollapsed ? (
              <button
                onClick={() => navigate(`/teams/${activeTeam.teamId}`)}
                className="w-10 h-10 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-[var(--radius-lg)] flex items-center justify-center font-bold text-sm flex-shrink-0 hover:bg-[var(--color-accent-hover)] transition-colors duration-[var(--duration-fast)] cursor-pointer"
              >
                {activeTeam.name.charAt(0).toUpperCase()}
              </button>
            ) : (
              <button
                onClick={() => navigate(`/teams/${activeTeam.teamId}`)}
                className="w-full flex items-center gap-3 p-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] cursor-pointer"
              >
                <div className="w-10 h-10 bg-[var(--color-accent)] text-[var(--color-text-on-accent)] rounded-[var(--radius-lg)] flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {activeTeam.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                    {activeTeam.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">Team Workspace</div>
                </div>
              </button>
            )}
          </div>
        )}

        <div className="px-3 py-2">
          {isCollapsed ? (
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center justify-center p-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] cursor-pointer"
              aria-label="User profile"
            >
              <div
                className="w-9 h-9 rounded-full text-[var(--color-text-on-accent)] flex items-center justify-center text-sm font-medium flex-shrink-0 bg-[var(--color-accent)]"
              >
                {getInitials(profile?.name)}
              </div>
            </button>
          ) : (
            <button
              onClick={() => navigate('/profile')}
              className="w-full flex items-center gap-3 p-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] cursor-pointer"
            >
              <div
                className="w-9 h-9 rounded-full text-[var(--color-text-on-accent)] flex items-center justify-center text-sm font-medium flex-shrink-0 bg-[var(--color-accent)]"
              >
                {getInitials(profile?.name)}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                  {profile?.name || 'User'}
                </div>
                {profile?.email && (
                  <div className="text-xs text-[var(--color-text-muted)] truncate">{profile.email}</div>
                )}
              </div>
            </button>
          )}
        </div>

        <div className="px-3 py-2 border-b border-[var(--color-border)]">
          {isCollapsed ? (
            <button
              onClick={() => navigate('/activity')}
              className="w-full flex items-center justify-center py-3 text-[var(--color-text-primary)] relative cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)] rounded-[var(--radius-lg)] hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]"
              aria-label="Activity"
            >
              <Activity className="w-7 h-7" />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[var(--color-error)] rounded-full"></span>
              )}
            </button>
          ) : (
            <button
              onClick={() => navigate('/activity')}
              className="w-full flex items-center justify-between px-3 py-2 hover:bg-[var(--color-surface-hover)] rounded-[var(--radius-lg)] transition-colors duration-[var(--duration-fast)] text-[var(--color-text-primary)] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-focus)]"
            >
              <div className="flex items-center gap-3">
                <Activity className="w-6 h-6" />
                <span className="text-sm font-medium">Activity</span>
              </div>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-[var(--color-error)] text-[var(--color-text-on-accent)] text-xs font-semibold rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </div>

        <nav className="flex-1 py-4 overflow-y-auto" aria-label="Primary navigation">
          <SidebarSection title="PAGES" isCollapsed={isCollapsed}>
            <SidebarItem
              to="/"
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

          {isEpisodePage && episodeId && (
            <SidebarSection title="EPISODE" isCollapsed={isCollapsed}>
              <SidebarItem
                to={`/episodes/${episodeId}/overview`}
                icon={BarChart3}
                label="Overview"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/episodes/${episodeId}/plan`}
                icon={FileText}
                label="Plan"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/episodes/${episodeId}/uploads`}
                icon={Upload}
                label="Uploads"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/episodes/${episodeId}/clips`}
                icon={Film}
                label="Clips"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/episodes/${episodeId}/quotes`}
                icon={MessageSquareQuote}
                label="Quotes"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/episodes/${episodeId}/blog`}
                icon={BookOpen}
                label="Blog Post"
                isCollapsed={isCollapsed}
              />
            </SidebarSection>
          )}

          {isTeamSettingsPage && teamId && (
            <SidebarSection title="TEAM SETTINGS" isCollapsed={isCollapsed}>
              <SidebarItem
                to={`/teams/${teamId}/settings/general`}
                icon={Settings}
                label="General"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/teams/${teamId}/settings/branding`}
                icon={Palette}
                label="Branding"
                isCollapsed={isCollapsed}
              />
              <SidebarItem
                to={`/teams/${teamId}/settings/writing`}
                icon={PenTool}
                label="Writing"
                isCollapsed={isCollapsed}
              />
            </SidebarSection>
          )}
        </nav>

        <div className="border-t border-[var(--color-border)] py-2">
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
