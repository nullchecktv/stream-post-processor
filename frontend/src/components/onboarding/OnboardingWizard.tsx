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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 sm:px-6 lg:px-8 py-8">
      <div className="w-full max-w-2xl">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 sm:p-8">
          <div className="mb-6 sm:mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center flex-1">
                  <div
                    className={`flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full transition-colors duration-300 text-sm sm:text-base ${
                      index <= currentStepIndex
                        ? 'bg-primary text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {index + 1}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`flex-1 h-1 mx-1 sm:mx-2 transition-colors duration-300 ${
                        index < currentStepIndex ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">{currentStep.title}</h2>
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
                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-500'
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
