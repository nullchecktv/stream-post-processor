import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useTeams } from '../hooks/useTeams'
import { useUser } from '../hooks/useUser'
import { usePageTitle } from '../hooks/usePageTitle'
import { useToast } from '../hooks/useToast'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { Breadcrumb } from '../components/common/Breadcrumb'
import type { Team, Platform } from '../types'
import { z } from 'zod'

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').max(100, 'Team name must be less than 100 characters'),
  description: z.string().max(500, 'Description must be less than 500 characters').optional(),
  timezone: z.string().optional(),
  tone: z.string().max(200, 'Tone must be less than 200 characters').optional(),
  writingStyle: z.string().max(500, 'Writing style must be less than 500 characters').optional(),
})

type UpdateTeamFormData = z.infer<typeof updateTeamSchema>

const PLATFORM_OPTIONS: Platform[] = ['linkedin live', 'X', 'twitch', 'youtube']
const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
]

function TeamSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { teams, loading, updateTeam, deleteTeam } = useTeams()
  const { profile } = useUser()
  const { showToast } = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [formData, setFormData] = useState<UpdateTeamFormData>({
    name: '',
    description: '',
    timezone: '',
    tone: '',
    writingStyle: '',
  })
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  usePageTitle(team ? `${team.name} - Settings` : 'Team Settings')

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
          name: foundTeam.name,
          description: foundTeam.description || '',
          timezone: foundTeam.settings?.timezone || '',
          tone: foundTeam.brandVoice?.tone || '',
          writingStyle: foundTeam.brandVoice?.writingStyle || '',
        })
        setSelectedPlatforms(foundTeam.settings?.defaultPlatforms || [])
      } else {
        navigate('/teams')
      }
    }
  }, [teamId, teams, loading, navigate, profile, showToast])

  const handleChange = (field: keyof UpdateTeamFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handlePlatformToggle = (platform: Platform) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team) return

    try {
      const validated = updateTeamSchema.parse(formData)
      setErrors({})
      setSubmitting(true)

      await updateTeam(team.id, {
        name: validated.name,
        description: validated.description || undefined,
        settings: {
          defaultPlatforms: selectedPlatforms.length > 0 ? selectedPlatforms : undefined,
          timezone: validated.timezone || undefined,
        },
        brandVoice: validated.tone || validated.writingStyle ? {
          tone: validated.tone || '',
          writingStyle: validated.writingStyle || '',
        } : undefined,
      })

      showToast('Team settings updated successfully', 'success')
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
        console.error('Failed to update team:', err)
        showToast('Failed to update team settings. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteTeam = async () => {
    if (!team) return

    try {
      setDeleting(true)
      await deleteTeam(team.id)
      showToast('Team deleted successfully', 'success')
      navigate('/teams')
    } catch (err) {
      console.error('Failed to delete team:', err)
      showToast('Failed to delete team. Please try again.', 'error')
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="relative min-h-full">
      {(loading || !team) && <LoadingSpinner variant="page" />}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
      <Breadcrumb />
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Team Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage your team configuration</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">General Settings</h2>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Input
            label="Team Name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter team name"
            required
            disabled={submitting}
          />

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Enter team description"
              disabled={submitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-600">{errors.description}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Default Platforms (Optional)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {PLATFORM_OPTIONS.map((platform) => (
                <label
                  key={platform}
                  className={`flex items-center p-3 border rounded-lg cursor-pointer transition-all min-h-[44px] ${
                    selectedPlatforms.includes(platform)
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedPlatforms.includes(platform)}
                    onChange={() => handlePlatformToggle(platform)}
                    disabled={submitting}
                    className="mr-2 min-w-[16px] min-h-[16px]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    {platform === 'linkedin live' ? 'LinkedIn Live' : platform.charAt(0).toUpperCase() + platform.slice(1)}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="timezone" className="block text-sm font-medium text-gray-700 mb-1">
              Timezone (Optional)
            </label>
            <select
              id="timezone"
              value={formData.timezone}
              onChange={(e) => handleChange('timezone', e.target.value)}
              disabled={submitting}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Select timezone</option>
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>
                  {tz.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
            {errors.timezone && (
              <p className="mt-1 text-sm text-red-600">{errors.timezone}</p>
            )}
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Brand Voice</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">
          Configure your team's brand voice to personalize AI-generated blog content
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <Input
            label="Tone (Optional)"
            type="text"
            value={formData.tone}
            onChange={(e) => handleChange('tone', e.target.value)}
            error={errors.tone}
            placeholder="e.g., professional and conversational, casual and humorous"
            disabled={submitting}
          />
          <p className="mt-1 text-xs text-gray-500 -mt-2 sm:-mt-4">
            Examples: "professional and conversational", "casual and humorous", "technical and authoritative"
          </p>

          <div>
            <label htmlFor="writingStyle" className="block text-sm font-medium text-gray-700 mb-1">
              Writing Style (Optional)
            </label>
            <textarea
              id="writingStyle"
              value={formData.writingStyle}
              onChange={(e) => handleChange('writingStyle', e.target.value)}
              placeholder="e.g., storytelling with code examples, technical with practical examples"
              disabled={submitting}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            />
            {errors.writingStyle && (
              <p className="mt-1 text-sm text-red-600">{errors.writingStyle}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Examples: "storytelling with code examples", "technical with practical examples", "educational with step-by-step guides"
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="text-xs sm:text-sm text-blue-800">
                <p className="font-semibold mb-1">How this helps</p>
                <p>
                  When team members generate blog posts from episode transcripts, the AI will use these team settings to match your brand's voice and style. Team settings take precedence over individual member settings.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-2 border-red-200">
        <h2 className="text-lg sm:text-xl font-semibold text-red-600 mb-4">Danger Zone</h2>
        <p className="text-sm sm:text-base text-gray-600 mb-4">
          Deleting a team is permanent and cannot be undone. All team data, including episodes and clips, will be permanently deleted.
        </p>

        {!showDeleteConfirm ? (
          <Button
            onClick={() => setShowDeleteConfirm(true)}
            variant="danger"
            className="w-full sm:w-auto"
          >
            Delete Team
          </Button>
        ) : (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm sm:text-base text-red-800 font-medium mb-3">
              Are you absolutely sure? This action cannot be undone.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                onClick={handleDeleteTeam}
                variant="danger"
                loading={deleting}
                className="w-full sm:w-auto"
              >
                Yes, Delete Team Permanently
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                variant="ghost"
                disabled={deleting}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}

export default TeamSettingsPage
