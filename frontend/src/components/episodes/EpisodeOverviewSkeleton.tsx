export function EpisodeOverviewSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="h-8 w-3/4 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)] mb-3" />
            <div className="h-4 w-1/2 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
          </div>
          <div className="h-10 w-32 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-[var(--color-surface-raised)] rounded-full" />
          <div className="h-6 w-24 bg-[var(--color-surface-raised)] rounded-full" />
          <div className="h-6 w-20 bg-[var(--color-surface-raised)] rounded-full" />
        </div>
      </div>

      <div className="bg-[var(--color-surface)] rounded-[var(--radius-xl)] shadow-sm border border-[var(--color-border)] p-5">
        <div className="flex items-center justify-between mb-5">
          <div className="h-4 w-40 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
          <div className="h-4 w-24 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
        </div>
        <div className="flex items-start justify-between gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="flex flex-col items-center flex-1">
              <div className="w-11 h-11 bg-[var(--color-surface-raised)] rounded-[var(--radius-xl)] mb-3" />
              <div className="h-4 w-24 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)] mb-2" />
              <div className="h-5 w-20 bg-[var(--color-surface-raised)] rounded-full" />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] shadow-sm border border-[var(--color-border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="h-6 w-32 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
              <div className="h-8 w-8 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
            </div>
            <div className="space-y-3">
              <div className="h-4 w-full bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
              <div className="h-4 w-5/6 bg-[var(--color-surface-raised)] rounded-[var(--radius-md)]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
