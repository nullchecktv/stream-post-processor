import { describe, test, expect, beforeEach } from '@jest/globals';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { marshall } from '@aws-sdk/util-dynamodb';
import { resolveBranding, DEFAULT_BRANDING } from '../../../functions/utils/branding.mjs';

const ddbMock = mockClient(DynamoDBClient);

describe('Branding Resolution Utility', () => {
  beforeEach(() => {
    ddbMock.reset();
    process.env.TABLE_NAME = 'test-table';
  });

  describe('resolveBranding', () => {
    test('should return default branding when tenantId is null', async () => {
      const branding = await resolveBranding(null);

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    test('should return default branding when tenantId is undefined', async () => {
      const branding = await resolveBranding(undefined);

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(0);
    });

    test('should fetch team branding with team# prefix', async () => {
      const customBranding = {
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
          background: '#000000',
          text: '#FFFFFF'
        },
        fontFamily: 'Roboto'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ branding: customBranding })
      });

      const branding = await resolveBranding('team#123');

      expect(branding).toEqual(customBranding);
      expect(ddbMock.calls()).toHaveLength(1);

      const call = ddbMock.call(0);
      expect(call.args[0].input.Key).toEqual(marshall({
        pk: 'team#123',
        sk: 'metadata'
      }));
    });

    test('should fetch team branding without prefix', async () => {
      const customBranding = {
        colors: {
          primary: '#FF5733',
          secondary: '#33FF57',
          background: '#000000',
          text: '#FFFFFF'
        },
        fontFamily: 'Roboto'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ branding: customBranding })
      });

      const branding = await resolveBranding('team-123');

      expect(branding).toEqual(customBranding);
      expect(ddbMock.calls()).toHaveLength(1);

      const call = ddbMock.call(0);
      expect(call.args[0].input.Key).toEqual(marshall({
        pk: 'team#team-123',
        sk: 'metadata'
      }));
    });

    test('should fetch user branding with user# prefix', async () => {
      const customBranding = {
        colors: {
          primary: '#1E40AF',
          secondary: '#7C3AED',
          background: '#111827',
          text: '#F3F4F6'
        },
        fontFamily: 'Open Sans'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ branding: customBranding })
      });

      const branding = await resolveBranding('user#456');

      expect(branding).toEqual(customBranding);
      expect(ddbMock.calls()).toHaveLength(1);

      const call = ddbMock.call(0);
      expect(call.args[0].input.Key).toEqual(marshall({
        pk: 'user#456',
        sk: 'profile'
      }));
    });

    test('should return default branding when tenant not found', async () => {
      ddbMock.on(GetItemCommand).resolves({
        Item: undefined
      });

      const branding = await resolveBranding('team#999');

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    test('should return default branding when tenant has no branding field', async () => {
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ name: 'Test Team' })
      });

      const branding = await resolveBranding('team#123');

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    test('should merge partial branding with defaults', async () => {
      const partialBranding = {
        colors: {
          primary: '#FF5733'
        },
        fontFamily: 'Lato'
      };

      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ branding: partialBranding })
      });

      const branding = await resolveBranding('team#123');

      expect(branding).toEqual({
        colors: {
          primary: '#FF5733',
          secondary: DEFAULT_BRANDING.colors.secondary,
          background: DEFAULT_BRANDING.colors.background,
          text: DEFAULT_BRANDING.colors.text
        },
        fontFamily: 'Lato'
      });
    });

    test('should handle DynamoDB errors gracefully', async () => {
      ddbMock.on(GetItemCommand).rejects(new Error('DynamoDB error'));

      const branding = await resolveBranding('team#123');

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(1);
    });

    test('should use projection expression to fetch only branding', async () => {
      ddbMock.on(GetItemCommand).resolves({
        Item: marshall({ branding: DEFAULT_BRANDING })
      });

      await resolveBranding('team#123');

      const call = ddbMock.call(0);
      expect(call.args[0].input.ProjectionExpression).toBe('branding');
    });

    test('should return default branding for invalid tenant format', async () => {
      const branding = await resolveBranding('invalid#format#extra');

      expect(branding).toEqual(DEFAULT_BRANDING);
      expect(ddbMock.calls()).toHaveLength(0);
    });
  });

  describe('DEFAULT_BRANDING', () => {
    test('should have all required color properties', () => {
      expect(DEFAULT_BRANDING.colors).toHaveProperty('primary');
      expect(DEFAULT_BRANDING.colors).toHaveProperty('secondary');
      expect(DEFAULT_BRANDING.colors).toHaveProperty('background');
      expect(DEFAULT_BRANDING.colors).toHaveProperty('text');
    });

    test('should have valid hex color codes', () => {
      const hexPattern = /^#[0-9A-Fa-f]{6}$/;

      expect(DEFAULT_BRANDING.colors.primary).toMatch(hexPattern);
      expect(DEFAULT_BRANDING.colors.secondary).toMatch(hexPattern);
      expect(DEFAULT_BRANDING.colors.background).toMatch(hexPattern);
      expect(DEFAULT_BRANDING.colors.text).toMatch(hexPattern);
    });

    test('should have fontFamily property', () => {
      expect(DEFAULT_BRANDING).toHaveProperty('fontFamily');
      expect(typeof DEFAULT_BRANDING.fontFamily).toBe('string');
      expect(DEFAULT_BRANDING.fontFamily.length).toBeGreaterThan(0);
    });
  });
});

