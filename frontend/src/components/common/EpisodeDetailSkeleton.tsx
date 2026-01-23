export function EpisodeDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-32 mb-3"></div>
          <div className="h-8 bg-[var(--color-surface-raised)] rounded w-2/3 mb-2"></div>
        </div>
        <div className="h-8 bg-[var(--color-surface-raised)] rounded-lg w-28"></div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[var(--color-surface-raised)] rounded mr-2"></div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-48"></div>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[var(--color-surface-raised)] rounded mr-2"></div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-56"></div>
        </div>
        <div className="flex items-center">
          <div className="w-4 h-4 bg-[var(--color-surface-raised)] rounded mr-2"></div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-40"></div>
        </div>
      </div>

      <div>
        <div className="h-5 bg-[var(--color-surface-raised)] rounded w-32 mb-3"></div>
        <div className="h-20 bg-[var(--color-surface-raised)] rounded"></div>
      </div>

      <div>
        <div className="h-5 bg-[var(--color-surface-raised)] rounded w-40 mb-3"></div>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[var(--color-surface-raised)] rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-[var(--color-surface-raised)] rounded w-32 mb-1"></div>
              <div className="h-3 bg-[var(--color-surface-raised)] rounded w-24"></div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-[var(--color-surface-raised)] rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-[var(--color-surface-raised)] rounded w-40 mb-1"></div>
              <div className="h-3 bg-[var(--color-surface-raised)] rounded w-32"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4 pt-4 border-t border-[var(--color-divider)]">
        <div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-16 mb-1"></div>
          <div className="h-6 bg-[var(--color-surface-raised)] rounded w-12"></div>
        </div>
        <div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-20 mb-1"></div>
          <div className="h-6 bg-[var(--color-surface-raised)] rounded w-12"></div>
        </div>
        <div>
          <div className="h-4 bg-[var(--color-surface-raised)] rounded w-12 mb-1"></div>
          <div className="h-6 bg-[var(--color-surface-raised)] rounded w-8"></div>
        </div>
      </div>
    </div>
  )
}
