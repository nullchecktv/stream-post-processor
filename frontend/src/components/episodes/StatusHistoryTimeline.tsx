import type { StatusHistoryEntry } from '../../types'

interface StatusHistoryTimelineProps {
  statusHistory: StatusHistoryEntry[]
  compact?: boolean
}

const statusIcons = {
  draft: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  processing: (
    <svg className="w-full h-full" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  ),
  'Ready for Clip Gen': (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  published: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M5 13l4 4L19 7" />
    </svg>
  ),
  archived: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
    </svg>
  ),
  plan_added: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  plan_updated: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  recommendations_generated: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  recommendations_failed: (
    <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
      <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  )
}

const statusColors = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  processing: 'bg-info/10 text-info border-info/30',
  'Ready for Clip Gen': 'bg-warning/10 text-warning border-warning/30',
  published: 'bg-success/10 text-success border-success/30',
  archived: 'bg-gray-100 text-gray-600 border-gray-300',
  plan_added: 'bg-purple-100 text-purple-700 border-purple-300',
  plan_updated: 'bg-purple-100 text-purple-700 border-purple-300',
  recommendations_generated: 'bg-indigo-100 text-indigo-700 border-indigo-300',
  recommendations_failed: 'bg-red-100 text-red-700 border-red-300'
}

function formatRelativeTime(timestamp: string): string {
  const now = new Date()
  const then = new Date(timestamp)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
  if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`

  return then.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDuration(durationMs?: number): string {
  if (!durationMs) return ''

  const hours = Math.floor(durationMs / 3600000)
  const minutes = Math.floor((durationMs % 3600000) / 60000)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }
  return `${minutes}m`
}

export function StatusHistoryTimeline({ statusHistory, compact = false }: StatusHistoryTimelineProps) {
  if (!statusHistory || statusHistory.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>No status history available</p>
      </div>
    )
  }

  const sortedHistory = [...statusHistory].sort((a, b) =>
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  )

  return (
    <div className="space-y-4">
      {sortedHistory.map((entry, index) => {
        const isLast = index === sortedHistory.length - 1
        const icon = statusIcons[entry.status as keyof typeof statusIcons] || statusIcons.draft
        const colors = statusColors[entry.status as keyof typeof statusColors] || statusColors.draft

        return (
          <div key={`${entry.status}-${entry.timestamp}`} className="relative flex gap-4">
            <div className="flex flex-col items-center">
              <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center ${colors}`}>
                <div className="w-5 h-5">
                  {icon}
                </div>
              </div>
              {!isLast && (
                <div className="w-0.5 h-full bg-gray-200 mt-2"></div>
              )}
            </div>

            <div className={`flex-1 ${!isLast ? 'pb-4' : ''}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">
                    {toTitleCase(entry.status)}
                  </h4>
                  <p className="text-sm text-gray-600 mt-1">
                    {formatRelativeTime(entry.timestamp)}
                  </p>
                  {entry.duration && (
                    <p className="text-xs text-gray-500 mt-1">
                      Duration: {formatDuration(entry.duration)}
                    </p>
                  )}
                </div>
                {!compact && entry.metadata && Object.keys(entry.metadata).length > 0 && (
                  <button
                    className="text-xs text-primary hover:text-primary-dark"
                    onClick={() => console.log('Metadata:', entry.metadata)}
                  >
                    Details
                  </button>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
