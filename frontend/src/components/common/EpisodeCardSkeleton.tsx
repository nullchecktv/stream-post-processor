export function EpisodeCardSkeleton() {
  return (
    <div className="relative bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] overflow-hidden animate-pulse">
      <div className="h-1.5 bg-[var(--color-surface-raised)]"></div>
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 mr-3">
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-24 mb-2"></div>
            <div className="h-6 bg-[var(--color-surface-raised)] rounded w-3/4 mb-2"></div>
          </div>
          <div className="h-7 bg-[var(--color-surface-raised)] rounded-lg w-24"></div>
        </div>

        <div className="space-y-3 mb-4">
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[var(--color-surface-raised)] rounded mr-2"></div>
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-40"></div>
          </div>
          <div className="flex items-center">
            <div className="w-4 h-4 bg-[var(--color-surface-raised)] rounded mr-2"></div>
            <div className="h-4 bg-[var(--color-surface-raised)] rounded w-48"></div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4 border-t border-[var(--color-divider)]">
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-16"></div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-20"></div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-16"></div>
        </div>
      </div>
    </div>
  )
}
