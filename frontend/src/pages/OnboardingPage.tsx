import { useNavigate } from 'react-router-dom'
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard'
import { ProfileStep } from '../components/onboarding/ProfileStep'
import { TeamStep } from '../components/onboarding/TeamStep'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'

function OnboardingPage() {
  usePageTitle('Get Started')
  const navigate = useNavigate()
  const { refreshProfile } = useUser()

  const handleProfileComplete = async () => {
    await refreshProfile()
  }

  const handleTeamComplete = async () => {
    await refreshProfile()
    navigate('/')
  }

  const handleTeamSkip = () => {
    navigate('/')
  }

  const handleWizardComplete = () => {
    navigate('/')
  }

  const steps = [
    {
      id: 'profile',
      title: 'Set Up Your Profile',
      component: <ProfileStep onComplete={handleProfileComplete} />,
    },
    {
      id: 'team',
      title: 'Create a Team (Optional)',
      component: <TeamStep onComplete={handleTeamComplete} onSkip={handleTeamSkip} />,
    },
  ]

  return <OnboardingWizard steps={steps} onComplete={handleWizardComplete} />
}

export default OnboardingPage
