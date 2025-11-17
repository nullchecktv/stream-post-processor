import { useState } from 'react'

interface SpeakerMatch {
  transcriptName: string
  episodeName: string
  confidence: 'high' | 'medium' | 'low'
}

interface SpeakerAnalysis {
  matched: SpeakerMatch[]
  unmatched: string[]
  suggestion: string | null
}

interface SpeakerDiscrepancyModalProps {
  isOpen: boolean
  onClose: () => void
  speakerAnalysis: SpeakerAnalysis
  onUpdateSpeakers: (speakers: string[]) => Promise<void>
}

export function SpeakerDiscrepancyModal({
  isOpen,
  onClose,
  speakerAnalysis,
  onUpdateSpeakers
}: SpeakerDiscrepancyModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  const hasUnmatched = speakerAnalysis.unmatched.length > 0
  const hasLowConfidence = speakerAnalysis.matched.some(m => m.confidence === 'low')

  const handleAcceptSuggestion = async () => {
    setIsSubmitting(true)
    try {
      const existingSpeakers = speakerAnalysis.matched.map(m => m.episodeName)
      const newSpeakers = [...new Set([...existingSpeakers, ...speakerAnalysis.unmatched])]
      await onUpdateSpeakers(newSpeakers)
      onClose()
    } catch (error) {
      console.error('Failed to update speakers:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black bg-opacity-25 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Speaker Detection Results
              </h2>
              <p className="mt-1 text-sm text-gray-600">
                We found some differences between your configured speakers and the transcript
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            {hasLowConfidence && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-900">Low Confidence Matches Detected</p>
                    <p className="text-sm text-yellow-800 mt-1">
                      Some speaker matches have low confidence. Please review them carefully before accepting.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {speakerAnalysis.matched.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Matched Speakers</h3>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
                  {speakerAnalysis.matched.map((match, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-gray-900">
                          <span className="font-medium">{match.transcriptName}</span>
                          {' → '}
                          <span className="font-medium">{match.episodeName}</span>
                        </span>
                      </div>
                      {match.confidence === 'low' && (
                        <span className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded">
                          Low confidence
                        </span>
                      )}
                      {match.confidence === 'medium' && (
                        <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                          Medium confidence
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {hasUnmatched && (
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Unmatched Speakers</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 space-y-2">
                  {speakerAnalysis.unmatched.map((label, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <svg className="w-5 h-5 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span className="text-gray-900">
                        <span className="font-medium">{label}</span>
                        <span className="text-gray-600"> (not in episode speakers)</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {speakerAnalysis.suggestion && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Suggestion</h3>
                <p className="text-sm text-blue-800">{speakerAnalysis.suggestion}</p>
              </div>
            )}
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {hasUnmatched ? 'Keep Current Speakers' : 'Close'}
            </button>
            {hasUnmatched && (
              <button
                onClick={handleAcceptSuggestion}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Updating...' : 'Add Missing Speakers'}
              </button>
            )}
            {!hasUnmatched && hasLowConfidence && (
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-white bg-yellow-600 rounded-lg hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500 transition-colors"
              >
                Review Manually
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
