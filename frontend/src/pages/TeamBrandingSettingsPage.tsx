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
import type { Team, BrandingConfig } from '../types'
import { z } from 'zod'

const brandingSchema = z.object({
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    secondary: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    background: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
    text: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Must be a valid hex color'),
  }),
  fontFamily: z.string().min(1, 'Font family is required'),
})

type BrandingFormData = z.infer<typeof brandingSchema>

const FONT_OPTIONS = [
  'Comic Neue',
  'Inter',
  'Lora',
  'Montserrat',
  'Press Start 2P',
  'Roboto Condensed',
  'Source Code Pro',
]

const DEFAULT_BRANDING: BrandingConfig = {
  colors: {
    primary: '#3B82F6',
    secondary: '#8B5CF6',
    background: '#1F2937',
    text: '#F9FAFB',
  },
  fontFamily: 'Inter',
}

function TeamBrandingSettingsPage() {
  const { teamId } = useParams<{ teamId: string }>()
  const navigate = useNavigate()
  const { teams, loading, updateTeam } = useTeams()
  const { profile } = useUser()
  const { showToast } = useToast()
  const [team, setTeam] = useState<Team | null>(null)
  const [brandingData, setBrandingData] = useState<BrandingFormData>(DEFAULT_BRANDING)
  const [brandingErrors, setBrandingErrors] = useState<Record<string, string>>({})
  const [savingBranding, setSavingBranding] = useState(false)

  usePageTitle(team ? `${team.name} - Branding Settings` : 'Team Branding')

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
        setBrandingData(foundTeam.branding || DEFAULT_BRANDING)
      } else {
        navigate('/teams')
      }
    }
  }, [teamId, teams, loading, navigate, profile, showToast])

  const handleBrandingChange = (field: string, value: string) => {
    if (field.startsWith('colors.')) {
      const colorField = field.split('.')[1] as keyof BrandingConfig['colors']
      setBrandingData(prev => ({
        ...prev,
        colors: {
          ...prev.colors,
          [colorField]: value,
        },
      }))
    } else {
      setBrandingData(prev => ({ ...prev, [field]: value }))
    }
    if (brandingErrors[field]) {
      setBrandingErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[field]
        return newErrors
      })
    }
  }

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!team) return

    try {
      const validated = brandingSchema.parse(brandingData)
      setBrandingErrors({})
      setSavingBranding(true)

      await updateTeam(team.id, {
        branding: validated,
      })

      navigate(`/teams/${team.id}`)
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors: Record<string, string> = {}
        err.issues.forEach((issue) => {
          if (issue.path.length > 0) {
            fieldErrors[issue.path.join('.')] = issue.message
          }
        })
        setBrandingErrors(fieldErrors)
      } else {
        console.error('Failed to update branding:', err)
      }
    } finally {
      setSavingBranding(false)
    }
  }

  return (
    <div className="relative min-h-full">
      {(loading || !team) && <LoadingSpinner variant="page" />}
      <div className="space-y-6">
        <Breadcrumb />

        <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">Brand Colors & Fonts</h2>
          <p className="text-sm text-gray-600 mb-6">
            Customize the colors and fonts used in your quote graphics and other branded content.
          </p>

          <form onSubmit={handleSaveBranding} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="primary-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Primary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="primary-color"
                    value={brandingData.colors.primary}
                    onChange={(e) => handleBrandingChange('colors.primary', e.target.value)}
                    disabled={savingBranding}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                  />
                  <Input
                    type="text"
                    value={brandingData.colors.primary}
                    onChange={(e) => handleBrandingChange('colors.primary', e.target.value)}
                    disabled={savingBranding}
                    placeholder="#3B82F6"
                    className="flex-1"
                  />
                </div>
                {brandingErrors['colors.primary'] && (
                  <p className="mt-1 text-sm text-red-600">{brandingErrors['colors.primary']}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Used for borders and accents</p>
              </div>

              <div>
                <label htmlFor="secondary-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Secondary Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="secondary-color"
                    value={brandingData.colors.secondary}
                    onChange={(e) => handleBrandingChange('colors.secondary', e.target.value)}
                    disabled={savingBranding}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                  />
                  <Input
                    type="text"
                    value={brandingData.colors.secondary}
                    onChange={(e) => handleBrandingChange('colors.secondary', e.target.value)}
                    disabled={savingBranding}
                    placeholder="#8B5CF6"
                    className="flex-1"
                  />
                </div>
                {brandingErrors['colors.secondary'] && (
                  <p className="mt-1 text-sm text-red-600">{brandingErrors['colors.secondary']}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Used for speaker names</p>
              </div>

              <div>
                <label htmlFor="background-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Background Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="background-color"
                    value={brandingData.colors.background}
                    onChange={(e) => handleBrandingChange('colors.background', e.target.value)}
                    disabled={savingBranding}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                  />
                  <Input
                    type="text"
                    value={brandingData.colors.background}
                    onChange={(e) => handleBrandingChange('colors.background', e.target.value)}
                    disabled={savingBranding}
                    placeholder="#1F2937"
                    className="flex-1"
                  />
                </div>
                {brandingErrors['colors.background'] && (
                  <p className="mt-1 text-sm text-red-600">{brandingErrors['colors.background']}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Main background color</p>
              </div>

              <div>
                <label htmlFor="text-color" className="block text-sm font-medium text-gray-700 mb-2">
                  Text Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    id="text-color"
                    value={brandingData.colors.text}
                    onChange={(e) => handleBrandingChange('colors.text', e.target.value)}
                    disabled={savingBranding}
                    className="h-10 w-20 rounded border border-gray-300 cursor-pointer disabled:opacity-50"
                  />
                  <Input
                    type="text"
                    value={brandingData.colors.text}
                    onChange={(e) => handleBrandingChange('colors.text', e.target.value)}
                    disabled={savingBranding}
                    placeholder="#F9FAFB"
                    className="flex-1"
                  />
                </div>
                {brandingErrors['colors.text'] && (
                  <p className="mt-1 text-sm text-red-600">{brandingErrors['colors.text']}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Quote text color</p>
              </div>
            </div>

            <div>
              <label htmlFor="font-family" className="block text-sm font-medium text-gray-700 mb-2">
                Font Family
              </label>
              <select
                id="font-family"
                value={brandingData.fontFamily}
                onChange={(e) => handleBrandingChange('fontFamily', e.target.value)}
                disabled={savingBranding}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {FONT_OPTIONS.map((font) => (
                  <option key={font} value={font}>
                    {font}
                  </option>
                ))}
              </select>
              {brandingErrors.fontFamily && (
                <p className="mt-1 text-sm text-red-600">{brandingErrors.fontFamily}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">Font used in quote graphics</p>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-base font-semibold text-gray-900 mb-4">Preview</h3>
              <div
                className="relative w-full aspect-video rounded-lg overflow-hidden shadow-lg"
                style={{ backgroundColor: brandingData.colors.background }}
              >
                <div
                  className="absolute inset-0"
                  style={{
                    border: `20px solid ${brandingData.colors.primary}`,
                  }}
                >
                  <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                    <p
                      className="text-2xl sm:text-3xl md:text-4xl font-bold mb-4"
                      style={{
                        color: brandingData.colors.text,
                        fontFamily: brandingData.fontFamily,
                      }}
                    >
                      "This is a sample quote to preview your branding"
                    </p>
                    <p
                      className="text-lg sm:text-xl md:text-2xl"
                      style={{
                        color: brandingData.colors.secondary,
                        fontFamily: brandingData.fontFamily,
                      }}
                    >
                      — Speaker Name
                    </p>
                    <p
                      className="text-sm sm:text-base md:text-lg mt-2 opacity-70"
                      style={{
                        color: brandingData.colors.text,
                        fontFamily: brandingData.fontFamily,
                      }}
                    >
                      Episode Title
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="primary"
                loading={savingBranding}
                className="w-full sm:w-auto"
              >
                Save Branding
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TeamBrandingSettingsPage
