import { describe, it, expect } from '@jest/globals';
import {
  EpisodeStatus,
  EPISODE_STATUS,
  EPISODE_STATUS_TRANSITIONS,
  EpisodeCreateSchema,
  EpisodeUpdateSchema,
  EpisodeStatusUpdateSchema,
  EpisodePathParamsSchema
} from '../../../schemas/episodes.mjs';

describe('Episode Schemas', () => {
  describe('EpisodeStatus enum', () => {
    it('should validate correct status values', () => {
      const validStatuses = ['Draft', 'Planning', 'Ready', 'Processing', 'Published', 'Archived'];

      validStatuses.forEach(status => {
        const result = EpisodeStatus.safeParse(status);
        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data).toBe(status);
        }
      });
    });

    it('should reject invalid status values', () => {
      const invalidStatuses = ['draft', 'DRAFT', 'invalid', '', null, undefined, 123];

      invalidStatuses.forEach(status => {
        const result = EpisodeStatus.safeParse(status);
        expect(result.success).toBe(false);
      });
    });

    it('should have correct EPISODE_STATUS constants', () => {
      expect(EPISODE_STATUS.DRAFT).toBe('Draft');
      expect(EPISODE_STATUS.PLANNING).toBe('Planning');
      expect(EPISODE_STATUS.READY).toBe('Ready');
      expect(EPISODE_STATUS.PROCESSING).toBe('Processing');
      expect(EPISODE_STATUS.PUBLISHED).toBe('Published');
      expect(EPISODE_STATUS.ARCHIVED).toBe('Archived');
    });
  });

  describe('EPISODE_STATUS_TRANSITIONS', () => {
    it('should define valid transitions from Draft', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.DRAFT]).toEqual([
        EPISODE_STATUS.PLANNING,
        EPISODE_STATUS.ARCHIVED
      ]);
    });

    it('should define valid transitions from Planning', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.PLANNING]).toEqual([
        EPISODE_STATUS.READY,
        EPISODE_STATUS.DRAFT
      ]);
    });

    it('should define valid transitions from Ready', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.READY]).toEqual([
        EPISODE_STATUS.PROCESSING,
        EPISODE_STATUS.PLANNING
      ]);
    });

    it('should define validtions from Processing', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.PROCESSING]).toEqual([
        EPISODE_STATUS.PUBLISHED,
        EPISODE_STATUS.READY
      ]);
    });

    it('should define valid transitions from Published', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.PUBLISHED]).toEqual([
        EPISODE_STATUS.ARCHIVED
      ]);
    });

    it('should define no transitions from Archived', () => {
      expect(EPISODE_STATUS_TRANSITIONS[EPISODE_STATUS.ARCHIVED]).toEqual([]);
    });
  });

  describe('EpisodeCreateSchema', () => {
    const validEpisode = {
      title: 'Test Episode',
      episodeNumber: 1,
      description: 'Test description',
      airDate: '2025-01-15T10:30:00Z',
      platforms: ['youtube', 'twitch'],
      themes: ['technology', 'programming'],
      seriesName: 'Tech Talk'
    };

    it('should validate a complete valid episode', () => {
      const result = EpisodeCreateSchema.safeParse(validEpisode);
      expect(result.success).toBe(true);
    });

    it('should validate episode with only required fields', () => {
      const minimalEpisode = {
        title: 'Test Episode',
        episodeNumber: 1
      };
      const result = EpisodeCreateSchema.safeParse(minimalEpisode);
      expect(result.success).toBe(true);
    });

    it('should reject episode with empty title', () => {
      const invalidEpisode = { ...validEpisode, title: '' };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with title exceeding 200 characters', () => {
      const invalidEpisode = { ...validEpisode, title: 'a'.repeat(201) };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with non-positive episode number', () => {
      const invalidEpisode = { ...validEpisode, episodeNumber: 0 };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with negative episode number', () => {
      const invalidEpisode = { ...validEpisode, episodeNumber: -1 };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with non-integer episode number', () => {
      const invalidEpisode = { ...validEpisode, episodeNumber: 1.5 };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with description exceeding 1000 characters', () => {
      const invalidEpisode = { ...validEpisode, description: 'a'.repeat(1001) };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with invalid airDate format', () => {
      const invalidEpisode = { ...validEpisode, airDate: '2025-01-15' };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode with invalid platform', () => {
      const invalidEpisode = { ...validEpisode, platforms: ['invalid-platform'] };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should validate episode with valid platforms', () => {
      const validPlatforms = ['linkedin live', 'X', 'twitch', 'youtube'];
      const episodeWithPlatforms = { ...validEpisode, platforms: validPlatforms };
      const result = EpisodeCreateSchema.safeParse(episodeWithPlatforms);
      expect(result.success).toBe(true);
    });

    it('should reject episode with seriesName exceeding 100 characters', () => {
      const invalidEpisode = { ...validEpisode, seriesName: 'a'.repeat(101) };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode missing required title', () => {
      const invalidEpisode = { episodeNumber: 1 };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });

    it('should reject episode missing required episodeNumber', () => {
      const invalidEpisode = { title: 'Test Episode' };
      const result = EpisodeCreateSchema.safeParse(invalidEpisode);
      expect(result.success).toBe(false);
    });
  });

  describe('EpisodeUpdateSchema', () => {
    it('should validate partial update with only title', () => {
      const update = { title: 'Updated Title' };
      const result = EpisodeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate partial update with only episodeNumber', () => {
      const update = { episodeNumber: 2 };
      const result = EpisodeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should validate empty update object', () => {
      const update = {};
      const result = EpisodeUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject update with invalid title', () => {
      const update = { title: '' };
      const result = EpisodeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject update with invalid episodeNumber', () => {
      const update = { episodeNumber: -1 };
      const result = EpisodeUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('EpisodeStatusUpdateSchema', () => {
    it('should validate status update with valid status', () => {
      const update = { status: 'Draft' };
      const result = EpisodeStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(true);
    });

    it('should reject status update with invalid status', () => {
      const update = { status: 'invalid' };
      const result = EpisodeStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });

    it('should reject status update missing status field', () => {
      const update = {};
      const result = EpisodeStatusUpdateSchema.safeParse(update);
      expect(result.success).toBe(false);
    });
  });

  describe('EpisodePathParamsSchema', () => {
    it('should validate path params with episodeId', () => {
      const params = { episodeId: '123e4567-e89b-12d3-a456-426614174000' };
      const result = EpisodePathParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should validate path params with any string episodeId', () => {
      const params = { episodeId: 'any-string-id' };
      const result = EpisodePathParamsSchema.safeParse(params);
      expect(result.success).toBe(true);
    });

    it('should reject path params missing episodeId', () => {
      const params = {};
      const result = EpisodePathParamsSchema.safeParse(params);
      expect(result.success).toBe(false);
    });
  });

  describe('TypeScript type inference', () => {
    it('should infer correct types from schemas', () => {
      const episode = {
        title: 'Test',
        episodeNumber: 1
      };

      const result = EpisodeCreateSchema.safeParse(episode);
      if (result.success) {
        expect(typeof result.data.title).toBe('string');
        expect(typeof result.data.episodeNumber).toBe('number');
      }
    });
  });
});

