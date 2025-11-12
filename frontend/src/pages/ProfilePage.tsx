import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { usePageTitle } from '../hooks/usePageTitle'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { ColorPicker } from '../components/common/ColorPicker'
import { BrandingPreview } from '../components/common/BrandingPreview'
import ProfileSkeleton from '../components/common/ProfileSkeleton'
import { z } from 'zod'
import type { BrandingConfig } from '../types'

const hexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color (e.g., #3B82F6)')

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  timezone: z.string().optional(),
  notifications: z.boolean().optional(),
  tone: z.string().max(200, 'Tone must be less than 200 characters').optional(),
  writingStyle: z.string().max(500, 'Writing style must be less than 500 characters').optional(),
  useTeamBranding: z.boolean().optional(),
  branding: z.object({
    colors: z.object({
      primary: hexColorSchema,
      secondary: hexColorSchema,
      background: hexColorSchema,
      text: hexColorSchema,
    }),
    fontFamily: z.string().min(1, 'Font family is required'),
  }).optional(),
})

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

const DEFAULT_BRANDING: BrandingConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#1F2937',
    text: '#F9FAFB',
  },
  fontFamily: 'Inter',
}

const FONT_OPTIONS = [
  'Comic Neue',
  'Inter',
  'Lora',
  'Montserrat',
  'Press Start 2P',
  'Roboto Condensed',
  'Source Code Pro',
]

const TIMEZONE_OPTIONS = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Australia/Sydney',
]

function ProfilePage() {
  const navigate = useNavigate()
  const { profile, updateProfile } = useUser()
  const { signOut } = useAuth()
  const { showToast } = useToast()
  const [formData, setFormData] = useState<UpdateProfileFormData>({
    name: '',
    timezone: '',
    notifications: true,
    tone: '',
    writingStyle: '',
    useTeamBranding: true,
    branding: DEFAULT_BRANDING,
  })
  const [useTeamWriting, setUseTeamWriting] = useState(true)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)

  usePageTitle('Profile Settings')

  useEffect(() => {
    if (profile && !isInitialized) {
      const hasPersonalVoice = profile.branding?.voice?.tone || profile.branding?.voice?.writingStyle
      setFormData({
        name: profile.name,
        timezone: profile.preferences?.timezone || '',
        notifications: profile.preferences?.notifications ?? true,
        tone: profile.branding?.voice?.tone || '',
        writingStyle: profile.branding?.voice?.writingStyle || '',
        useTeamBranding: !profile.branding,
        branding: profile.branding || DEFAULT_BRANDING,
      })
      setUseTeamWriting(!hasPersonalVoice)
      setIsInitialized(true)
    }
  }, [profile, isInitialized])

  const handleChange = (field: keyof UpdateProfileFormData, value: string | boolean) => {
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

    try {
      const validated = updateProfileSchema.parse(formData)
      setErrors({})
      setSubmitting(true)

      const updateData: any = {
        name: validated.name,
        preferences: {
          timezone: validated.timezone || undefined,
          notifications: validated.notifications,
        },
      }

      if (!validated.useTeamBranding && validated.branding) {
        updateData.branding = {
          ...validated.branding,
          voice: !useTeamWriting && (validated.tone || validated.writingStyle) ? {
            tone: validated.tone || '',
            writingStyle: validated.writingStyle || '',
          } : undefined,
        }
      } else if (validated.useTeamBranding) {
        if (!useTeamWriting && (validated.tone || validated.writingStyle)) {
          updateData.branding = {
            voice: {
              tone: validated.tone || '',
              writingStyle: validated.writingStyle || '',
            }
          }
        } else {
          updateData.branding = null
        }
      }

      await updateProfile(updateData)
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
        console.error('Failed to update profile:', err)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleBrandingColorChange = (colorKey: keyof BrandingConfig['colors'], value: string) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding!,
        colors: {
          ...prev.branding!.colors,
          [colorKey]: value,
        },
      },
    }))
    if (errors[`branding.colors.${colorKey}`]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[`branding.colors.${colorKey}`]
        return newErrors
      })
    }
  }

  const handleBrandingFontChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      branding: {
        ...prev.branding!,
        fontFamily: value,
      },
    }))
    if (errors['branding.fontFamily']) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors['branding.fontFamily']
        return newErrors
      })
    }
  }

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut()
      showToast('Signed out successfully', 'success')
      navigate('/login')
    } catch (err) {
      console.error('Failed to sign out:', err)
      showToast('Failed to sign out. Please try again.', 'error')
      setSigningOut(false)
    }
  }

  if (!isInitialized || !profile) {
    return <ProfileSkeleton />
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Profile Settings</h1>
        <p className="text-gray-600 mt-1">Manage your account information and preferences</p>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Account Information</h2>

        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <p className="text-gray-900">{profile.email}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Created</label>
            <p className="text-gray-900">{formatDate(profile.createdAt)}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="Display Name"
            type="text"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            placeholder="Enter your name"
            required
            disabled={submitting}
          />

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

          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.notifications}
                onChange={(e) => handleChange('notifications', e.target.checked)}
                disabled={submitting}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Enable email activity notifications
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500 ml-6">
              Receive email notifications about team invitations and clip processing
            </p>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="primary"
              loading={submitting}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Writing Voice</h2>
        <p className="text-gray-600 mb-6">
          Configure your writing voice to personalize AI-generated blog content. By default, your team's writing settings are used.
        </p>

        <div className="space-y-6">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={useTeamWriting}
                onChange={(e) => setUseTeamWriting(e.target.checked)}
                disabled={submitting}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Use team writing settings
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500 ml-6">
              When enabled, blog posts will use your team's tone and writing style
            </p>
          </div>

          {!useTeamWriting && (
            <form onSubmit={handleSubmit} className="space-y-6 border-t border-gray-200 pt-6">
              <Input
                label="Tone"
                type="text"
                value={formData.tone}
                onChange={(e) => handleChange('tone', e.target.value)}
                error={errors.tone}
                placeholder="e.g., professional and conversational, casual and humorous"
                disabled={submitting}
              />
              <p className="mt-1 text-xs text-gray-500 -mt-4">
                Examples: "professional and conversational", "casual and humorous", "technical and authoritative"
              </p>

              <div>
                <label htmlFor="writingStyle" className="block text-sm font-medium text-gray-700 mb-1">
                  Writing Style
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

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
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
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Personal writing voice</p>
                    <p>
                      These settings will override your team's writing voice for blog posts you generate.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  variant="primary"
                  loading={submitting}
                >
                  Save Writing Voice
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Personal Branding</h2>
        <p className="text-gray-600 mb-6">
          Customize the appearance of your quote graphics. By default, your team's branding is used.
        </p>

        <div className="space-y-6">
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.useTeamBranding}
                onChange={(e) => handleChange('useTeamBranding', e.target.checked)}
                disabled={submitting}
                className="mr-2 h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Use team branding
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500 ml-6">
              When enabled, your quote graphics will use your team's branding settings
            </p>
          </div>

          {!formData.useTeamBranding && (
            <>
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Brand Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <ColorPicker
                    label="Primary Color"
                    value={formData.branding!.colors.primary}
                    onChange={(value) => handleBrandingColorChange('primary', value)}
                    disabled={submitting}
                    error={errors['branding.colors.primary']}
                  />
                  <ColorPicker
                    label="Secondary Color"
                    value={formData.branding!.colors.secondary}
                    onChange={(value) => handleBrandingColorChange('secondary', value)}
                    disabled={submitting}
                    error={errors['branding.colors.secondary']}
                  />
                  <ColorPicker
                    label="Background Color"
                    value={formData.branding!.colors.background}
                    onChange={(value) => handleBrandingColorChange('background', value)}
                    disabled={submitting}
                    error={errors['branding.colors.background']}
                  />
                  <ColorPicker
                    label="Text Color"
                    value={formData.branding!.colors.text}
                    onChange={(value) => handleBrandingColorChange('text', value)}
                    disabled={submitting}
                    error={errors['branding.colors.text']}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="fontFamily" className="block text-sm font-medium text-gray-700 mb-1">
                  Font Family
                </label>
                <select
                  id="fontFamily"
                  value={formData.branding!.fontFamily}
                  onChange={(e) => handleBrandingFontChange(e.target.value)}
                  disabled={submitting}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {FONT_OPTIONS.map((font) => (
                    <option key={font} value={font}>
                      {font}
                    </option>
                  ))}
                </select>
                {errors['branding.fontFamily'] && (
                  <p className="mt-1 text-sm text-red-600">{errors['branding.fontFamily']}</p>
                )}
              </div>

              <BrandingPreview branding={formData.branding!} />

              <div className="flex justify-end">
                <Button
                  type="button"
                  onClick={handleSubmit}
                  variant="primary"
                  loading={submitting}
                >
                  Save Branding
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Sign Out</h2>
        <p className="text-gray-600 mb-4">
          Sign out of your account on this device.
        </p>
        <Button
          onClick={handleSignOut}
          variant="secondary"
          loading={signingOut}
        >
          Sign Out
        </Button>
      </div>
    </div>
  )
}

export default ProfilePage

