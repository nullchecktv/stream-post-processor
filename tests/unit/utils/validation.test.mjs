import { describe, it, expect, beforeEach } from '@jest/globals';
import { validateRequest } from '../../../functions/utils/validation.mjs';
import { z } from 'zod';

describe('Validation Utils', () => {
  describe('validateRequest', () => {
    let mockEvent;

    beforeEach(() => {
      mockEvent = {
        requestContext: {
          authorizer: {
            tenantId: 'tenant123',
            userId: 'user123'
          }
        },
        body: null
      };
    });

    it('should return readable error for invalid type', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      mockEvent.body = JSON.stringify({
        name: 'John',
        age: 'not a number'
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      expect(result.error.statusCode).toBe(400);
      const body = JSON.parse(result.error.body);
      expect(body.message).toBe('Validation failed');
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].field).toBe('age');
      expect(body.errors[0].message).toBe('Expected number, but received string');
    });

    it('should return readable error for string too short', () => {
      const schema = z.object({
        title: z.string().min(10)
      });

      mockEvent.body = JSON.stringify({
        title: 'Short'
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      const body = JSON.parse(result.error.body);
      expect(body.errors[0].field).toBe('title');
      expect(body.errors[0].message).toBe('Must be at least 10 characters');
    });

    it('should return readable error for string too long', () => {
      const schema = z.object({
        title: z.string().max(5)
      });

      mockEvent.body = JSON.stringify({
        title: 'This is too long'
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      const body = JSON.parse(result.error.body);
      expect(body.errors[0].field).toBe('title');
      expect(body.errors[0].message).toBe('Must be at most 5 characters');
    });

    it('should return readable error for array too small', () => {
      const schema = z.object({
        items: z.array(z.string()).min(2)
      });

      mockEvent.body = JSON.stringify({
        items: ['one']
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      const body = JSON.parse(result.error.body);
      expect(body.errors[0].field).toBe('items');
      expect(body.errors[0].message).toBe('Must contain at least 2 items');
    });

    it('should return readable error for invalid email', () => {
      const schema = z.object({
        email: z.string().email()
      });

      mockEvent.body = JSON.stringify({
        email: 'not-an-email'
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      const body = JSON.parse(result.error.body);
      expect(body.errors[0].field).toBe('email');
      expect(body.errors[0].message).toBe('Must be a valid email address');
    });

    it('should handle multiple validation errors', () => {
      const schema = z.object({
        name: z.string().min(3),
        age: z.number(),
        email: z.string().email()
      });

      mockEvent.body = JSON.stringify({
        name: 'AB',
        age: 'not a number',
        email: 'invalid'
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(false);
      const body = JSON.parse(result.error.body);
      expect(body.errors).toHaveLength(3);
      expect(body.errors.map(e => e.field)).toEqual(['name', 'age', 'email']);
    });

    it('should successfully validate correct data', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number()
      });

      mockEvent.body = JSON.stringify({
        name: 'John',
        age: 30
      });

      const result = validateRequest(mockEvent, schema);

      expect(result.success).toBe(true);
      expect(result.tenantId).toBe('tenant123');
      expect(result.userId).toBe('user123');
      expect(result.data).toEqual({ name: 'John', age: 30 });
    });
  });
});
