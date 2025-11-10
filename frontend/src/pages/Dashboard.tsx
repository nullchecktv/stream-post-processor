import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { DashboardLayout } from '../components/dashboard/DashboardLayout'
import { UpcomingEpisodes } from '../components/dashboard/UpcomingEpisodes'
import { PreviousEpisodes } from '../components/dashboard/PreviousEpisodes'
import { CreateEpisodeModal } from '../components/dashboard/CreateEpisodeModal'
import { LoadingSpinner } from '../components/common/LoadingSpinner'

function Dashboard() {
  usePageTitle('Dashboard')
  const navigate = useNavigate()
  const { profile, loading } = useUser()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    if (!loading && !profile) {
      navigate('/onboarding')
    }
  }, [loading, profile, navigate])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
        e.preventDefault()
        setIsCreateModalOpen(true)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleCreateEpisode = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
  }

  if (!profile && !loading) {
    return null
  }

  return (
    <div className="relative min-h-full">
      {loading && <LoadingSpinner variant="page" />}
      {profile && (
        <DashboardLayout onCreateEpisode={handleCreateEpisode}>
          <div className="mb-8 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center mr-3">
                <svg className="w-5 h-5" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                  <path d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                  <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Welcome back, {profile.name}</h1>
                <p className="text-sm text-gray-600 mt-0.5">Ready to create something amazing today?</p>
              </div>
            </div>
          </div>

          <UpcomingEpisodes onCreateEpisode={handleCreateEpisode} />
          <PreviousEpisodes />
        </DashboardLayout>
      )}

      {profile && (
        <CreateEpisodeModal
          isOpen={isCreateModalOpen}
          onClose={handleCloseModal}
        />
      )}
    </div>
  )
}

export default Dashboard
