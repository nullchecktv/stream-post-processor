import { LoadingSpinner } from '../common/LoadingSpinner'

interface Recommendations {
  proposedTitle: string
  proposedDescription: string
  keyLearningMoments: string[]
  generatedAt: string
}

interface PlanRecommendationsProps {
  recommendations: Recommendations | null
  isLoading?: boolean
}

export function PlanRecommendations({ recommendations, isLoading = false }: PlanRecommendationsProps) {
  if (isLoading) {
    return (
      <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6">
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <LoadingSpinner size="lg" />
            <p className="mt-4 text-sm text-[var(--color-text-secondary)]">
              AI is analyzing your plan and generating recommendations...
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!recommendations) {
    return (
      <div className="bg-[var(--color-surface-raised)] rounded-lg border border-[var(--color-border)] p-6">
        <div className="text-center py-8">
          <svg
            className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
            />
          </svg>
          <h3 className="mt-4 text-sm font-medium text-[var(--color-text-primary)]">No recommendations yet</h3>
          <p className="mt-2 text-sm text-[var(--color-text-muted)]">
            AI recommendations will appear here once your plan is processed.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[var(--color-surface)] rounded-lg border border-[var(--color-border)] p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-[var(--color-text-primary)]">AI Recommendations</h3>
        <span className="text-xs text-[var(--color-text-muted)]">
          Generated {new Date(recommendations.generatedAt).toLocaleString()}
        </span>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Proposed Title</h4>
        <p className="text-base text-[var(--color-text-primary)] bg-[var(--color-surface-raised)] rounded-lg p-3">
          {recommendations.proposedTitle}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Proposed Description</h4>
        <p className="text-sm text-[var(--color-text-primary)] bg-[var(--color-surface-raised)] rounded-lg p-3 whitespace-pre-wrap">
          {recommendations.proposedDescription}
        </p>
      </div>

      <div>
        <h4 className="text-sm font-medium text-[var(--color-text-primary)] mb-2">Key Learning Moments</h4>
        <ul className="space-y-2">
          {recommendations.keyLearningMoments.map((moment, index) => (
            <li key={index} className="flex items-start">
              <span className="flex-shrink-0 h-6 w-6 flex items-center justify-center rounded-full bg-[var(--color-accent-subtle)] text-[var(--color-accent)] text-xs font-medium mr-3">
                {index + 1}
              </span>
              <span className="text-sm text-[var(--color-text-primary)] pt-0.5">{moment}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
