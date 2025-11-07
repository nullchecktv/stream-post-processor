const {
  EpisodeSchemas,
  TrackSchemas,
  TranscriptSchemas,
  TeamSchemas,
  ClipSchemas,
  UserSchemas,
  NotificationSchemas,
  InvitationSchemas
} = require('../../../functions/utils/schemas.mjs');

describe('Schema Definitions', () => {
  describe('EpisodeSchemas', () => {
    describe('create schema', () => {
      test('should validate correct episode creation data', () => {
        const validData = {
          title: 'Test Episode',
          episodeNumber: 1,
          description: 'Test description',
          airDate: '2025-01-15T10:30:00Z',
          platforms: ['twitch', 'youtube'],
          themes: ['technology', 'programming'],
          seriesName: 'Test Series'
        };

        expect(() => {
          // Schema validation would happen in the actual validation function
          // Here we're testing the schema structure
          expect(EpisodeSchemas.create.properties.title.type).toBe('string');
          expect(EpisodeSchemas.create.properties.episodeNumber.type).toBe('integer');
          expect(EpisodeSchemas.create.required).toContain('title');
          expect(EpisodeSchemas.create.required).toContain('episodeNumber');
        }).not.toThrow();
      });

      test('should have correct validation rules', () => {
        const schema = EpisodeSchemas.create;

        expect(schema.properties.title.minLength).toBe(1);
        expect(schema.properties.title.maxLength).toBe(200);
        expect(schema.properties.episodeNumber.minimum).toBe(1);
        expect(schema.properties.description.maxLength).toBe(1000);
        expect(schema.properties.platforms.items.enum).toContain('twitch');
        expect(schema.properties.platforms.items.enum).toContain('youtube');
        expect(schema.properties.seriesName.maxLength).toBe(100);
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe('pathParameters schema', () => {
      test('should validate episode ID format', () => {
        const schema = EpisodeSchemas.pathParameters;

        expect(schema.properties.episodeId.type).toBe('string');
        expect(schema.required).toContain('episodeId');
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe('statusUpdate schema', () => {
      test('should only allow specific status values', () => {
        const schema = EpisodeSchemas.statusUpdate;

        expect(schema.properties.status.enum).toEqual(['Ready for Clip Gen']);
        expect(schema.required).toContain('status');
        expect(schema.additionalProperties).toBe(false);
      });
    });
  });

  describe('TrackSchemas', () => {
    describe('create schema', () => {
      test('should validate track creation data', () => {
        const schema = TrackSchemas.create;

        expect(schema.properties.filename.type).toBe('string');
        expect(schema.properties.filename.minLength).toBe(1);
        expect(schema.properties.filename.maxLength).toBe(255);
        expect(schema.properties.trackName.type).toBe('string');
        expect(schema.properties.trackName.pattern).toBe('^[a-zA-Z0-9_-]+$');
        expect(schema.properties.speakers.type).toBe('array');
        expect(schema.required).toContain('filename');
        expect(schema.required).toContain('trackName');
      });
    });

    describe('pathParameters schema', () => {
      test('should validate episode and track parameters', () => {
        const schema = TrackSchemas.pathParameters;

        expect(schema.properties.trackName.minLength).toBe(1);
        expect(schema.required).toContain('episodeId');
        expect(schema.required).toContain('trackName');
      });
    });

    describe('signParts schema', () => {
      test('should validate multipart upload parameters', () => {
        const schema = TrackSchemas.signParts;

        expect(schema.properties.uploadId.type).toBe('string');
        expect(schema.properties.partNumbers.type).toBe('array');
        expect(schema.properties.partNumbers.items.type).toBe('integer');
        expect(schema.properties.partNumbers.items.minimum).toBe(1);
        expect(schema.required).toContain('uploadId');
        expect(schema.required).toContain('partNumbers');
      });
    });

    describe('complete schema', () => {
      test('should validate completion parameters', () => {
        const schema = TrackSchemas.complete;

        expect(schema.properties.uploadId.type).toBe('string');
        expect(schema.properties.parts.type).toBe('array');
        expect(schema.properties.parts.items.properties.ETag.type).toBe('string');
        expect(schema.properties.parts.items.properties.PartNumber.type).toBe('integer');
        expect(schema.properties.parts.items.required).toContain('ETag');
        expect(schema.properties.parts.items.required).toContain('PartNumber');
      });
    });
  });

  describe('TeamSchemas', () => {
    describe('create schema', () => {
      test('should validate team creation data', () => {
        const schema = TeamSchemas.create;

        expect(schema.properties.name.type).toBe('string');
        expect(schema.properties.name.minLength).toBe(1);
        expect(schema.properties.name.maxLength).toBe(100);
        expect(schema.properties.description.maxLength).toBe(500);
        expect(schema.properties.settings.properties.defaultPlatforms.type).toBe('array');
        expect(schema.required).toContain('name');
      });
    });

    describe('addMember schema', () => {
      test('should validate member addition data', () => {
        const schema = TeamSchemas.addMember;

        expect(schema.properties.email.type).toBe('string');
        expect(schema.properties.email.format).toBe('email');
        expect(schema.properties.role.enum).toContain('administrator');
        expect(schema.properties.role.enum).toContain('member');
        expect(schema.properties.role.default).toBe('member');
        expect(schema.required).toContain('email');
      });
    });

    describe('updateMemberRole schema', () => {
      test('should validate role update data', () => {
        const schema = TeamSchemas.updateMemberRole;

        expect(schema.properties.role.enum).toEqual(['administrator', 'member']);
        expect(schema.required).toContain('role');
      });
    });
  });

  describe('NotificationSchemas', () => {
    describe('list schema', () => {
      test('should validate notification list parameters', () => {
        const schema = NotificationSchemas.list;

        expect(schema.properties.limit.type).toBe('integer');
        expect(schema.properties.limit.minimum).toBe(1);
        expect(schema.properties.limit.maximum).toBe(100);
        expect(schema.properties.limit.default).toBe(20);
        expect(schema.properties.nextToken.type).toBe('string');
        expect(schema.properties.isRead.enum).toEqual(['true', 'false']);
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe('pathParameters schema', () => {
      test('should validate notification ID parameter', () => {
        const schema = NotificationSchemas.pathParameters;

        expect(schema.properties.notificationId.type).toBe('string');
        expect(schema.properties.notificationId.minLength).toBe(1);
        expect(schema.required).toContain('notificationId');
      });
    });

    describe('delete schema', () => {
      test('should validate delete parameters', () => {
        const schema = NotificationSchemas.delete;

        expect(schema.properties.isRead.enum).toEqual(['true']);
        expect(schema.additionalProperties).toBe(false);
      });
    });
  });

  describe('InvitationSchemas', () => {
    describe('pathParameters schema', () => {
      test('should validate invitation ID parameter', () => {
        const schema = InvitationSchemas.pathParameters;

        expect(schema.properties.invitationId.type).toBe('string');
        expect(schema.properties.invitationId.minLength).toBe(1);
        expect(schema.required).toContain('invitationId');
      });
    });

    describe('makeDecision schema', () => {
      test('should validate decision actions', () => {
        const schema = InvitationSchemas.makeDecision;

        expect(schema.properties.action.enum).toEqual(['accept', 'reject']);
        expect(schema.required).toContain('action');
        expect(schema.additionalProperties).toBe(false);
      });
    });
  });

  describe('ClipSchemas', () => {
    describe('pathParameters schema', () => {
      test('should validate clip path parameters', () => {
        const schema = ClipSchemas.pathParameters;

        expect(schema.properties.clipId.type).toBe('string');
        expect(schema.required).toContain('episodeId');
        expect(schema.required).toContain('clipId');
      });
    });

    describe('statusUpdate schema', () => {
      test('should validate clip status values', () => {
        const schema = ClipSchemas.statusUpdate;
        const expectedStatuses = [
          'detected', 'processing', 'processed', 'failed',
          'reviewed', 'approved', 'rejected', 'published'
        ];

        expect(schema.properties.status.enum).toEqual(expectedStatuses);
        expect(schema.required).toContain('status');
      });
    });
  });

  describe('UserSchemas', () => {
    describe('updateProfile schema', () => {
      test('should validate profile update data', () => {
        const schema = UserSchemas.updateProfile;

        expect(schema.properties.name.type).toBe('string');
        expect(schema.properties.name.maxLength).toBe(100);
        expect(schema.properties.preferences.properties.timezone.type).toBe('string');
        expect(schema.properties.preferences.properties.notifications.type).toBe('boolean');
        expect(schema.additionalProperties).toBe(false);
      });
    });

    describe('setActiveTeam schema', () => {
      test('should validate active team setting', () => {
        const schema = UserSchemas.setActiveTeam;

        expect(schema.properties.teamId.type).toEqual(['string', 'null']);
        expect(schema.properties.teamId.minLength).toBe(1);
        expect(schema.required).toContain('teamId');
      });
    });
  });

  describe('Schema consistency', () => {
    test('should use consistent patterns across schemas', () => {
      // Test that all schemas follow consistent patterns
      const allSchemas = [
        EpisodeSchemas.create,
        TrackSchemas.create,
        TeamSchemas.create,
        NotificationSchemas.list,
        InvitationSchemas.makeDecision
      ];

      allSchemas.forEach(schema => {
        expect(schema).toHaveProperty('type', 'object');
        expect(schema).toHaveProperty('properties');
        expect(schema).toHaveProperty('additionalProperties', false);
      });
    });

    test('should use consistent email validation', () => {
      expect(TeamSchemas.addMember.properties.email.format).toBe('email');
    });

    test('should use consistent string length limits', () => {
      // Test that similar fields have consistent limits
      expect(EpisodeSchemas.create.properties.title.maxLength).toBe(200);
      expect(TeamSchemas.create.properties.name.maxLength).toBe(100);
      expect(TrackSchemas.create.properties.filename.maxLength).toBe(255);
    });
  });

  describe('Edge cases and validation boundaries', () => {
    test('should handle minimum and maximum values correctly', () => {
      expect(EpisodeSchemas.create.properties.episodeNumber.minimum).toBe(1);
      expect(NotificationSchemas.list.properties.limit.minimum).toBe(1);
      expect(NotificationSchemas.list.properties.limit.maximum).toBe(100);
      expect(TrackSchemas.signParts.properties.partNumbers.items.minimum).toBe(1);
    });

    test('should handle enum values correctly', () => {
      const platformEnums = ['linkedin live', 'X', 'twitch', 'youtube'];

      expect(EpisodeSchemas.create.properties.platforms.items.enum).toEqual(platformEnums);
      expect(TeamSchemas.create.properties.settings.properties.defaultPlatforms.items.enum).toEqual(platformEnums);
    });

    test('should handle pattern validation correctly', () => {
      expect(TrackSchemas.create.properties.trackName.pattern).toBe('^[a-zA-Z0-9_-]+$');
    });
  });
});
