import { HelpTip } from '../common/HelpTip'

interface EpisodeStatusChipProps {
  status: 'draft' | 'processing' | 'published' | 'archived' | 'Ready for Clip Gen'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
  showHelp?: boolean
}

const statusDescriptions = {
  draft: 'Episode is being created and edited',
  processing: 'Video is being chunked and prepared for clip detection',
  'Ready for Clip Gen': 'Upload complete, ready to detect clips with AI',
  published: 'Episode and clips are published',
  archived: 'Episode has been archived'
}

const statusConfig = {
  draft: {
    colors: 'bg-gray-100 text-gray-800 border-gray-200',
    icon: (
      <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    )
  },
  processing: {
    colors: 'bg-info/10 text-info border-info/20',
    icon: (
      <svg className="w-full h-full animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    )
  },
  'Ready for Clip Gen': {
    colors: 'bg-warning/10 text-warning border-warning/20',
    icon: (
      <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    )
  },
  published: {
    colors: 'bg-success/10 text-success border-success/20',
    icon: (
      <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 13l4 4L19 7" />
      </svg>
    )
  },
  archived: {
    colors: 'bg-gray-100 text-gray-600 border-gray-200',
    icon: (
      <svg className="w-full h-full" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
        <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
      </svg>
    )
  }
}

const sizeConfig = {
  sm: {
    container: 'px-2 py-1 text-xs',
    icon: 'w-3 h-3'
  },
  md: {
    container: 'px-3 py-1.5 text-sm',
    icon: 'w-4 h-4'
  },
  lg: {
    container: 'px-4 py-2 text-base',
    icon: 'w-5 h-5'
  }
}

export function EpisodeStatusChip({ status, size = 'md', showIcon = false, showHelp = false }: EpisodeStatusChipProps) {
  const config = statusConfig[status] || statusConfig.draft
  const sizes = sizeConfig[size]
  const label = toTitleCase(status)

  const chip = (
    <span
      className={`inline-flex items-center gap-1.5 font-semibold rounded-lg border ${config.colors} ${sizes.container}`}
    >
      {showIcon && (
        <span className={sizes.icon}>
          {config.icon}
        </span>
      )}
      <span>{label}</span>
    </span>
  )

  if (showHelp) {
    return (
      <HelpTip
        id={`status-chip-help-${status}`}
        content={
          <div className="space-y-2">
            <p className="font-semibold text-gray-900">Status: {label}</p>
            <p className="text-sm text-gray-700">{statusDescriptions[status]}</p>
          </div>
        }
        position="bottom"
      >
        {chip}
      </HelpTip>
    )
  }

  return chip
}

function toTitleCase(value: string): string {
  return value
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
