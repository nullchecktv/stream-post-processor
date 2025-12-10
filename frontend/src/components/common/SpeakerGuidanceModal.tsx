import { Modal } from './Modal'

interface SpeakerGuidanceModalProps {
  isOpen: boolean
  onClose: () => void
  onDismiss?: () => void
}

export function SpeakerGuidanceModal({ isOpen, onClose, onDismiss }: SpeakerGuidanceModalProps) {
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss()
    }
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Speaker Labels" size="lg">
      <div className="space-y-5">
        <div>
          <p className="text-sm text-gray-700">
            Label who's speaking in your transcript so clips show the right camera angle for each person.
          </p>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Do I need this?</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span><strong>One camera:</strong> No, skip this</span>
            </li>
            <li className="flex items-start gap-2">
              <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span><strong>Multiple cameras:</strong> Yes, add speaker labels</span>
            </li>
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">How to add labels</h3>
          <p className="text-sm text-gray-700 mb-3">
            Start each line with the speaker's name and a colon:
          </p>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <pre className="text-xs text-gray-800 font-mono overflow-x-auto">
{`1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough

2
00:00:28,000 --> 00:00:30,500
Andres: We try it out live

3
00:00:31,000 --> 00:00:35,200
Allen: And that's when the magic happens`}
            </pre>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          {onDismiss && (
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              Don't show again
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark rounded focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          >
            Got it
          </button>
        </div>
      </div>
    </Modal>
  )
}
