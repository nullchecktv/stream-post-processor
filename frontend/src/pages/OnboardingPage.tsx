import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { WelcomeStep } from '../components/onboarding/WelcomeStep'
import { ProfileStep } from '../components/onboarding/ProfileStep'
import { InvitationsStep } from '../components/onboarding/InvitationsStep'
import { TeamStep } from '../components/onboarding/TeamStep'
import { useUser } from '../hooks/useUser'
import { useNotifications } from '../hooks/useNotifications'
import { usePageTitle } from '../hooks/usePageTitle'

type OnboardingStep = 'welcome' | 'profile' | 'invitations' | 'team' | 'complete'

function OnboardingPage() {
  usePageTitle('Get Started')
  const navigate = useNavigate()
  const { refreshProfile } = useUser()
  const { notifications, loading: notificationsLoading } = useNotifications()
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome')

  const invitationNotifications = notifications.filter(
    n => n.type === 'team_invitation' && !n.isRead
  )
  const hasInvitations = invitationNotifications.length > 0

  useEffect(() => {
    if (currentStep === 'complete') {
      navigate('/')
    }
  }, [currentStep, navigate])

  const handleWelcomeContinue = () => {
    setCurrentStep('profile')
  }

  const handleProfileComplete = async () => {
    await refreshProfile()
    if (!notificationsLoading && hasInvitations) {
      setCurrentStep('invitations')
    } else {
      setCurrentStep('team')
    }
  }

  const handleInvitationsComplete = () => {
    setCurrentStep('team')
  }

  const handleInvitationsSkip = () => {
    setCurrentStep('team')
  }

  const handleTeamComplete = async () => {
    await refreshProfile()
    setCurrentStep('complete')
  }

  const handleTeamSkip = () => {
    setCurrentStep('complete')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-lg p-6 sm:p-8">
          {currentStep === 'welcome' && (
            <WelcomeStep onContinue={handleWelcomeContinue} />
          )}

          {currentStep === 'profile' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Set Up Your Profile</h2>
                <p className="text-gray-600 mt-2">
                  Tell us a bit about yourself to personalize your experience
                </p>
              </div>
              <ProfileStep onComplete={handleProfileComplete} />
            </div>
          )}

          {currentStep === 'invitations' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Team Invitations</h2>
                <p className="text-gray-600 mt-2">
                  You have pending invitations to join teams
                </p>
              </div>
              <InvitationsStep
                onComplete={handleInvitationsComplete}
                onSkip={handleInvitationsSkip}
              />
            </div>
          )}

          {currentStep === 'team' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900">
                  Create a Team (Optional)
                </h2>
                <p className="text-gray-600 mt-2">
                  Collaborate with others or continue in individual mode
                </p>
              </div>
              <TeamStep onComplete={handleTeamComplete} onSkip={handleTeamSkip} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default OnboardingPage
