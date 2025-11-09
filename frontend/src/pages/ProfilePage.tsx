import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useUser } from '../hooks/useUser'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { usePageTitle } from '../hooks/usePageTitle'
import { LoadingSpinner } from '../components/common/LoadingSpinner'
import { Button } from '../components/common/Button'
import { Input } from '../components/common/Input'
import { z } from 'zod'

const updateProfileSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be less than 100 characters'),
  timezone: z.string().optional(),
  notifications: z.boolean().optional(),
})

type UpdateProfileFormData = z.infer<typeof updateProfileSchema>

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
  const { profile, loading: profileLoading, updateProfile } = useUser()
  const { signOut } = useAuth()
  const { showToast } = useToast()
  const [formData, setFormData] = useState<UpdateProfileFormData>({
    name: '',
    timezone: '',
    notifications: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  usePageTitle('Profile Settings')

  useEffect(() => {
    if (profile) {
      setFormData({
        name: profile.name,
        timezone: profile.preferences?.timezone || '',
        notifications: profile.preferences?.notifications ?? true,
      })
    }
  }, [profile])

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

      await updateProfile({
        name: validated.name,
        preferences: {
          timezone: validated.timezone || undefined,
          notifications: validated.notifications,
        },
      })

      showToast('Profile updated successfully', 'success')
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
        showToast('Failed to update profile. Please try again.', 'error')
      }
    } finally {
      setSubmitting(false)
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

  if (profileLoading || !profile) {
    return <LoadingSpinner variant="page" />
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
                Enable email notifications
              </span>
            </label>
            <p className="mt-1 text-sm text-gray-500 ml-6">
              Receive notifications about team invitations and clip processing
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

