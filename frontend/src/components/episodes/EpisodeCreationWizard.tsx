import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Modal } from '../common/Modal'
import { Button } from '../common/Button'
import { BasicInfoStep } from './BasicInfoStep'
import { PlatformsStep } from './PlatformsStep'
import { ThemesStep } from './ThemesStep'
import { ReviewStep } from './ReviewStep'
import { episodesApi } from '../../api/episodes'
import { z } from 'zod'

interface EpisodeCreationWizardProps {
  isOpen: boolean
  onClose: () => void
  onComplete: (episodeId: string) => void
}

interface WizardFormData {
  title: string
  episodeNumber: string
  airDate: string
  seriesName: string
  platforms: string[]
  themes: string[]
  speakers: string[]
}

const WIZARD_STEPS = [
  { id: 1, name: 'Basic Info', label: 'Basic Information' },
  { id: 2, name: 'Platforms', label: 'Platforms' },
  { id: 3, name: 'Themes', label: 'Themes' },
  { id: 4, name: 'Review', label: 'Review' },
]

const STORAGE_KEY = 'episode-wizard-draft'

const basicInfoSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200, 'Title must be less than 200 characters'),
  episodeNumber: z.string().min(1, 'Episode number is required'),
  airDate: z.string().optional(),
  seriesName: z.string().max(100, 'Series name must be less than 100 characters').optional(),
})

export function EpisodeCreationWizard({ isOpen, onClose, onComplete }: EpisodeCreationWizardProps) {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState<WizardFormData>({
    title: '',
    episodeNumber: '',
    airDate: '',
    seriesName: '',
    platforms: [],
    themes: [],
    speakers: [],
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [hasDraft, setHasDraft] = useState(false)

  useEffect(() => {
    if (isOpen) {
      const savedDraft = localStorage.getItem(STORAGE_KEY)
      if (savedDraft) {
        try {
          const parsed = JSON.parse(savedDraft)
          const draftAge = Date.now() - (parsed.timestamp || 0)
          const maxAge = 7 * 24 * 60 * 60 * 1000

          if (draftAge < maxAge) {
            setHasDraft(true)
          } else {
            localStorage.removeItem(STORAGE_KEY)
          }
        } catch (err) {
          console.error('Failed to check wizard draft:', err)
          localStorage.removeItem(STORAGE_KEY)
        }
      }
    }
  }, [isOpen])

  const loadDraft = () => {
    const savedDraft = localStorage.getItem(STORAGE_KEY)
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft)
        setFormData(parsed.formData || formData)
        setCurrentStep(parsed.currentStep || 1)
        setHasDraft(false)
      } catch (err) {
        console.error('Failed to restore wizard draft:', err)
      }
    }
  }

  const discardDraft = () => {
    localStorage.removeItem(STORAGE_KEY)
    setHasDraft(false)
  }

  useEffect(() => {
    if (isOpen && !hasDraft) {
      const draftData = {
        formData,
        currentStep,
        timestamp: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draftData))
    }
  }, [formData, currentStep, isOpen, hasDraft])

  const validateCurrentStep = (): boolean => {
    if (currentStep === 1) {
      const result = basicInfoSchema.safeParse(formData)
      if (!result.success) {
        const fieldErrors: Record<string, string> = {}
        result.error.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(fieldErrors)
        return false
      }
      setErrors({})
      return true
    }
    return true
  }

  const handleNext = () => {
    if (validateCurrentStep() && currentStep < WIZARD_STEPS.length) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
    }
  }

  const clearDraft = () => {
    localStorage.removeItem(STORAGE_KEY)
  }

  const handleComplete = async () => {
    if (!validateCurrentStep()) {
      return
    }

    setIsSubmitting(true)
    setSubmitError(null)

    try {
      const episodeData = {
        title: formData.title,
        episodeNumber: Number.parseInt(formData.episodeNumber, 10),
        ...(formData.airDate && { airDate: new Date(formData.airDate).toISOString() }),
        ...(formData.seriesName && { seriesName: formData.seriesName }),
        ...(formData.platforms.length > 0 && { platforms: formData.platforms }),
        ...(formData.themes.length > 0 && { themes: formData.themes }),
        ...(formData.speakers.length > 0 && { speakers: formData.speakers }),
      }

      const response = await episodesApi.create(episodeData)

      clearDraft()
      onComplete(response.id)
      onClose()
      navigate(`/episodes/${response.id}`)
    } catch (err) {
      console.error('Failed to create episode:', err)
      setSubmitError('Failed to create episode. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const updateFormData = (updates: Partial<WizardFormData>) => {
    setFormData(prev => ({ ...prev, ...updates }))
    setErrors({})
  }

  const goToStep = (step: number) => {
    setCurrentStep(step)
  }

  if (hasDraft) {
    return (
      <Modal
        isOpen={isOpen}
        onClose={handleClose}
        title="Resume Draft?"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-[var(--color-text-secondary)]">
            You have an unfinished episode draft. Would you like to resume where you left off or start fresh?
          </p>
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="ghost"
              onClick={discardDraft}
            >
              Start Fresh
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={loadDraft}
            >
              Resume Draft
            </Button>
          </div>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Episode"
      size="lg"
    >
      <div className="space-y-6">
        <WizardProgress currentStep={currentStep} steps={WIZARD_STEPS} />

        <div className="min-h-[400px]">
          {currentStep === 1 && (
            <BasicInfoStep
              formData={formData}
              onChange={updateFormData}
              errors={errors}
              onValidate={() => {}}
            />
          )}
          {currentStep === 2 && (
            <PlatformsStep
              selectedPlatforms={formData.platforms}
              onChange={(platforms) => updateFormData({ platforms })}
            />
          )}
          {currentStep === 3 && (
            <ThemesStep
              themes={formData.themes}
              onChange={(themes) => updateFormData({ themes })}
            />
          )}
          {currentStep === 4 && (
            <ReviewStep
              formData={formData}
              onEdit={goToStep}
              isSubmitting={isSubmitting}
              error={submitError || undefined}
            />
          )}
        </div>

        <WizardNavigation
          currentStep={currentStep}
          totalSteps={WIZARD_STEPS.length}
          onBack={handleBack}
          onNext={handleNext}
          onComplete={handleComplete}
          onClose={handleClose}
          isSubmitting={isSubmitting}
        />
      </div>
    </Modal>
  )
}

interface WizardProgressProps {
  currentStep: number
  steps: typeof WIZARD_STEPS
}

function WizardProgress({ currentStep, steps }: WizardProgressProps) {
  return (
    <div className="flex items-center justify-between px-4">
      {steps.map((step, index) => (
        <div key={step.id} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-medium text-sm
                transition-colors duration-200
                ${
                  step.id === currentStep
                    ? 'bg-[var(--color-accent)] text-white'
                    : step.id < currentStep
                    ? 'bg-[var(--color-success)] text-white'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border border-[var(--color-border)]'
                }
              `}
            >
              {step.id < currentStep ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step.id
              )}
            </div>
            <span
              className={`
                mt-2 text-xs font-medium text-center
                ${step.id === currentStep ? 'text-[var(--color-accent)]' : 'text-[var(--color-text-muted)]'}
              `}
            >
              {step.name}
            </span>
          </div>
          {index < steps.length - 1 && (
            <div
              className={`
                h-0.5 flex-1 mx-2 transition-colors duration-200
                ${step.id < currentStep ? 'bg-[var(--color-success)]' : 'bg-[var(--color-border)]'}
              `}
            />
          )}
        </div>
      ))}
    </div>
  )
}

interface WizardNavigationProps {
  currentStep: number
  totalSteps: number
  onBack: () => void
  onNext: () => void
  onComplete: () => void
  onClose: () => void
  isSubmitting: boolean
}

function WizardNavigation({
  currentStep,
  totalSteps,
  onBack,
  onNext,
  onComplete,
  onClose,
  isSubmitting,
}: WizardNavigationProps) {
  const isFirstStep = currentStep === 1
  const isLastStep = currentStep === totalSteps

  return (
    <div className="flex justify-between items-center pt-4 border-t border-[var(--color-border)]">
      <Button
        type="button"
        variant="ghost"
        onClick={onClose}
        disabled={isSubmitting}
      >
        Cancel
      </Button>

      <div className="flex space-x-3">
        {!isFirstStep && (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
          >
            Back
          </Button>
        )}
        {!isLastStep ? (
          <Button
            type="button"
            variant="primary"
            onClick={onNext}
          >
            Next: {WIZARD_STEPS[currentStep]?.name} →
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            onClick={onComplete}
            loading={isSubmitting}
          >
            Create Episode
          </Button>
        )}
      </div>
    </div>
  )
}
