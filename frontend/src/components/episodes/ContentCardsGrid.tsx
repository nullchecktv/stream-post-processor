import { memo } from 'react'
import { PlanCard } from './PlanCard'
import { BlogPostCard } from './BlogPostCard'
import { ClipsCard } from './ClipsCard'
import { QuotesCard } from './QuotesCard'
import type { Plan, BlogData, ClipListView, Quote, WorkflowSteps } from '../../types'

interface ContentCardsGridProps {
  readonly episodeId: string
  readonly plan?: Plan | null
  readonly blog?: BlogData | null
  readonly clips?: ClipListView[]
  readonly quotes?: Quote[]
  readonly isLoading?: boolean
  readonly workflowSteps?: WorkflowSteps
  readonly errors?: {
    plan?: string | null
    blog?: string | null
    clips?: string | null
    quotes?: string | null
  }
}

function ContentCardsGridComponent({
  episodeId,
  plan,
  blog,
  clips = [],
  quotes = [],
  isLoading = false,
  workflowSteps,
  errors = {}
}: ContentCardsGridProps) {
  const isPlanProcessing = workflowSteps?.generatePlan?.status === 'In Progress'

  const transcriptComplete = workflowSteps?.uploadTranscript?.status === 'Completed'
  const tracksComplete = workflowSteps?.uploadTracks?.status === 'Completed'

  const isContentGenerating = workflowSteps?.generateContent?.status === 'In Progress'

  const isBlogProcessing = blog?.status === 'Processing' || isContentGenerating
  const areClipsProcessing = clips.some(clip => clip.status === 'Processing') || isContentGenerating
  const areQuotesProcessing = quotes.some(quote => quote.status === 'Processing') || isContentGenerating
  if (isLoading) {
    return (
      <section aria-label="Created content" aria-busy="true">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Created Content</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </section>
    )
  }

  const hasAnyContent = plan || blog?.content || clips.length > 0 || quotes.length > 0
  const hasAnyErrors = Object.values(errors).some(error => error)

  if (!hasAnyContent && !hasAnyErrors) {
    return (
      <section aria-label="Created content">
        <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Created Content</h2>
        <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-surface-raised)] rounded-full mb-4">
            <svg className="w-8 h-8 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">No Content Yet</h3>
          <p className="text-sm text-[var(--color-text-secondary)] max-w-md mx-auto">
            Complete the workflow steps above to generate plans, blog posts, clips, and quotes for this episode.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section aria-label="Created content">
      <h2 className="text-lg font-semibold text-[var(--color-text-primary)] mb-4">Created Content</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanCard
          episodeId={episodeId}
          plan={plan ?? null}
          error={errors.plan}
          isProcessing={isPlanProcessing}
        />
        <BlogPostCard
          episodeId={episodeId}
          blog={blog ?? null}
          error={errors.blog}
          isProcessing={isBlogProcessing}
        />
        <ClipsCard
          episodeId={episodeId}
          clips={clips}
          error={errors.clips}
          isProcessing={areClipsProcessing}
          canGenerate={transcriptComplete && tracksComplete}
        />
        <QuotesCard
          episodeId={episodeId}
          quotes={quotes}
          error={errors.quotes}
          isProcessing={areQuotesProcessing}
          canGenerate={transcriptComplete}
        />
      </div>
    </section>
  )
}

export const ContentCardsGrid = memo(ContentCardsGridComponent)

const CardSkeleton = memo(function CardSkeleton() {
  return (
    <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-6 animate-pulse">
      <div className="flex items-center space-x-3 mb-4">
        <div className="w-10 h-10 bg-[var(--color-surface-raised)] rounded-full" />
        <div className="flex-1">
          <div className="h-5 bg-[var(--color-surface-raised)] rounded w-24 mb-2" />
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-16" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-[var(--color-surface-raised)] rounded w-full" />
        <div className="h-4 bg-[var(--color-surface-raised)] rounded w-3/4" />
      </div>
    </div>
  )
})
