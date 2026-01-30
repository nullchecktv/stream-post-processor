import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Breadcrumb } from '../components/common/Breadcrumb'

import type { Team } from '../types'
import { z } from 'zod'

const writingSchema = z.object({
  tone: z.string().min(1, 'Tone is required').max(200, 'Tone must be less than 200 characters'),
  writingStyle: z.string().min(1, 'Writing style is required').max(500, 'Writing style must be less than 500 characters'),
  perspective: z.enum(['first_person', 'third_person']),
})

type WritingFormData = z.infer<typeof writingSchema>

const TONE_EXAMPLES = [
  'Professional and engaging',
  'Conversational and friendly',
  'Technical and authoritative',
  'Casual and humorous',
  'Educational and supportive',
]

const STYLE_EXAMPLES = [
  'Clear and informative with practical examples',
  'Technical with code snippets and deep dives',
  'Story-driven with real-world scenarios',
  'Concise and action-oriented',
  'Detailed and comprehensive',
]

function TeamWritingSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { teams, loading, updateTeam } = useTeams()
  const { profile } = useUser()
  const { showToast } = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState<WritingFormData>({
    tone: '',
    writingStyle: '',
    perspective: 'first_person',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)

  usePageTitle(team ? `${team.name} - Writing Settings` : 'Team Writing')

  useEffect(() => {
    if (!loading && teamId) {
      const foundTeam = teams.find(t => t.id === teamId)
      if (foundTeam) {
        const membership = profile?.teams.find(m => m.teamId === foundTeam.id)
        if (membership?.role !== 'owner') {
          showToast('Only team owners can access settings', 'error')
          navigate(`/teams/${teamId}`)
          return
        }

        setTeam(foundTeam)
        setFormData({
          tone: foundTeam.branding?.voice?.tone || '',
          writingStyle: foundTeam.branding?.voice?.writingStyle || '',
          perspective: (foundTeam.branding?.voice?.perspective as 'first_person' | 'third_person') || 'first_person',
        })
      } else {
        navigate('/teams')
      }
    }
  }, [teamId, teams, loading, navigate, profile, showToast])

  const handleChange = (field: keyof WritingFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team) return

    try {
      const validated = writingSchema.parse(formData)
      setErrors({})
      setSubmitting(true)

      await updateTeam(team.id, {
        branding: {
          colors: team.branding?.colors || {
            primary: '#3B82F6',
            secondary: '#8B5CF6',
            background: '#1F2937',
            text: '#F9FAFB',
          },
          fontFamily: team.branding?.fontFamily || 'Inter',
          voice: {
            tone: validated.tone,
            writingStyle: validated.writingStyle,
            perspective: validated.perspective,
          },
        },
      })

      navigate(`/teams/${team.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path[0]) {
            fieldErrors[issue.path[0] as string] = issue.message
          }
        })
        setErrors(fieldErrors)
      } else {
        console.error('Failed to update writing settings:', err)
        showToast('Failed to save writing settings. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative min-h-full">
      {(loading || !team) && <LoadingSpinner variant="page" />}
      <div className="space-y-6">
        <Breadcrumb />

        <div className="bg-[var(--color-surface)] rounded-lg shadow-md p-4 sm:p-6 border border-[var(--color-border)]">
          <h2 className="text-lg sm:text-xl font-semibold text-[var(--color-text-primary)] mb-2">Writing Voice</h2>
          <p className="text-sm text-[var(--color-text-secondary)] mb-6">
            Configure how AI-generated content (like blog posts) should sound. This helps maintain consistency across all your team's content.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="tone" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Tone
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                The overall feeling and attitude of your writing. How should your content make readers feel?
              </p>
              <textarea
                id="tone"
                value={formData.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                placeholder="e.g., Professional and engaging"
                disabled={submitting}
                rows={2}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
              {errors.tone && (
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.tone}</p>
              )}
              <div className="mt-2">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {TONE_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleChange('tone', example)}
                      disabled={submitting}
                      className="text-xs px-2 py-1 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)] rounded-md text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)]"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label htmlFor="writingStyle" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Writing Style
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                The structure and approach of your writing. How should information be presented?
              </p>
              <textarea
                id="writingStyle"
                value={formData.writingStyle}
                onChange={(e) => handleChange('writingStyle', e.target.value)}
                placeholder="e.g., Clear and informative with practical examples"
                disabled={submitting}
                rows={2}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-surface)] text-[var(--color-text-primary)]"
              />
              {errors.writingStyle && (
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.writingStyle}</p>
              )}
              <div className="mt-2">
                <p className="text-xs text-[var(--color-text-muted)] mb-1">Examples:</p>
                <div className="flex flex-wrap gap-2">
                  {STYLE_EXAMPLES.map((example) => (
                    <button
                      key={example}
                      type="button"
                      onClick={() => handleChange('writingStyle', example)}
                      disabled={submitting}
                      className="text-xs px-2 py-1 bg-[var(--color-surface-raised)] hover:bg-[var(--color-surface-hover)] rounded-md text-[var(--color-text-primary)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-[var(--duration-fast)]"
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Writing Perspective
              </label>
              <p className="text-xs text-[var(--color-text-muted)] mb-3">
                Choose the point of view for your blog content. This affects how the AI writes about your team and content.
              </p>
              <div className="space-y-3">
                <label className="flex items-start cursor-pointer p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
                  <input
                    type="radio"
                    name="perspective"
                    value="first_person"
                    checked={formData.perspective === 'first_person'}
                    onChange={(e) => handleChange('perspective', e.target.value as 'first_person' | 'third_person')}
                    disabled={submitting}
                    className="mt-1 mr-3 h-4 w-4 text-[var(--color-accent)] focus:ring-[var(--color-focus)] border-[var(--color-border)]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">First Person</span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Write as if you're speaking directly (I, we, my, our). Best for personal blogs and direct engagement.
                    </p>
                  </div>
                </label>
                <label className="flex items-start cursor-pointer p-3 border border-[var(--color-border)] rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
                  <input
                    type="radio"
                    name="perspective"
                    value="third_person"
                    checked={formData.perspective === 'third_person'}
                    onChange={(e) => handleChange('perspective', e.target.value as 'first_person' | 'third_person')}
                    disabled={submitting}
                    className="mt-1 mr-3 h-4 w-4 text-[var(--color-accent)] focus:ring-[var(--color-focus)] border-[var(--color-border)]"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-[var(--color-text-primary)]">Third Person</span>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">
                      Write from an outside perspective (they, the team, the author). Best for company blogs and professional content.
                    </p>
                  </div>
                </label>
              </div>
              {errors.perspective && (
                <p className="mt-1 text-sm text-[var(--color-error)]">{errors.perspective}</p>
              )}
            </div>

            <div className="bg-[var(--color-info)] bg-opacity-10 border border-[var(--color-info)] rounded-lg p-4">
              <h3 className="text-sm font-semibold text-[var(--color-text-primary)] mb-2">How this works</h3>
              <ul className="text-sm text-[var(--color-text-secondary)] space-y-1 list-disc list-inside">
                <li>These settings guide AI when generating blog posts from your episodes</li>
                <li>The AI will adapt its writing to match your specified tone and style</li>
                <li>You can always edit generated content before publishing</li>
                <li>Changes apply to all future content generation for this team</li>
              </ul>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={submitting}
                className="w-full sm:w-auto"
              >
                Save Writing Settings
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TeamWritingSettingsPage
