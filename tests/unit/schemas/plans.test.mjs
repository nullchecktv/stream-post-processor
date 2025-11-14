import { describe, it, expect } from '@jest/globals';
import { PlanUpdateSchema, PlanCreateSchema } from '../../../schemas/plans.mjs';

describe('Plan Schemas', () => {
  describe('PlanUpdateSchema', () => {
    it('should accept arrays for objectives and concepts', () => {
      const data = {
        objectives: ['Learn Valkey', 'Understand caching'],
        concepts: ['Valkey', 'Distributed computing'],
        notes: 'Test notes'
      };

      const result = PlanUpdateSchema.parse(data);
      expect(result.objectives).toEqual(['Learn Valkey', 'Understand caching']);
      expect(result.concepts).toEqual(['Valkey', 'Distributed computing']);
    });

    it('should accept empty arrays', () => {
      const data = {
        objectives: [],
        concepts: []
      };

      const result = PlanUpdateSchema.parse(data);
      expect(result.objectives).toEqual([]);
      expect(result.concepts).toEqual([]);
    });

    it('should require array items to be non-empty strings', () => {
      const data = {
        objectives: ['Learn Valkey', ''],
        concepts: ['Valkey']
      };

      expect(() => PlanUpdateSchema.parse(data)).toThrow();
    });

    it('should make notes optional', () => {
      const data = {
        objectives: ['Learn Valkey'],
        concepts: ['Valkey']
      };

      const result = PlanUpdateSchema.parse(data);
      expect(result.notes).toBeUndefined();
    });

    it('should enforce notes max length', () => {
      const data = {
        objectives: ['Learn Valkey'],
        concepts: ['Valkey'],
        notes: 'a'.repeat(2001)
      };

      expect(() => PlanUpdateSchema.parse(data)).toThrow();
    });
  });

  describe('PlanCreateSchema', () => {
    it('should accept arrays with valid strings', () => {
      const data = {
        objectives: ['Educate people on the concepts of valkey'],
        concepts: ['Valkey', 'caching', 'distributed computing'],
        notes: ''
      };

      const result = PlanCreateSchema.parse(data);
      expect(result.objectives).toEqual(['Educate people on the concepts of valkey']);
      expect(result.concepts).toEqual(['Valkey', 'caching', 'distributed computing']);
    });
  });
});
