import { Button } from '../common/Button'

interface SpeakerMatch {
  transcriptName: string
  episodeName: string
  confidence: 'high' | 'medium' | 'low'
}

interface SpeakerAnalysis {
  matched: SpeakerMatch[]
  unmatched: string[]
  suggestion?: string
}

interface SpeakerAnalysisDisplayProps {
  analysis: SpeakerAnalysis
  onAddSpeakers?: (speakers: string[]) => void
}

const confidenceColors = {
  high: 'bg-green-100 text-green-800 border-green-200',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  low: 'bg-orange-100 text-orange-800 border-orange-200',
}

const confidenceLabels = {
  high: 'High Confidence',
  medium: 'Medium Confidence',
  low: 'Low Confidence',
}

export function SpeakerAnalysisDisplay({ analysis, onAddSpeakers }: SpeakerAnalysisDisplayProps) {
  const hasMatches = analysis.matched.length > 0
  const hasUnmatched = analysis.unmatched.length > 0

  if (!hasMatches && !hasUnmatched) {
    return null
  }

  return (
    <div className="space-y-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-start gap-2">
        <svg
          className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-blue-900">Speaker Analysis</h3>
          <p className="text-sm text-blue-800 mt-1">
            AI has analyzed the transcript and identified speakers.
          </p>
        </div>
      </div>

      {hasMatches && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Matched Speakers</h4>
          <div className="space-y-2">
            {analysis.matched.map((match, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-white rounded border border-gray-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-700">
                      <span className="font-medium">{match.transcriptName}</span>
                      {' → '}
                      <span className="font-medium text-blue-700">{match.episodeName}</span>
                    </span>
                  </div>
                </div>
                <span
                  className={`text-xs px-2 py-1 rounded border ${
                    confidenceColors[match.confidence]
                  }`}
                >
                  {confidenceLabels[match.confidence]}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {hasUnmatched && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">Unmatched Speakers</h4>
          <p className="text-sm text-gray-600">
            These speakers were found in the transcript but don't match any episode speakers.
          </p>
          <div className="flex flex-wrap gap-2">
            {analysis.unmatched.map((speaker, index) => (
              <span
                key={index}
                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm border border-gray-300"
              >
                {speaker}
              </span>
            ))}
          </div>
          {analysis.suggestion && (
            <p className="text-sm text-gray-700 italic">{analysis.suggestion}</p>
          )}
          {onAddSpeakers && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => onAddSpeakers(analysis.unmatched)}
            >
              Add These Speakers to Episode
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
