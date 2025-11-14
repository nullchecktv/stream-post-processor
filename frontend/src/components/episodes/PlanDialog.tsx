import { memo } from 'react'
import { PlanForm, type PlanFormData } from './PlanForm'
import type { Plan } from '../../types'

interface PlanDialogProps {
  readonly isOpen: boolean
  readonly onClose: () => void
  readonly onSubmit: (data: PlanFormData) => Promise<void>
  readonly plan?: Plan
  readonly isSubmitting?: boolean
}

function PlanDialogComponent({ isOpen, onClose, onSubmit, plan, isSubmitting = false }: PlanDialogProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="plan-dialog-title" role="dialog" aria-modal="true">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 id="plan-dialog-title" className="text-xl font-semibold text-gray-900">
              {plan ? 'Edit Episode Plan' : 'Create Episode Plan'}
            </h2>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary rounded-lg p-1"
              aria-label="Close dialog"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-140px)]">
            <PlanForm
              plan={plan ?? undefined}
              onSubmit={onSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export const PlanDialog = memo(PlanDialogComponent)
