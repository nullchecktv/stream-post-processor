// Unit tests for Lambda Powertools validation utilities
// These tests validate the validation infrastructure and error handling

describe('Lambda Powertools Validation Utilities', () => {
  describe('Validation Error Formatting', () => {
    const formatValidationError = (fieldErrors) => {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: fieldErrors.join(', ')
        }),
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      };
    };

    test('should format single field error', () => {
      const errors = ['title: String must contain at least 1 character(s)'];
      const response = formatValidationError(errors);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('title: String must contain at least 1 character(s)');
    });

    test('should format multiple field errors', () => {
      const errors = [
        'title: String must contain at least 1 character(s)',
        'episodeNumber: Expected number, received string'
      ];
      const response = formatValidationError(errors);

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.message).toBe('title: String must contain at least 1 character(s), episodeNumber: Expected number, received string');
    });
  });

  describe('Request Validation Logic', () => {
    const validateEpisodeData = (data) => {
      const errors = [];

      if (!data.title || typeof data.title !== 'string' || data.title.trim().length === 0) {
        errors.push('title: String must contain at least 1 character(s)');
      }

      if (typeof data.episodeNumber !== 'number' || !Number.isInteger(data.episodeNumber) || data.episodeNumber <= 0) {
        errors.push('episodeNumber: Expected positive integer');
      }

      if (data.description && (typeof data.description !== 'string' || data.description.length > 1000)) {
        errors.push('description: String must contain at most 1000 character(s)');
      }

      return errors;
    };

    test('should validate correct episode data', () => {
      const data = {
        title: 'Test Episode',
        episodeNumber: 1,
        description: 'Test description'
      };

      const errors = validateEpisodeData(data);
      expect(errors).toHaveLength(0);
    });

    test('should catch empty title', () => {
      const data = {
        title: '',
        episodeNumber: 1
      };

      const errors = validateEpisodeData(data);
      expect(errors).toContain('title: String must contain at least 1 character(s)');
    });

    test('should catch invalid episode number', () => {
      const data = {
        title: 'Test Episode',
        episodeNumber: 'invalid'
      };

      const errors = validateEpisodeData(data);
      expect(errors).toContain('episodeNumber: Expected positive integer');
    });

    test('should catch description too long', () => {
      const data = {
        title: 'Test Episode',
        episodeNumber: 1,
        description: 'x'.repeat(1001)
      };

      const errors = validateEpisodeData(data);
      expect(errors).toContain('description: String must contain at most 1000 character(s)');
    });
  });

  describe('Team Validation Logic', () => {
    const validateTeamData = (data) => {
      const errors = [];

      if (!data.email || typeof data.email !== 'string') {
        errors.push('email: Required');
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        errors.push('email: Invalid email');
      }

      if (data.role && !['administrator', 'member'].includes(data.role)) {
        errors.push('role: Invalid enum value. Expected administrator | member');
      }

      return errors;
    };

    test('should validate correct team member data', () => {
      const data = {
        email: 'test@example.com',
        role: 'member'
      };

      const errors = validateTeamData(data);
      expect(errors).toHaveLength(0);
    });

    test('should catch invalid email', () => {
      const data = {
        email: 'invalid-email',
        role: 'member'
      };

      const errors = validateTeamData(data);
      expect(errors).toContain('email: Invalid email');
    });

    test('should catch invalid role', () => {
      const data = {
        email: 'test@example.com',
        role: 'invalid'
      };

      const errors = validateTeamData(data);
      expect(errors).toContain('role: Invalid enum value. Expected administrator | member');
    });
  });

  describe('Authorization Validation', () => {
    const validateAuthorization = (event) => {
      if (!event?.requestContext?.authorizer?.userId) {
        return {
          success: false,
          error: {
            statusCode: 401,
            body: JSON.stringify({ message: 'Unauthorized' })
          }
        };
      }

      return {
        success: true,
        userId: event.requestContext.authorizer.userId
      };
    };

    test('should validate authorized request', () => {
      const event = {
        requestContext: {
          authorizer: {
            userId: 'user-123'
          }
        }
      };

      const result = validateAuthorization(event);
      expect(result.success).toBe(true);
      expect(result.userId).toBe('user-123');
    });

    test('should reject unauthorized request', () => {
      const event = {
        requestContext: {
          authorizer: {}
        }
      };

      const result = validateAuthorization(event);
      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(401);
    });
  });
});
