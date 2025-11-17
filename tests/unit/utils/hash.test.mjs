import { describe, it, expect } from '@jest/globals';
import { hashQuoteText, getPatternIndex } from '../../../functions/quotes/utils/hash.mjs';

describe('Hash Utilities', () => {
  describe('hashQuoteText', () => {
    it('should return consistent hash for same text', () => {
      const text = 'Hello world';
      const hash1 = hashQuoteText(text);
      const hash2 = hashQuoteText(text);

      expect(hash1).toBe(hash2);
    });

    it('should be case-insensitive', () => {
      const hash1 = hashQuoteText('Hello World');
      const hash2 = hashQuoteText('hello world');
      const hash3 = hashQuoteText('HELLO WORLD');

      expect(hash1).toBe(hash2);
      expect(hash2).toBe(hash3);
    });

    it('should normalize whitespace', () => {
      const hash1 = hashQuoteText('  Hello world  ');
      const hash2 = hashQuoteText('Hello world');

      expect(hash1).toBe(hash2);
    });

    it('should return positive integer', () => {
      const hash = hashQuoteText('Test quote');

      expect(hash).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(hash)).toBe(true);
    });

    it('should produce different hashes for different text', () => {
      const hash1 = hashQuoteText('First quote');
      const hash2 = hashQuoteText('Second quote');

      expect(hash1).not.toBe(hash2);
    });
  });

  describe('getPatternIndex', () => {
    it('should return index between 0 and 49', () => {
      const quotes = [
        'Short quote',
        'This is a medium length quote about something interesting',
        'A very long quote that goes on and on about various topics and contains many words to test the hash function with longer text'
      ];

      quotes.forEach(quote => {
        const index = getPatternIndex(quote);
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(50);
      });
    });

    it('should return consistent index for same quote', () => {
      const quote = 'Consistency is key';
      const index1 = getPatternIndex(quote);
      const index2 = getPatternIndex(quote);

      expect(index1).toBe(index2);
    });

    it('should be case-insensitive', () => {
      const index1 = getPatternIndex('Test Quote');
      const index2 = getPatternIndex('test quote');

      expect(index1).toBe(index2);
    });

    it('should distribute patterns across 500 sample quotes', () => {
      const sampleQuotes = [];
      for (let i = 0; i < 500; i++) {
        sampleQuotes.push(`Sample quote number ${i} with unique content`);
      }

      const distribution = new Array(50).fill(0);
      sampleQuotes.forEach(quote => {
        const index = getPatternIndex(quote);
        distribution[index]++;
      });

      const counts = Object.values(distribution);
      const allPatternsUsed = counts.every(count => count > 0);
      expect(allPatternsUsed).toBe(true);

      const average = 500 / 50;
      const minCount = Math.min(...counts);
      const maxCount = Math.max(...counts);

      expect(minCount).toBeGreaterThan(0);
      expect(maxCount).toBeLessThan(average * 2);

      const variance = counts.reduce((sum, count) => sum + Math.pow(count - average, 2), 0) / counts.length;
      const standardDeviation = Math.sqrt(variance);
      expect(standardDeviation).toBeLessThan(average);
    });
  });
});
