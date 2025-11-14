import { useForm, type SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../common/Button'

const PlanSchema = z.object({
  objectives: z.string().min(1, 'Objectives are required'),
  concepts: z.string().min(1, 'Concepts are required'),
  notes: z.string().optional(),
})

export type PlanFormData = z.infer<typeof PlanSchema>

interface PlanFormProps {
  plan?: {
    objectives: string | string[]
    concepts: string | string[]
    notes?: string
  }
  onSubmit: (data: PlanFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function PlanForm({ plan, onSubmit, onCancel, isSubmitting = false }: PlanFormProps) {
  const normalizeToString = (value: string | string[] | undefined): string => {
    if (!value) return ''
    return Array.isArray(value) ? value.join('\n') : value
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PlanFormData>({
    resolver: zodResolver(PlanSchema),
    defaultValues: plan ? {
      objectives: normalizeToString(plan.objectives),
      concepts: normalizeToString(plan.concepts),
      notes: plan.notes || '',
    } : {
      objectives: '',
      concepts: '',
      notes: '',
    },
  })

  const handleFormSubmit: SubmitHandler<PlanFormData> = async (data) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <div>
        <label htmlFor="objectives" className="block text-sm font-medium text-gray-700 mb-1">
          Objectives <span className="text-red-500">*</span>
        </label>
        <textarea
          id="objectives"
          {...register('objectives')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            errors.objectives
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          placeholder="What are the main goals and objectives for this episode?"
        />
        {errors.objectives && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.objectives.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="concepts" className="block text-sm font-medium text-gray-700 mb-1">
          Concepts <span className="text-red-500">*</span>
        </label>
        <textarea
          id="concepts"
          {...register('concepts')}
          rows={4}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            errors.concepts
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          placeholder="What key concepts, topics, or technologies will be covered?"
        />
        {errors.concepts && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.concepts.message}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 ${
            errors.notes
              ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
              : 'border-gray-300 focus:ring-primary focus:border-primary'
          }`}
          placeholder="Additional notes, talking points, or reminders for the episode"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errors.notes.message}
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        {onCancel && (
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          variant="primary"
          loading={isSubmitting}
          disabled={!isDirty || isSubmitting}
        >
          {plan ? 'Update Plan' : 'Create Plan'}
        </Button>
      </div>
    </form>
  )
}
