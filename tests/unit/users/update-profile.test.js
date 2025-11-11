process.env.TABLE_NAME = 'test-table';

describe('Update Profile Function', () => {
  describe('Branding Support', () => {
    const validateBranding = (branding) => {
      if (!branding) return true;

      if (!branding.colors || !branding.fontFamily) {
        return false;
      }

      const hexPattern = /^#[0-9A-Fa-f]{6}$/;
      const requiredColors = ['primary', 'secondary', 'background', 'text'];

      for (const color of requiredColors) {
        if (!branding.colors[color] || !hexPattern.test(branding.colors[color])) {
          return false;
        }
      }

      if (typeof branding.fontFamily !== 'string' || branding.fontFamily.length === 0) {
        return false;
      }

      return true;
    };

    test('should validate correct branding configuration', () => {
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          background: '#1F2937',
          text: '#F9FAFB'
        },
        fontFamily: 'Inter'
      };

      expect(validateBranding(branding)).toBe(true);
    });

    test('should reject invalid hex color codes', () => {
      const branding = {
        colors: {
          primary: 'blue',
          secondary: '#8B5CF6',
          background: '#1F2937',
          text: '#F9FAFB'
        },
        fontFamily: 'Inter'
      };

      expect(validateBranding(branding)).toBe(false);
    });

    test('should reject missing color fields', () => {
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6'
        },
        fontFamily: 'Inter'
      };

      expect(validateBranding(branding)).toBe(false);
    });

    test('should reject empty fontFamily', () => {
      const branding = {
        colors: {
          primary: '#3B82F6',
          secondary: '#8B5CF6',
          background: '#1F2937',
          text: '#F9FAFB'
        },
        fontFamily: ''
      };

      expect(validateBranding(branding)).toBe(false);
    });

    test('should accept undefined branding', () => {
      expect(validateBranding(undefined)).toBe(true);
    });
  });

  describe('Profile Update Logic', () => {
    const updateProfile = (existingProfile, updates) => {
      const updatedProfile = {
        ...existingProfile,
        updatedAt: new Date().toISOString()
      };

      if (updates.name !== undefined) {
        updatedProfile.name = String(updates.name || '').trim();
      }

      if (updates.preferences !== undefined) {
        updatedProfile.preferences = {
          ...existingProfile.preferences,
          ...updates.preferences
        };
      }

      if (updates.branding !== undefined) {
        updatedProfile.branding = updates.branding;
      }

      return updatedProfile;
    };

    test('should update branding in user profile', () => {
      const existingProfile = {
        pk: 'user#user-123',
        sk: 'profile',
        email: 'user@example.com',
        name: 'John Doe',
        preferences: {
          timezone: 'UTC',
          notifications: true
        },
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = {
        branding: {
          colors: {
            primary: '#3B82F6',
            secondary: '#8B5CF6',
            background: '#1F2937',
            text: '#F9FAFB'
          },
          fontFamily: 'Inter'
        }
      };

      const result = updateProfile(existingProfile, updates);

      expect(result.branding).toEqual(updates.branding);
      expect(result.name).toBe('John Doe');
      expect(result.preferences).toEqual(existingProfile.preferences);
    });

    test('should update branding without affecting other fields', () => {
      const existingProfile = {
        pk: 'user#user-123',
        sk: 'profile',
        email: 'user@example.com',
        name: 'John Doe',
        preferences: {
          timezone: 'America/New_York',
          notifications: false
        },
        branding: {
          colors: {
            primary: '#FF0000',
            secondary: '#00FF00',
            background: '#0000FF',
            text: '#FFFFFF'
          },
          fontFamily: 'Roboto'
        },
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = {
        branding: {
          colors: {
            primary: '#3B82F6',
            secondary: '#8B5CF6',
            background: '#1F2937',
            text: '#F9FAFB'
          },
          fontFamily: 'Inter'
        }
      };

      const result = updateProfile(existingProfile, updates);

      expect(result.branding).toEqual(updates.branding);
      expect(result.name).toBe('John Doe');
      expect(result.preferences.timezone).toBe('America/New_York');
      expect(result.preferences.notifications).toBe(false);
    });

    test('should update multiple fields including branding', () => {
      const existingProfile = {
        pk: 'user#user-123',
        sk: 'profile',
        email: 'user@example.com',
        name: 'John Doe',
        preferences: {
          timezone: 'UTC',
          notifications: true
        },
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = {
        name: 'Jane Smith',
        preferences: {
          timezone: 'America/Los_Angeles'
        },
        branding: {
          colors: {
            primary: '#3B82F6',
            secondary: '#8B5CF6',
            background: '#1F2937',
            text: '#F9FAFB'
          },
          fontFamily: 'Inter'
        }
      };

      const result = updateProfile(existingProfile, updates);

      expect(result.name).toBe('Jane Smith');
      expect(result.preferences.timezone).toBe('America/Los_Angeles');
      expect(result.preferences.notifications).toBe(true);
      expect(result.branding).toEqual(updates.branding);
    });

    test('should not add branding if not provided', () => {
      const existingProfile = {
        pk: 'user#user-123',
        sk: 'profile',
        email: 'user@example.com',
        name: 'John Doe',
        preferences: {
          timezone: 'UTC',
          notifications: true
        },
        createdAt: '2025-01-15T10:30:00Z',
        updatedAt: '2025-01-15T10:30:00Z'
      };

      const updates = {
        name: 'Jane Smith'
      };

      const result = updateProfile(existingProfile, updates);

      expect(result.name).toBe('Jane Smith');
      expect(result.branding).toBeUndefined();
    });
  });
});
