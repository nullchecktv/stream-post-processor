import { useForm, type SubmitHandler, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '../common/Button'
import { ChipInput } from '../common/ChipInput'

const PlanSchema = z.object({
  objectives: z.array(z.string().min(1)).min(1, 'At least one objective is required'),
  concepts: z.array(z.string().min(1)).min(1, 'At least one concept is required'),
  notes: z.string().optional(),
})

export type PlanFormData = z.infer<typeof PlanSchema>

interface PlanFormProps {
  plan?: { objectives: string[]; concepts: string[]; notes?: string }
  onSubmit: (data: PlanFormData) => Promise<void>
  onCancel?: () => void
  isSubmitting?: boolean
}

export function PlanForm({ plan, onSubmit, onCancel, isSubmitting = false }: PlanFormProps) {
  const defaultValues = plan
    ? {
        objectives: plan.objectives,
        concepts: plan.concepts,
        notes: plan.notes || '',
      }
    : {
        objectives: [],
        concepts: [],
        notes: '',
      }

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isDirty },
  } = useForm<PlanFormData>({
    resolver: zodResolver(PlanSchema),
    defaultValues,
  })

  const handleFormSubmit: SubmitHandler<PlanFormData> = async (data) => {
    await onSubmit(data)
  }

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
      <Controller
        name="objectives"
        control={control}
        render={({ field }) => (
          <ChipInput
            id="objectives"
            label="Objectives"
            required
            value={field.value}
            onChange={field.onChange}
            placeholder="e.g., Teach audience about sustainable gardening, Share AI best practices"
            error={errors.objectives?.message}
          />
        )}
      />

      <Controller
        name="concepts"
        control={control}
        render={({ field }) => (
          <ChipInput
            id="concepts"
            label="Concepts"
            required
            value={field.value}
            onChange={field.onChange}
            placeholder="e.g., Composting, Soil health, AI agent prompting, Building APIs"
            error={errors.concepts?.message}
          />
        )}
      />

      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Notes
        </label>
        <textarea
          id="notes"
          {...register('notes')}
          rows={6}
          className={`w-full px-3 py-2 border rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-1 bg-[var(--color-surface)] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] ${
            errors.notes
              ? 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]'
              : 'border-[var(--color-border)] focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)]'
          }`}
          placeholder="Additional notes, talking points, or reminders for the episode"
        />
        {errors.notes && (
          <p className="mt-1 text-sm text-[var(--color-text-primary)]" role="alert">
            <span className="inline-flex items-center">
              <svg className="w-4 h-4 text-[var(--color-error)] mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {errors.notes.message}
            </span>
          </p>
        )}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t border-[var(--color-border)]">
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
