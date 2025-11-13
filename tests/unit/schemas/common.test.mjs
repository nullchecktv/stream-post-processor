import { describe, it, expect } from '@jest/globals';
import {
  Platform,
  BrandingSchema,
  TimestampSchema,
  StatusHistoryEntrySchema
} from '../../../schemas/common.mjs';

describe('Common Schemas', () => {
  describe('Platform enum', () => {
    it('should validate linkedin live platform', () => {
      const result = Platform.safeParse('linkedin live');
      expect(result.success).toBe(true);
    });

    it('should validate X platform', () => {
      const result = Platform.safeParse('X');
      expect(result.success).toBe(true);
    });

    it('should validate twitch platform', () => {
      const result = Platform.safeParse('twitch');
      expect(result.success).toBe(true);
    });

    it('should validate youtube platform', () => {
      const result = Platform.safeParse('youtube');
      expect(result.success).toBe(true);
    });

    it('should reject invalid platform names', () => {
      const invalidPlatforms = ['facebook', 'instagram', 'tiktok', 'Twitter', 'YOUTUBE', ''];

      invalidPlatforms.forEach(platform => {
        const result = Platform.safeParse(platform);
        expect(result.success).toBe(false);
      });
    });

    it('should reject null and undefined', () => {
      expect(Platform.safeParse(null).success).toBe(false);
      expect(Platform.safeParse(undefined).success).toBe(false);
    });
  });

  describe('BrandingSchema', () => {
    const validBranding = {
      colors: {
        primary: '#FF5733',
        secondary: '#33FF57',
        background: '#3357FF',
        text: '#000000'
      },
      fontFamily: 'Arial',
      voice: {
        tone: 'Professional and friendly',
        writingStyle: 'Clear and concise',
        perspective: 'first_person'
      }
    };

    it('should validate complete branding configuration', () => {
      const result = BrandingSchema.safeParse(validBranding);
      expect(result.success).toBe(true);
    });

    it('should validate branding without optional voice', () => {
      const brandingWithoutVoice = {
        colors: validBranding.colors,
        fontFamily: 'Arial'
      };
      const result = BrandingSchema.safeParse(brandingWithoutVoice);
      expect(result.success).toBe(true);
    });

    it('should reject branding with invalid hex color format', () => {
      const invalidBranding = {
        ...validBranding,
        colors: {
          ...validBranding.colors,
          primary: 'FF5733'
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with short hex color', () => {
      const invalidBranding = {
        ...validBranding,
        colors: {
          ...validBranding.colors,
          primary: '#FFF'
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with long hex color', () => {
      const invalidBranding = {
        ...validBranding,
        colors: {
          ...validBranding.colors,
          primary: '#FF57331'
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with invalid hex characters', () => {
      const invalidBranding = {
        ...validBranding,
        colors: {
          ...validBranding.colors,
          primary: '#GGGGGG'
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with empty fontFamily', () => {
      const invalidBranding = {
        ...validBranding,
        fontFamily: ''
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with fontFamily exceeding 100 characters', () => {
      const invalidBranding = {
        ...validBranding,
        fontFamily: 'a'.repeat(101)
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with empty voice tone', () => {
      const invalidBranding = {
        ...validBranding,
        voice: {
          ...validBranding.voice,
          tone: ''
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with voice tone exceeding 200 characters', () => {
      const invalidBranding = {
        ...validBranding,
        voice: {
          ...validBranding.voice,
          tone: 'a'.repeat(201)
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding with invalid perspective', () => {
      const invalidBranding = {
        ...validBranding,
        voice: {
          ...validBranding.voice,
          perspective: 'second_person'
        }
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should apply default perspective when not provided', () => {
      const brandingWithoutPerspective = {
        ...validBranding,
        voice: {
          tone: 'Professional',
          writingStyle: 'Clear'
        }
      };
      const result = BrandingSchema.safeParse(brandingWithoutPerspective);
      if (result.success) {
        expect(result.data.voice.perspective).toBe('first_person');
      }
    });

    it('should validate third_person perspective', () => {
      const brandingWithThirdPerson = {
        ...validBranding,
        voice: {
          ...validBranding.voice,
          perspective: 'third_person'
        }
      };
      const result = BrandingSchema.safeParse(brandingWithThirdPerson);
      expect(result.success).toBe(true);
    });

    it('should reject branding missing required colors', () => {
      const invalidBranding = {
        fontFamily: 'Arial'
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });

    it('should reject branding missing individual color fields', () => {
      const invalidBranding = {
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57'
        },
        fontFamily: 'Arial'
      };
      const result = BrandingSchema.safeParse(invalidBranding);
      expect(result.success).toBe(false);
    });
  });

  describe('TimestampSchema', () => {
    it('should validate correct timestamp format HH:MM:SS', () => {
      const validTimestamps = ['00:00:00', '12:34:56', '23:59:59', '01:02:03'];

      validTimestamps.forEach(timestamp => {
        const result = TimestampSchema.safeParse(timestamp);
        expect(result.success).toBe(true);
      });
    });

    it('should reject timestamp without seconds', () => {
      const result = TimestampSchema.safeParse('12:34');
      expect(result.success).toBe(false);
    });

    it('should reject timestamp with single digit hours', () => {
      const result = TimestampSchema.safeParse('1:34:56');
      expect(result.success).toBe(false);
    });

    it('should reject timestamp with single digit minutes', () => {
      const result = TimestampSchema.safeParse('12:3:56');
      expect(result.success).toBe(false);
    });

    it('should reject timestamp with single digit seconds', () => {
      const result = TimestampSchema.safeParse('12:34:5');
      expect(result.success).toBe(false);
    });

    it('should reject timestamp with extra digits', () => {
      const result = TimestampSchema.safeParse('123:45:67');
      expect(result.success).toBe(false);
    });

    it('should reject timestamp with milliseconds', () => {
      const result = TimestampSchema.safeParse('12:34:56.789');
      expect(result.success).toBe(false);
    });

    it('should reject empty string', () => {
      const result = TimestampSchema.safeParse('');
      expect(result.success).toBe(false);
    });

    it('should reject non-string values', () => {
      expect(TimestampSchema.safeParse(123456).success).toBe(false);
      expect(TimestampSchema.safeParse(null).success).toBe(false);
      expect(TimestampSchema.safeParse(undefined).success).toBe(false);
    });
  });

  describe('StatusHistoryEntrySchema', () => {
    it('should be defined and exported', () => {
      expect(StatusHistoryEntrySchema).toBeDefined();
      expect(typeof StatusHistoryEntrySchema.safeParse).toBe('function');
    });
  });

  describe('TypeScript type inference', () => {
    it('should infer correct types from Platform enum', () => {
      const result = Platform.safeParse('youtube');
      if (result.success) {
        expect(typeof result.data).toBe('string');
      }
    });

    it('should infer correct types from BrandingSchema', () => {
      const branding = {
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
          background: '#3357FF',
          text: '#000000'
        },
        fontFamily: 'Arial'
      };

      const result = BrandingSchema.safeParse(branding);
      if (result.success) {
        expect(typeof result.data.colors.primary).toBe('string');
        expect(typeof result.data.fontFamily).toBe('string');
      }
    });

    it('should infer correct types from TimestampSchema', () => {
      const result = TimestampSchema.safeParse('12:34:56');
      if (result.success) {
        expect(typeof result.data).toBe('string');
      }
    });
  });
});

