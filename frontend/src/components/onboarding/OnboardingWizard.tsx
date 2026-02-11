import { useState } from 'react'
import type { ReactNode } from 'react'

interface OnboardingWizardProps {
  steps: {
    id: string
    title: string
    component: ReactNode
  }[]
  onComplete: () => void
}

export function OnboardingWizard({ steps, onComplete }: OnboardingWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0)

  const currentStep = steps[currentStepIndex]
  const isFirstStep = currentStepIndex === 0
  const isLastStep = currentStepIndex === steps.length - 1

  const handleNext = () => {
    if (isLastStep) {
      onComplete()
    } else {
      setCurrentStepIndex((prev) => prev + 1)
    }
  }

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStepIndex((prev) => prev - 1)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-[var(--color-surface)] rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors duration-300 text-sm sm:text-base ${
                      index <= currentStepIndex
                        ? 'bg-primary text-white'
                        : 'bg-[var(--color-surface-hover)] text-[var(--color-text-muted)]'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1 sm:mx-2 transition-colors duration-300 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-[var(--color-border)]'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[var(--color-text-primary)]">{currentStep.title}</h2>
          </div>

          <div className="transition-opacity duration-300">{currentStep.component}</div>

          <div className="mt-6 sm:mt-8 flex justify-between gap-4">
            <button
              type="button"
              onClick={handleBack}
              disabled={isFirstStep}
              className={`px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors ${
                isFirstStep
                  ? 'invisible'
                  : 'text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)]'
              }`}
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-4 sm:px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary transition-colors"
            >
              {isLastStep ? 'Complete' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
