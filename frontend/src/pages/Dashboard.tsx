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

  if (loading) {
    return <LoadingSpinner variant="page" />
  }

  if (!profile) {
    return null
  }

  return (
    <>
      <DashboardLayout onCreateEpisode={handleCreateEpisode}>
        <div className="mb-8 bg-gradient-to-r from-primary to-primary-dark text-black rounded-xl p-8 shadow-lg">
          <h1 className="text-3xl font-bold mb-2">
            Welcome back, {profile.name}
          </h1>
          <p className="text-black/70">
            Manage your episodes and create engaging content
          </p>
        </div>

        <UpcomingEpisodes onCreateEpisode={handleCreateEpisode} />
        <PreviousEpisodes />
      </DashboardLayout>

      <CreateEpisodeModal
        isOpen={isCreateModalOpen}
        onClose={handleCloseModal}
      />
    </>
  )
}

export default Dashboard
