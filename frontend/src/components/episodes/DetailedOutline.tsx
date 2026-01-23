import type { OutlineSection } from '../../types'

interface DetailedOutlineProps {
  outline: OutlineSection[]
}

export function DetailedOutline({ outline }: DetailedOutlineProps) {
  return (
    <div className="bg-[var(--color-surface)] rounded-lg shadow-sm border border-[var(--color-border)] p-6">
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">
        Detailed Episode Outline
      </h3>
      <div className="space-y-6">
        {outline.map((section, index) => (
          <div
            key={index}
            className="border-l-4 border-[var(--color-accent)] pl-4 py-2"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="text-base font-semibold text-[var(--color-text-primary)]">
                {index + 1}. {section.section}
              </h4>
              <span className="text-sm text-[var(--color-text-muted)] font-medium whitespace-nowrap ml-4">
                {section.duration}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                  Talking Points:
                </h5>
                <ul className="list-disc list-inside space-y-1">
                  {section.talkingPoints.map((point, pointIndex) => (
                    <li key={pointIndex} className="text-sm text-[var(--color-text-secondary)]">
                      {point}
                    </li>
                  ))}
                </ul>
              </div>

              {section.demoArtifacts && section.demoArtifacts.length > 0 && (
                <div>
                  <h5 className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
                    Demo Artifacts:
                  </h5>
                  <ul className="list-disc list-inside space-y-1">
                    {section.demoArtifacts.map((artifact, artifactIndex) => (
                      <li key={artifactIndex} className="text-sm text-[var(--color-accent)]">
                        {artifact}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-[var(--color-border)]">
        <div className="flex items-center justify-between text-sm text-[var(--color-text-secondary)]">
          <span>Total Sections: {outline.length}</span>
          <span>
            Estimated Duration:{' '}
            {outline.reduce((total, section) => {
              const match = section.duration.match(/(\d+)-?(\d+)?/)
              if (match) {
                const min = parseInt(match[1])
                const max = match[2] ? parseInt(match[2]) : min
                return total + (min + max) / 2
              }
              return total
            }, 0).toFixed(0)}{' '}
            minutes
          </span>
        </div>
      </div>
    </div>
  )
}
