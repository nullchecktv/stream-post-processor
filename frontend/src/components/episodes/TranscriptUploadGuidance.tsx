import { useState } from 'react'

interface TranscriptUploadGuidanceProps {
  trackCount: number
}

export function TranscriptUploadGuidance({ trackCount }: TranscriptUploadGuidanceProps) {
  const [isExampleExpanded, setIsExampleExpanded] = useState(false)

  if (trackCount === 0) {
    return null
  }

  if (trackCount === 1) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">Single track episode</p>
            <p className="text-xs text-blue-700 mt-1">
              Your episode has one video track. Speaker labels are optional but can be included for reference.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
          <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-medium text-amber-800">Multi-track episode</p>
          <p className="text-xs text-amber-700 mt-1">
            Your episode has {trackCount} video tracks. For best results, include speaker labels in your transcript to match segments to the correct video track.
          </p>

          <button
            onClick={() => setIsExampleExpanded(!isExampleExpanded)}
            className="mt-2 flex items-center gap-1 text-xs font-medium text-amber-700 hover:text-amber-800 focus:outline-none focus:ring-2 focus:ring-amber-500 rounded"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExampleExpanded ? 'rotate-90' : ''}`}
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
            {isExampleExpanded ? 'Hide' : 'Show'} speaker attribution format
          </button>

          {isExampleExpanded && (
            <div className="mt-3 bg-white border border-amber-200 rounded p-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Example SRT format with speakers:</p>
              <pre className="text-xs text-gray-800 font-mono bg-gray-50 p-2 rounded overflow-x-auto">
{`1
00:00:20,925 --> 00:00:27,104
Allen: Sometimes it's a breakthrough

2
00:00:28,000 --> 00:00:30,500
Andres: We try it out live

3
00:00:31,000 --> 00:00:35,200
Allen: And that's when the magic happens`}
              </pre>
              <p className="text-xs text-amber-700 mt-2">
                Add speaker names followed by a colon at the start of each subtitle entry.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
