import { describe, test, expect } from 'vitest'
import { BrandVoiceSchema, EpisodeSchema, ProfileSchema, TeamSchema } from '../validation'

describe('Brand Voice Validation', () => {
  describe('BrandVoiceSchema', () => {
    test('should validate correct brand voice data', () => {
      const validData = {
        tone: 'professional and conversational',
        writingStyle: 'technical with practical examples'
      }

      const result = BrandVoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.tone).toBe('professional and conversational')
        expect(result.data.writingStyle).toBe('technical with practical examples')
      }
    })

    test('should reject missing tone', () => {
      const invalidData = {
        writingStyle: 'technical with examples'
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('tone')
      }
    })

    test('should reject missing writing style', () => {
      const invalidData = {
        tone: 'professional'
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('writingStyle')
      }
    })

    test('should reject empty tone', () => {
      const invalidData = {
        tone: '',
        writingStyle: 'technical'
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Tone is required')
      }
    })

    test('should reject empty writing style', () => {
      const invalidData = {
        tone: 'professional',
        writingStyle: ''
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Writing style is required')
      }
    })

    test('should reject tone exceeding max length', () => {
      const invalidData = {
        tone: 'a'.repeat(201),
        writingStyle: 'technical'
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be less than 200 characters')
      }
    })

    test('should reject writing style exceeding max length', () => {
      const invalidData = {
        tone: 'professional',
        writingStyle: 'a'.repeat(201)
      }

      const result = BrandVoiceSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('must be less than 200 characters')
      }
    })

    test('should accept tone at max length', () => {
      const validData = {
        tone: 'a'.repeat(200),
        writingStyle: 'technical'
      }

      const result = BrandVoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should accept writing style at max length', () => {
      const validData = {
        tone: 'professional',
        writingStyle: 'a'.repeat(200)
      }

      const result = BrandVoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should handle special characters in tone', () => {
      const validData = {
        tone: 'professional & conversational, yet authoritative!',
        writingStyle: 'technical'
      }

      const result = BrandVoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should handle special characters in writing style', () => {
      const validData = {
        tone: 'professional',
        writingStyle: 'technical with code examples (JavaScript, Python, etc.)'
      }

      const result = BrandVoiceSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })
  })

  describe('EpisodeSchema', () => {
    test('should validate correct episode data', () => {
      const validData = {
        title: 'Test Episode',
        episodeNumber: 1,
        description: 'Test description',
        airDate: '2025-01-15T10:00:00Z',
        platforms: ['youtube', 'twitch'],
        themes: ['technology', 'programming'],
        seriesName: 'Tech Talk'
      }

      const result = EpisodeSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject missing title', () => {
      const invalidData = {
        episodeNumber: 1
      }

      const result = EpisodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    test('should reject negative episode number', () => {
      const invalidData = {
        title: 'Test',
        episodeNumber: -1
      }

      const result = EpisodeSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('ProfileSchema', () => {
    test('should validate correct profile data', () => {
      const validData = {
        name: 'John Doe',
        preferences: {
          timezone: 'America/New_York',
          notifications: true
        }
      }

      const result = ProfileSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject missing name', () => {
      const invalidData = {
        preferences: {}
      }

      const result = ProfileSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })

  describe('TeamSchema', () => {
    test('should validate correct team data', () => {
      const validData = {
        name: 'My Team',
        description: 'Team description',
        settings: {
          defaultPlatforms: ['youtube'],
          timezone: 'America/New_York'
        }
      }

      const result = TeamSchema.safeParse(validData)
      expect(result.success).toBe(true)
    })

    test('should reject missing name', () => {
      const invalidData = {
        description: 'Test'
      }

      const result = TeamSchema.safeParse(invalidData)
      expect(result.success).toBe(false)
    })
  })
})
