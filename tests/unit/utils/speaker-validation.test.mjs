import { describe, it, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { validateSpeakers, formatSpeakerValidationError } from '../../../functions/utils/speakers.mjs';

const ddbMock = mockClient(DynamoDBClient);

describe('Speaker Validation Service', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('validateSpeakers', () => {
    it('should validate speakers successfully when all are valid', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        episodeId: 'episode-id',
        tenantId: 'tenant123',
        speakers: ['Alice Johnson', 'Bob Smith', 'Charlie Davis']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['Alice Johnson', 'Bob Smith']);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
      expect(result.invalidSpeakers).toBeUndefined();
    });

    it('should perform case-insensitive matching', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['alice johnson', 'BOB SMITH']);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    it('should return normalized speakers matching episode capitalization', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['alice', 'bob smith']);

      expect(result.valid).toBe(false);
      expect(result.invalidSpeakers).toContain('alice');
    });

    it('should identify invalid speakers', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['Alice Johnson', 'Charlie Davis', 'Dave Wilson']);

      expect(result.valid).toBe(false);
      expect(result.invalidSpeakers).toEqual(['Charlie Davis', 'Dave Wilson']);
      expect(result.validSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    it('should handle empty speakers array', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', []);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual([]);
    });

    it('should handle episode with no speakers field', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['Alice Johnson']);

      expect(result.valid).toBe(false);
      expect(result.invalidSpeakers).toEqual(['Alice Johnson']);
      expect(result.validSpeakers).toEqual([]);
    });

    it('should trim whitespace from speaker names', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson', 'Bob Smith']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['  Alice Johnson  ', ' Bob Smith ']);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    it('should filter out empty strings after trimming', async () => {
      const episode = {
        pk: 'tenant123#episode-id',
        sk: 'metadata',
        speakers: ['Alice Johnson']
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall(episode)
      });

      const result = await validateSpeakers('episode-id', 'tenant123', ['Alice Johnson', '   ', '']);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual(['Alice Johnson']);
    });

    it('should throw error when episode not found', async () => {
      ddbMock.on(GetItemCommand).resolves({});

      await expect(validateSpeakers('nonexistent', 'tenant123', ['Alice Johnson']))
        .rejects.toThrow("Episode with ID 'nonexistent' was not found");
    });

    it('should handle null or undefined speakers input', async () => {
      const result = await validateSpeakers('episode-id', 'tenant123', null);

      expect(result.valid).toBe(true);
      expect(result.normalizedSpeakers).toEqual([]);
    });
  });

  describe('formatSpeakerValidationError', () => {
    it('should format validation error response correctly', () => {
      const validationResult = {
        valid: false,
        invalidSpeakers: ['Charlie Davis', 'Dave Wilson'],
        validSpeakers: ['Alice Johnson', 'Bob Smith']
      };

      const response = formatSpeakerValidationError(validationResult, 'episode-id', 'Track');

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBe('InvalidSpeakers');
      expect(body.message).toBe('Track speakers must exist in episode speaker list');
      expect(body.invalidSpeakers).toEqual(['Charlie Davis', 'Dave Wilson']);
      expect(body.validSpeakers).toEqual(['Alice Johnson', 'Bob Smith']);
    });

    it('should use default entity type when not provided', () => {
      const validationResult = {
        valid: false,
        invalidSpeakers: ['Charlie'],
        validSpeakers: ['Alice']
      };

      const response = formatSpeakerValidationError(validationResult, 'episode-id');

      const body = JSON.parse(response.body);
      expect(body.message).toBe('entity speakers must exist in episode speaker list');
    });
  });
});
