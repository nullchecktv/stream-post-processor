import { useState, useEffect, memo, useCallback } from 'react'
import { Button } from '../common/Button'
import { EpisodeStatusChip } from './EpisodeStatusChip'
import { formatDate } from '../../utils/date'
import type { EpisodeDetail, Platform } from '../../types'
import type { EpisodeUpdate } from '@schemas/episodes'

interface EpisodeHeaderProps {
  episode: EpisodeDetail
  onUpdate: (updates: EpisodeUpdate) => Promise<void>
  isUpdating?: boolean
}

const PLATFORM_OPTIONS: Platform[] = ['linkedin live', 'X', 'twitch', 'youtube']

function EpisodeHeaderComponent({ episode, onUpdate, isUpdating = false }: EpisodeHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState<Partial<EpisodeUpdate>>({})
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  useEffect(() => {
    if (!isEditing) return

    const hasChanges =
      editedData.title !== episode.title ||
      editedData.episodeNumber !== episode.episodeNumber ||
      editedData.description !== (episode.description || '') ||
      editedData.airDate !== (episode.airDate || '') ||
      JSON.stringify(editedData.platforms) !== JSON.stringify(episode.platforms || []) ||
      JSON.stringify(editedData.themes) !== JSON.stringify(episode.themes || []) ||
      editedData.seriesName !== (episode.seriesName || '') ||
      JSON.stringify(editedData.speakers) !== JSON.stringify(episode.speakers || [])

    setHasUnsavedChanges(hasChanges)
  }, [editedData, episode, isEditing])

  const handleEdit = useCallback(() => {
    setEditedData({
      title: episode.title,
      episodeNumber: episode.episodeNumber,
      description: episode.description || '',
      airDate: episode.airDate || '',
      platforms: episode.platforms || [],
      themes: episode.themes || [],
      seriesName: episode.seriesName || '',
      speakers: episode.speakers || []
    })
    setValidationErrors({})
    setHasUnsavedChanges(false)
    setIsEditing(true)
  }, [episode])

  const handleCancel = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm('You have unsaved changes. Are you sure you want to cancel?')
      if (!confirmed) return
    }

    setIsEditing(false)
    setEditedData({})
    setValidationErrors({})
    setHasUnsavedChanges(false)
  }, [hasUnsavedChanges])

  const validateField = (field: string, value: any): string | null => {
    switch (field) {
      case 'title':
        if (!value || value.trim().length === 0) {
          return 'Title is required'
        }
        if (value.length > 200) {
          return 'Title must not exceed 200 characters'
        }
        break

      case 'episodeNumber':
        if (value === undefined || value === null || value === '') {
          return 'Episode number is required'
        }
        if (value < 1) {
          return 'Episode number must be a positive integer'
        }
        if (!Number.isInteger(Number(value))) {
          return 'Episode number must be an integer'
        }
        break

      case 'description':
        if (value && value.length > 1000) {
          return 'Description must not exceed 1000 characters'
        }
        break

      case 'airDate':
        if (value) {
          try {
            const date = new Date(value)
            if (isNaN(date.getTime())) {
              return 'Air date must be a valid date'
            }
          } catch {
            return 'Air date must be a valid date'
          }
        }
        break

      case 'platforms':
        if (value && !Array.isArray(value)) {
          return 'Invalid platform selection'
        }
        break

      case 'themes':
        if (value && !Array.isArray(value)) {
          return 'Invalid themes'
        }
        if (value && value.length > 10) {
          return 'Maximum 10 themes allowed'
        }
        break

      case 'seriesName':
        if (value && value.length > 100) {
          return 'Series name must not exceed 100 characters'
        }
        break

      case 'speakers':
        if (value && !Array.isArray(value)) {
          return 'Invalid speakers'
        }
        if (value && value.length > 20) {
          return 'Maximum 20 speakers allowed'
        }
        if (value && value.some((s: string) => s.length > 100)) {
          return 'Speaker name must not exceed 100 characters'
        }
        break
    }

    return null
  }

  const handleFieldBlur = (field: string, value: any) => {
    const error = validateField(field, value)
    setValidationErrors(prev => {
      const newErrors = { ...prev }
      if (error) {
        newErrors[field] = error
      } else {
        delete newErrors[field]
      }
      return newErrors
    })
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    const titleError = validateField('title', editedData.title)
    if (titleError) errors.title = titleError

    const episodeNumberError = validateField('episodeNumber', editedData.episodeNumber)
    if (episodeNumberError) errors.episodeNumber = episodeNumberError

    const descriptionError = validateField('description', editedData.description)
    if (descriptionError) errors.description = descriptionError

    const airDateError = validateField('airDate', editedData.airDate)
    if (airDateError) errors.airDate = airDateError

    const platformsError = validateField('platforms', editedData.platforms)
    if (platformsError) errors.platforms = platformsError

    const themesError = validateField('themes', editedData.themes)
    if (themesError) errors.themes = themesError

    const seriesNameError = validateField('seriesName', editedData.seriesName)
    if (seriesNameError) errors.seriesName = seriesNameError

    const speakersError = validateField('speakers', editedData.speakers)
    if (speakersError) errors.speakers = speakersError

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSave = async () => {
    if (!validateForm()) return

    setIsSaving(true)
    try {
      const updates: EpisodeUpdate = {}

      if (editedData.title !== undefined && editedData.title !== episode.title) {
        updates.title = editedData.title
      }
      if (editedData.episodeNumber !== undefined && editedData.episodeNumber !== episode.episodeNumber) {
        updates.episodeNumber = editedData.episodeNumber
      }
      if (editedData.description !== undefined && editedData.description !== (episode.description || '')) {
        updates.description = editedData.description || undefined
      }
      if (editedData.airDate !== undefined && editedData.airDate !== (episode.airDate || '')) {
        updates.airDate = editedData.airDate || undefined
      }
      if (editedData.platforms !== undefined) {
        updates.platforms = editedData.platforms.length > 0 ? editedData.platforms : undefined
      }
      if (editedData.themes !== undefined) {
        updates.themes = editedData.themes.length > 0 ? editedData.themes : undefined
      }
      if (editedData.seriesName !== undefined && editedData.seriesName !== (episode.seriesName || '')) {
        updates.seriesName = editedData.seriesName || undefined
      }
      if (editedData.speakers !== undefined) {
        updates.speakers = editedData.speakers.length > 0 ? editedData.speakers : undefined
      }

      await onUpdate(updates)
      setIsEditing(false)
      setEditedData({})
      setValidationErrors({})
      setHasUnsavedChanges(false)
    } catch (error) {
      console.error('Failed to update episode:', error)
    } finally {
      setIsSaving(false)
    }
  }

  const handlePlatformToggle = (platform: Platform) => {
    const currentPlatforms = editedData.platforms || []
    const newPlatforms = currentPlatforms.includes(platform)
      ? currentPlatforms.filter((p: Platform) => p !== platform)
      : [...currentPlatforms, platform]
    setEditedData({ ...editedData, platforms: newPlatforms })
  }

  const handleThemeAdd = (theme: string) => {
    if (!theme.trim()) return
    const currentThemes = editedData.themes || []

    if (currentThemes.length >= 10) {
      setValidationErrors(prev => ({ ...prev, themes: 'Maximum 10 themes allowed' }))
      return
    }

    if (!currentThemes.includes(theme.trim())) {
      const newThemes = [...currentThemes, theme.trim()]
      setEditedData({ ...editedData, themes: newThemes })
      handleFieldBlur('themes', newThemes)
    }
  }

  const handleThemeRemove = (theme: string) => {
    const currentThemes = editedData.themes || []
    setEditedData({ ...editedData, themes: currentThemes.filter((t: string) => t !== theme) })
  }

  const handleSpeakerAdd = (speaker: string) => {
    if (!speaker.trim()) return
    const currentSpeakers = editedData.speakers || []

    if (currentSpeakers.length >= 20) {
      setValidationErrors(prev => ({ ...prev, speakers: 'Maximum 20 speakers allowed' }))
      return
    }

    if (speaker.trim().length > 100) {
      setValidationErrors(prev => ({ ...prev, speakers: 'Speaker name must not exceed 100 characters' }))
      return
    }

    if (!currentSpeakers.includes(speaker.trim())) {
      const newSpeakers = [...currentSpeakers, speaker.trim()]
      setEditedData({ ...editedData, speakers: newSpeakers })
      handleFieldBlur('speakers', newSpeakers)
    }
  }

  const handleSpeakerRemove = (speaker: string) => {
    const currentSpeakers = editedData.speakers || []
    setEditedData({ ...editedData, speakers: currentSpeakers.filter((s: string) => s !== speaker) })
  }

  if (isEditing) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="title"
                type="text"
                value={editedData.title || ''}
                onChange={(e) => setEditedData({ ...editedData, title: e.target.value })}
                onBlur={(e) => handleFieldBlur('title', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  validationErrors.title ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-invalid={!!validationErrors.title}
                aria-describedby={validationErrors.title ? 'title-error' : undefined}
              />
              {validationErrors.title && (
                <div id="title-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {validationErrors.title}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="episodeNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Episode Number <span className="text-red-500">*</span>
              </label>
              <input
                id="episodeNumber"
                type="number"
                value={editedData.episodeNumber || ''}
                onChange={(e) => setEditedData({ ...editedData, episodeNumber: parseInt(e.target.value) || 0 })}
                onBlur={(e) => handleFieldBlur('episodeNumber', parseInt(e.target.value) || 0)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  validationErrors.episodeNumber ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-invalid={!!validationErrors.episodeNumber}
                aria-describedby={validationErrors.episodeNumber ? 'episodeNumber-error' : undefined}
              />
              {validationErrors.episodeNumber && (
                <div id="episodeNumber-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {validationErrors.episodeNumber}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="seriesName" className="block text-sm font-medium text-gray-700 mb-1">
                Series Name
              </label>
              <input
                id="seriesName"
                type="text"
                value={editedData.seriesName || ''}
                onChange={(e) => setEditedData({ ...editedData, seriesName: e.target.value })}
                onBlur={(e) => handleFieldBlur('seriesName', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md text-sm ${
                  validationErrors.seriesName ? 'border-red-500' : 'border-gray-300'
                } focus:outline-none focus:ring-2 focus:ring-blue-500`}
                aria-invalid={!!validationErrors.seriesName}
                aria-describedby={validationErrors.seriesName ? 'seriesName-error' : undefined}
              />
              {validationErrors.seriesName && (
                <div id="seriesName-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                  <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {validationErrors.seriesName}
                </div>
              )}
            </div>
          </div>
          <div className="ml-4 flex items-center gap-2">
            <EpisodeStatusChip status={episode.status as any} size="md" showIcon />
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="airDate" className="block text-sm font-medium text-gray-700 mb-1">
              Air Date
            </label>
            <input
              id="airDate"
              type="datetime-local"
              value={editedData.airDate ? new Date(editedData.airDate).toISOString().slice(0, 16) : ''}
              onChange={(e) => setEditedData({ ...editedData, airDate: e.target.value ? new Date(e.target.value).toISOString() : '' })}
              onBlur={(e) => handleFieldBlur('airDate', e.target.value ? new Date(e.target.value).toISOString() : '')}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                validationErrors.airDate ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-invalid={!!validationErrors.airDate}
              aria-describedby={validationErrors.airDate ? 'airDate-error' : undefined}
            />
            {validationErrors.airDate && (
              <div id="airDate-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.airDate}
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Platforms
            </label>
            <div className="flex flex-wrap gap-2">
              {PLATFORM_OPTIONS.map((platform) => (
                <label key={platform} className="inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={(editedData.platforms || []).includes(platform)}
                    onChange={() => handlePlatformToggle(platform)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">{platform}</span>
                </label>
              ))}
            </div>
            {validationErrors.platforms && (
              <div className="flex items-center text-red-600 text-xs mt-1" role="alert">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.platforms}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="themes" className="block text-sm font-medium text-gray-700 mb-1">
              Themes {(editedData.themes || []).length > 0 && (
                <span className="text-xs text-gray-500">({(editedData.themes || []).length}/10)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedData.themes || []).map((theme: string) => (
                <span
                  key={theme}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                >
                  {theme}
                  <button
                    type="button"
                    onClick={() => handleThemeRemove(theme)}
                    className="ml-1 text-primary hover:text-primary/80"
                    aria-label={`Remove ${theme} theme`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              id="themes"
              type="text"
              placeholder="Add theme and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleThemeAdd(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                validationErrors.themes ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-invalid={!!validationErrors.themes}
              aria-describedby={validationErrors.themes ? 'themes-error' : undefined}
            />
            {validationErrors.themes && (
        <div id="themes-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.themes}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="speakers" className="block text-sm font-medium text-gray-700 mb-1">
              Speakers {(editedData.speakers || []).length > 0 && (
                <span className="text-xs text-gray-500">({(editedData.speakers || []).length}/20)</span>
              )}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {(editedData.speakers || []).map((speaker: string) => (
                <span
                  key={speaker}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                >
                  {speaker}
                  <button
                    type="button"
                    onClick={() => handleSpeakerRemove(speaker)}
                    className="ml-1 text-green-800 hover:text-green-600"
                    aria-label={`Remove ${speaker} speaker`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <input
              id="speakers"
              type="text"
              placeholder="Add speaker name and press Enter"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSpeakerAdd(e.currentTarget.value)
                  e.currentTarget.value = ''
                }
              }}
              onBlur={(e) => {
                if (e.target.value.trim()) {
                  handleSpeakerAdd(e.target.value)
                  e.target.value = ''
                }
              }}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                validationErrors.speakers ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-invalid={!!validationErrors.speakers}
              aria-describedby={validationErrors.speakers ? 'speakers-error' : undefined}
            />
            {validationErrors.speakers && (
              <div id="speakers-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.speakers}
              </div>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
              Description {editedData.description && (
                <span className="text-xs text-gray-500">({editedData.description.length}/1000)</span>
              )}
            </label>
            <textarea
              id="description"
              value={editedData.description || ''}
              onChange={(e) => setEditedData({ ...editedData, description: e.target.value })}
              onBlur={(e) => handleFieldBlur('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-md text-sm ${
                validationErrors.description ? 'border-red-500' : 'border-gray-300'
              } focus:outline-none focus:ring-2 focus:ring-blue-500`}
              aria-invalid={!!validationErrors.description}
              aria-describedby={validationErrors.description ? 'description-error' : undefined}
            />
            {validationErrors.description && (
              <div id="description-error" className="flex items-center text-red-600 text-xs mt-1" role="alert">
                <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {validationErrors.description}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button
            onClick={handleSave}
            disabled={isSaving || isUpdating}
            variant="primary"
            size="sm"
            aria-label={isSaving ? 'Saving changes...' : 'Save changes'}
            aria-busy={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSaving || isUpdating}
            variant="ghost"
            size="sm"
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-gray-900">
              Episode #{episode.episodeNumber}: {episode.title}
            </h1>
            <EpisodeStatusChip status={episode.status as any} size="md" showIcon />
          </div>
          {episode.seriesName && (
            <p className="text-sm text-gray-600">Series: {episode.seriesName}</p>
          )}
        </div>
        <Button
          onClick={handleEdit}
          variant="ghost"
          size="sm"
          aria-label="Edit episode details"
          aria-expanded={isEditing}
        >
          <svg className="w-4 h-4" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
        <div className="flex items-start">
          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
          </svg>
          <div>
            <span className="text-gray-500">Episode Number</span>
            <p className="text-gray-900 font-medium">#{episode.episodeNumber}</p>
          </div>
        </div>

        {episode.airDate && (
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <div>
              <span className="text-gray-500">Aired</span>
              <p className="text-gray-900 font-medium">{formatDate(episode.airDate)}</p>
            </div>
          </div>
        )}

        {episode.platforms && episode.platforms.length > 0 && (
          <div className="flex items-start">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <div>
              <span className="text-gray-500">Platforms</span>
              <p className="text-gray-900 font-medium">{episode.platforms.join(', ')}</p>
            </div>
          </div>
        )}

        {episode.themes && episode.themes.length > 0 && (
          <div className="flex items-start col-span-2">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <div>
              <span className="text-gray-500">Themes</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {episode.themes.map((theme) => (
                  <span
                    key={theme}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {theme}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {episode.speakers && episode.speakers.length > 0 && (
          <div className="flex items-start col-span-2">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <div>
              <span className="text-gray-500">Speakers</span>
              <div className="flex flex-wrap gap-2 mt-1">
                {episode.speakers.map((speaker) => (
                  <span
                    key={speaker}
                    className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800"
                  >
                    {speaker}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {episode.description && (
          <div className="flex items-start col-span-2 pt-3 border-t border-gray-200">
            <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
              <path d="M4 6h16M4 12h16M4 18h7" />
            </svg>
            <div>
              <span className="text-gray-500">Description</span>
              <p className="text-gray-900 mt-1 whitespace-pre-wrap">{episode.description}</p>
            </div>
          </div>
        )}

        <div className="flex items-start">
          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <span className="text-gray-500">Created</span>
            <p className="text-gray-900 font-medium">{formatDate(episode.createdAt)}</p>
          </div>
        </div>

        <div className="flex items-start">
          <svg className="w-4 h-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <div>
            <span className="text-gray-500">Updated</span>
            <p className="text-gray-900 font-medium">{formatDate(episode.updatedAt)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export const EpisodeHeader = memo(EpisodeHeaderComponent)

