import { useState } from 'react'
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
