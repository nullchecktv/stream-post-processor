import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { episodesApi } from '../api/episodes'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../contexts/ToastContext'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { PlanForm, type PlanFormData } from '../components/episodes/PlanForm'
import { PlanRecommendations } from '../components/episodes/PlanRecommendations'
import { DetailedOutline } from '../components/episodes/DetailedOutline'
import { MermaidDiagram } from '../components/episodes/MermaidDiagram'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import type { EpisodePlan } from '../types'

function EpisodePlanPage() {
  const { id } = useParams<{ id: string }>()
  const { showToast } = useToast()
  const [episodePlan, setEpisodePlan] = useState<EpisodePlan | null>(null)
  const [loading, setLoading] = useState(true)
  const [isPlanSubmitting, setIsPlanSubmitting] = useState(false)
  const [showPlanForm, setShowPlanForm] = useState(false)
  const [activeTab, setActiveTab] = useState<'flow' | 'outline'>('flow')

  usePageTitle('Episode Plan')

  const fetchPlan = useCallback(async () => {
    if (!id) return

    setLoading(true)
    try {
      const data = await episodesApi.getPlan(id)
      console.log('Plan page: Fetched plan data', {
        hasPlan: !!data.plan,
        hasRecommendations: !!data.recommendations,
        data
      })
      setEpisodePlan(data)
    } catch (err) {
      console.error('Failed to fetch plan:', err)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchPlan()
  }, [fetchPlan])

  useEffect(() => {
    if (!id) return

    const handleRefresh = (event: Event) => {
      const customEvent = event as CustomEvent
      const message = customEvent.detail?.message
      console.log('Plan page: refreshPageContent event received', message)

      if (message?.type === 'plan_generated') {
        const urlMatch = message.url?.match(/\/episodes\/([^/]+)\/plan/)
        const messageEpisodeId = urlMatch?.[1]
        console.log('Plan page: Extracted episode ID from URL:', messageEpisodeId, 'Current ID:', id)

        if (messageEpisodeId === id) {
          console.log('Plan page: Fetching plan due to plan_generated event')
          fetchPlan()
        }
      } else if (!message) {
        fetchPlan()
      }
    }

    window.addEventListener('refreshPageContent', handleRefresh as EventListener)

    return () => {
      window.removeEventListener('refreshPageContent', handleRefresh as EventListener)
    }
  }, [id, fetchPlan])

  const handlePlanSubmit = async (data: PlanFormData) => {
    if (!id) return

    setIsPlanSubmitting(true)

    try {
      const result = episodePlan?.plan
        ? await episodesApi.updatePlan(id, data)
        : await episodesApi.createPlan(id, data)

      setEpisodePlan(result)
      setShowPlanForm(false)
    } catch (err) {
      console.error('Failed to save plan:', err)
      showToast('Failed to save plan. Please try again.', 'error')
    } finally {
      setIsPlanSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-[var(--space-6)]">
        <Breadcrumb />
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
          <LoadingSpinner />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-[var(--space-6)]">
      <Breadcrumb />

      {!episodePlan?.plan && !showPlanForm && (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
          <div className="text-center py-[var(--space-8)]">
            <svg
              className="mx-auto h-12 w-12 text-[var(--color-text-muted)]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <h3 className="mt-[var(--space-4)] text-[length:var(--text-lg)] font-medium text-[var(--color-text-primary)]">No plan yet</h3>
            <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
              Create a plan to organize your episode and get AI-powered recommendations.
            </p>
            <button
              onClick={() => setShowPlanForm(true)}
              className="mt-[var(--space-6)] inline-flex items-center px-[var(--space-4)] py-[var(--space-2)] border border-transparent text-[length:var(--text-sm)] font-medium rounded-[var(--radius-md)] text-[var(--color-text-on-accent)] bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--color-focus)] transition-colors duration-[var(--duration-fast)]"
            >
              Create Plan
            </button>
          </div>
        </div>
      )}

      {(showPlanForm || episodePlan?.plan) && (
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
          <div className="flex items-center justify-between mb-[var(--space-6)]">
            <h2 className="text-[length:var(--text-xl)] font-semibold text-[var(--color-text-primary)]">
              {episodePlan?.plan ? 'Episode Plan' : 'Create Episode Plan'}
            </h2>
            {episodePlan?.plan && !showPlanForm && (
              <button
                onClick={() => setShowPlanForm(true)}
                className="text-[length:var(--text-sm)] text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors duration-[var(--duration-fast)]"
              >
                Edit Plan
              </button>
            )}
          </div>

          {showPlanForm ? (
            <PlanForm
              plan={episodePlan?.plan}
              onSubmit={handlePlanSubmit}
              onCancel={episodePlan?.plan ? () => setShowPlanForm(false) : undefined}
              isSubmitting={isPlanSubmitting}
            />
          ) : (
            episodePlan?.plan && (
              <div className="space-y-[var(--space-4)]">
                <div>
                  <h3 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-[var(--space-2)]">Objectives</h3>
                  <ul className="text-[length:var(--text-sm)] text-[var(--color-text-primary)] bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] p-[var(--space-3)] space-y-1">
                    {episodePlan.plan.objectives.map((objective, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[var(--color-accent)] mr-[var(--space-2)]">•</span>
                        <span>{objective}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-[var(--space-2)]">Concepts</h3>
                  <ul className="text-[length:var(--text-sm)] text-[var(--color-text-primary)] bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] p-[var(--space-3)] space-y-1">
                    {episodePlan.plan.concepts.map((concept, index) => (
                      <li key={index} className="flex items-start">
                        <span className="text-[var(--color-accent)] mr-[var(--space-2)]">•</span>
                        <span>{concept}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                {episodePlan.plan.notes && (
                  <div>
                    <h3 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-[var(--space-2)]">Notes</h3>
                    <p className="text-[length:var(--text-sm)] text-[var(--color-text-primary)] whitespace-pre-wrap bg-[var(--color-surface-raised)] rounded-[var(--radius-lg)] p-[var(--space-3)]">
                      {episodePlan.plan.notes}
                    </p>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {episodePlan?.plan && !showPlanForm && (
        <>
          <PlanRecommendations
            recommendations={episodePlan.recommendations}
            isLoading={!episodePlan.recommendations}
          />

          {episodePlan.recommendations?.detailedOutline && episodePlan.recommendations?.suggestedFlow && (
            <>
              <div className="hidden lg:block bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
                <div className="grid grid-cols-2 gap-[var(--space-8)]">
                  <div>
                    <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-[var(--space-4)]">
                      Detailed Episode Outline
                    </h3>
                    <div className="space-y-[var(--space-6)]">
                      {episodePlan.recommendations.detailedOutline.map((section, index) => (
                        <div
                          key={index}
                          className="border-l-4 border-[var(--color-accent)] pl-[var(--space-4)] py-[var(--space-2)]"
                        >
                          <div className="flex items-start justify-between mb-[var(--space-2)]">
                            <h4 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                              {index + 1}. {section.section}
                            </h4>
                            <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)] font-medium whitespace-nowrap ml-[var(--space-4)]">
                              {section.duration}
                            </span>
                          </div>

                          <div className="space-y-[var(--space-3)]">
                            <div>
                              <h5 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                                Talking Points:
                              </h5>
                              <ul className="list-disc list-inside space-y-1">
                                {section.talkingPoints.map((point, pointIndex) => (
                                  <li key={pointIndex} className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                                    {point}
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {section.demoArtifacts && section.demoArtifacts.length > 0 && (
                              <div>
                                <h5 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                                  Demo Artifacts:
                                </h5>
                                <ul className="list-disc list-inside space-y-1">
                                  {section.demoArtifacts.map((artifact, artifactIndex) => (
                                    <li key={artifactIndex} className="text-[length:var(--text-sm)] text-[var(--color-accent)]">
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

                    <div className="mt-[var(--space-6)] pt-[var(--space-4)] border-t border-[var(--color-border)]">
                      <div className="flex items-center justify-between text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                        <span>Total Sections: {episodePlan.recommendations.detailedOutline.length}</span>
                        <span>
                          Estimated Duration:{' '}
                          {episodePlan.recommendations.detailedOutline.reduce((total, section) => {
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

                  <div className="border-l border-[var(--color-border)] pl-[var(--space-8)]">
                    <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-[var(--space-4)] text-center">
                      Suggested Episode Flow
                    </h3>
                    <div className="flex items-center justify-center">
                      <MermaidDiagram diagram={episodePlan.recommendations.suggestedFlow} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:hidden">
                <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)]">
                  <div className="border-b border-[var(--color-border)]">
                    <nav className="flex -mb-px">
                      <button
                        onClick={() => setActiveTab('flow')}
                        className={`flex-1 py-[var(--space-4)] px-1 text-center border-b-2 font-medium text-[length:var(--text-sm)] transition-colors duration-[var(--duration-fast)] ${
                          activeTab === 'flow'
                            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
                        }`}
                      >
                        Episode Flow
                      </button>
                      <button
                        onClick={() => setActiveTab('outline')}
                        className={`flex-1 py-[var(--space-4)] px-1 text-center border-b-2 font-medium text-[length:var(--text-sm)] transition-colors duration-[var(--duration-fast)] ${
                          activeTab === 'outline'
                            ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                            : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:border-[var(--color-border)]'
                        }`}
                      >
                        Detailed Outline
                      </button>
                    </nav>
                  </div>
                  <div className="p-[var(--space-6)]">
                    {activeTab === 'flow' ? (
                      <>
                        <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-[var(--space-4)]">
                          Suggested Episode Flow
                        </h3>
                        <MermaidDiagram diagram={episodePlan.recommendations.suggestedFlow} />
                      </>
                    ) : (
                      <>
                        <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-[var(--space-4)]">
                          Detailed Episode Outline
                        </h3>
                        <div className="space-y-[var(--space-6)]">
                          {episodePlan.recommendations.detailedOutline.map((section, index) => (
                            <div
                              key={index}
                              className="border-l-4 border-[var(--color-accent)] pl-[var(--space-4)] py-[var(--space-2)]"
                            >
                              <div className="flex items-start justify-between mb-[var(--space-2)]">
                                <h4 className="text-[length:var(--text-base)] font-semibold text-[var(--color-text-primary)]">
                                  {index + 1}. {section.section}
                                </h4>
                                <span className="text-[length:var(--text-sm)] text-[var(--color-text-muted)] font-medium whitespace-nowrap ml-[var(--space-4)]">
                                  {section.duration}
                                </span>
                              </div>

                              <div className="space-y-[var(--space-3)]">
                                <div>
                                  <h5 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                                    Talking Points:
                                  </h5>
                                  <ul className="list-disc list-inside space-y-1">
                                    {section.talkingPoints.map((point, pointIndex) => (
                                      <li key={pointIndex} className="text-[length:var(--text-sm)] text-[var(--color-text-secondary)]">
                                        {point}
                                      </li>
                                    ))}
                                  </ul>
                                </div>

                                {section.demoArtifacts && section.demoArtifacts.length > 0 && (
                                  <div>
                                    <h5 className="text-[length:var(--text-sm)] font-medium text-[var(--color-text-secondary)] mb-1">
                                      Demo Artifacts:
                                    </h5>
                                    <ul className="list-disc list-inside space-y-1">
                                      {section.demoArtifacts.map((artifact, artifactIndex) => (
                                        <li key={artifactIndex} className="text-[length:var(--text-sm)] text-[var(--color-accent)]">
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
                      </>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {episodePlan.recommendations?.detailedOutline && !episodePlan.recommendations?.suggestedFlow && (
            <DetailedOutline outline={episodePlan.recommendations.detailedOutline} />
          )}

          {episodePlan.recommendations?.suggestedFlow && !episodePlan.recommendations?.detailedOutline && (
            <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-[var(--space-6)]">
              <h3 className="text-[length:var(--text-lg)] font-semibold text-[var(--color-text-primary)] mb-[var(--space-4)]">
                Suggested Episode Flow
              </h3>
              <MermaidDiagram diagram={episodePlan.recommendations.suggestedFlow} />
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default EpisodePlanPage
