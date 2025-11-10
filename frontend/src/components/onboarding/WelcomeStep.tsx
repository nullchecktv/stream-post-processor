import { useUser } from '../../hooks/useUser'

interface WelcomeStepProps {
  onContinue: () => void
}

export function WelcomeStep({ onContinue }: WelcomeStepProps) {
  const { profile } = useUser()

  return (
    <div className="space-y-6 text-center">
      <div className="inline-flex items-center justify-center w-20 h-20 bg-primary bg-opacity-10 rounded-full mb-4">
        <svg
          className="w-12 h-12 text-primary"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5"
          />
        </svg>
      </div>

      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome{profile?.name ? `, ${profile.name}` : ''}!
        </h2>
        <p className="text-lg text-gray-600">
          Let's get you set up to start transforming your livestreams into engaging clips
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-6 text-left space-y-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            1
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Complete Your Profile</h3>
            <p className="text-sm text-gray-600">
              Add your name and preferences to personalize your experience
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            2
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Review Team Invitations</h3>
            <p className="text-sm text-gray-600">
              Accept or decline any pending team invitations
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
            3
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Create or Join a Team</h3>
            <p className="text-sm text-gray-600">
              Collaborate with others or work individually
            </p>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="w-full px-6 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
        style={{ backgroundColor: '#5B8C5A' }}
      >
        Get Started
      </button>
    </div>
  )
}
