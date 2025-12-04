import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast} from '../hooks/useToast'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Breadcrumb } from '../components/common/Breadcrumb'
import type { Team } from '../types'

function TeamDetailPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { teams, loading, leaveTeam } = useTeams()
  const { profile } = useUser()
  const { showToast } = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [leaving, setLeaving] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  usePageTitle(team?.name || 'Team Details')

  useEffect(() => {
    if (!loading && teamId) {
      const foundTeam = teams.find(t => t.id === teamId)
      if (foundTeam) {
        setTeam(foundTeam)
      } else {
        navigate('/teams')
      }
    }
  }, [teamId, teams, loading, navigate])

  const getUserRole = (): string => {
    if (!team || !profile) return 'member'
    const membership = profile.teams.find(m => m.teamId === team.id)
    return membership?.role || 'member'
  }

  const getMemberCount = (): number => {
    if (!team || !profile) return 0
    const membership = profile.teams.find(m => m.teamId === team.id)
    return membership ? 1 : 0
  }

  const isOwner = getUserRole() === 'owner'

  const handleLeaveTeam = async () => {
    if (!team) return

    try {
      setLeaving(true)
      await leaveTeam(team.id)
      navigate('/teams')
    } catch (err) {
      console.error('Failed to leave team:', err)
      showToast('Failed to leave team. Please try again.', 'error')
    } finally {
      setLeaving(false)
      setShowLeaveConfirm(false)
    }
  }

  const role = getUserRole()
  const memberCount = getMemberCount()

  return (
    <div className="relative min-h-full">
      {(loading || !team) && <LoadingSpinner variant="page" />}
      {team && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
          <Breadcrumb />
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
              <div className="flex-1">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{team.name}</h1>
              <span className={`px-3 py-1 rounded-full text-xs sm:text-sm font-medium self-start ${
                role === 'owner' ? 'bg-primary text-white' :
                role === 'administrator' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </span>
            </div>
            {team.description && (
              <p className="text-sm sm:text-base text-gray-600 mt-2">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Members</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">{memberCount}</p>
            </div>
            <div className="bg-primary/10 rounded-full p-2 sm:p-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-primary" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Episodes</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="bg-blue-100 rounded-full p-2 sm:p-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-gray-600">Clips</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mt-1">0</p>
            </div>
            <div className="bg-green-100 rounded-full p-2 sm:p-3">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Team Management</h2>
          <div className="space-y-3">
            <Button
              onClick={() => navigate(`/teams/${team.id}/members`)}
              variant="text"
              className="w-full justify-start text-sm sm:text-base"
            >
              <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              View Members
            </Button>

            {isOwner && (
              <Button
                onClick={() => navigate(`/teams/${team.id}/settings/general`)}
                variant="text"
                className="w-full justify-start text-sm sm:text-base"
              >
                <svg className="w-5 h-5 mr-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Team Settings
              </Button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
          <div className="text-center py-6 sm:py-8 text-gray-500">
            <svg className="mx-auto h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mb-2" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs sm:text-sm">No recent activity</p>
          </div>
        </div>
      </div>

      {!isOwner && (
        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4">Leave Team</h2>
          <p className="text-sm sm:text-base text-gray-600 mb-4">
            If you leave this team, you will lose access to all team content and will need to be re-invited to rejoin.
          </p>

          {!showLeaveConfirm ? (
            <Button
              onClick={() => setShowLeaveConfirm(true)}
              variant="danger"
              className="w-full sm:w-auto"
            >
              Leave Team
            </Button>
          ) : (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm sm:text-base text-red-800 font-medium mb-3">
                Are you sure you want to leave this team?
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleLeaveTeam}
                  variant="danger"
                  loading={leaving}
                  className="w-full sm:w-auto"
                >
                  Yes, Leave Team
                </Button>
                <Button
                  onClick={() => setShowLeaveConfirm(false)}
                  variant="ghost"
                  disabled={leaving}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
        </div>
      )}
    </div>
  )
}

export default TeamDetailPage

