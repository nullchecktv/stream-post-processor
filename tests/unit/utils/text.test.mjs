import { describe, it, expect } from '@jest/globals';
import { calculateFontSize, wrapText, calculateTextHeight } from '../../../functions/quotes/utils/text.mjs';

describe('Text Utilities', () => {
  describe('calculateFontSize', () => {
    const landscapeWidth = 1920;
    const landscapeHeight = 1080;
    const portraitWidth = 1080;
    const portraitHeight = 1920;

    it('should return max size for short quotes', () => {
      const shortText = 'Short quote';
      const fontSize = calculateFontSize(shortText, landscapeWidth, landscapeHeight);

      expect(fontSize).toBe(96);
    });

    it('should return 84px for quotes under 100 characters', () => {
      const mediumText = 'This is a medium length quote that has more than fifty characters in it';
      const fontSize = calculateFontSize(mediumText, landscapeWidth, landscapeHeight);

      expect(fontSize).toBe(84);
    });

    it('should return 72px for quotes under 150 characters', () => {
      const longerText = 'This is a longer quote that contains between one hundred and one hundred fifty characters to test the font sizing algorithm properly';
      const fontSize = calculateFontSize(longerText, landscapeWidth, landscapeHeight);

      expect(fontSize).toBe(72);
    });

    it('should return 60px for quotes under 200 characters', () => {
      const longText = 'This is a quite long quote that contains between one hundred fifty and two hundred characters to test the font sizing algorithm and ensure it returns the correct size for this length range';
      const fontSize = calculateFontSize(longText, landscapeWidth, landscapeHeight);

      expect(fontSize).toBe(60);
    });

    it('should return min size for very long quotes', () => {
      const veryLongText = 'a'.repeat(250);
      const fontSize = calculateFontSize(veryLongText, landscapeWidth, landscapeHeight);

      expect(fontSize).toBe(48);
    });

    it('should adjust for portrait orientation', () => {
      const text = 'Medium length quote text';
      const landscapeSize = calculateFontSize(text, landscapeWidth, landscapeHeight);
      const portraitSize = calculateFontSize(text, portraitWidth, portraitHeight);

      expect(portraitSize).toBeLessThan(landscapeSize);
    });

    it('should maintain minimum size in portrait', () => {
      const longText = 'a'.repeat(250);
      const fontSize = calculateFontSize(longText, portraitWidth, portraitHeight);

      expect(fontSize).toBeGreaterThanOrEqual(48);
    });

    it('should return integer font sizes', () => {
      const texts = [
        'Short',
        'Medium length quote',
        'A longer quote with more characters',
        'A very long quote that goes on and on'
      ];

      texts.forEach(text => {
        const fontSize = calculateFontSize(text, landscapeWidth, landscapeHeight);
        expect(Number.isInteger(fontSize)).toBe(true);
      });
    });
  });

  describe('wrapText', () => {
    const mockContext = {
      measureText: (text) => ({ width: text.length * 10 })
    };

    it('should wrap text that exceeds max width', () => {
      const text = 'This is a very long quote that needs to be wrapped';
      const maxWidth = 200;

      const lines = wrapText(mockContext, text, maxWidth);

      expect(lines.length).toBeGreaterThan(1);
      lines.forEach(line => {
        expect(mockContext.measureText(line).width).toBeLessThanOrEqual(maxWidth);
      });
    });

    it('should not wrap short text', () => {
      const text = 'Short quote';
      const maxWidth = 500;

      const lines = wrapText(mockContext, text, maxWidth);

      expect(lines).toEqual(['Short quote']);
    });

    it('should handle single word', () => {
      const text = 'Word';
      const maxWidth = 100;

      const lines = wrapText(mockContext, text, maxWidth);

      expect(lines).toEqual(['Word']);
    });

    it('should handle empty text', () => {
      const text = '';
      const maxWidth = 100;

      const lines = wrapText(mockContext, text, maxWidth);

      expect(lines).toEqual([]);
    });

    it('should wrap at word boundaries', () => {
      const text = 'One Two Three Four Five';
      const maxWidth = 100;

      const lines = wrapText(mockContext, text, maxWidth);

      lines.forEach(line => {
        expect(line.trim()).toBe(line);
        expect(line).not.toContain('  ');
      });
    });

    it('should handle different canvas widths', () => {
      const text = 'This is a test quote with multiple words';
      const narrowWidth = 150;
      const wideWidth = 500;

      const narrowLines = wrapText(mockContext, text, narrowWidth);
      const wideLines = wrapText(mockContext, text, wideWidth);

      expect(narrowLines.length).toBeGreaterThan(wideLines.length);
    });

    it('should preserve all words', () => {
      const text = 'One Two Three Four Five Six Seven';
      const maxWidth = 150;

      const lines = wrapText(mockContext, text, maxWidth);
      const joinedText = lines.join(' ');

      expect(joinedText).toBe(text);
    });
  });

  describe('calculateTextHeight', () => {
    it('should calculate height for single line', () => {
      const fontSize = 72;
      const lineCount = 1;

      const height = calculateTextHeight(fontSize, lineCount);

      expect(height).toBe(72 * 1.3);
    });

    it('should calculate height for multiple lines', () => {
      const fontSize = 72;
      const lineCount = 3;

      const height = calculateTextHeight(fontSize, lineCount);

      expect(height).toBe(72 * 1.3 * 3);
    });

    it('should use 1.3 line height multiplier', () => {
      const fontSize = 60;
      const lineCount = 2;

      const height = calculateTextHeight(fontSize, lineCount);
      const expectedHeight = fontSize * 1.3 * lineCount;

      expect(height).toBe(expectedHeight);
    });

    it('should handle different font sizes', () => {
      const lineCount = 2;
      const smallSize = 48;
      const largeSize = 96;

      const smallHeight = calculateTextHeight(smallSize, lineCount);
      const largeHeight = calculateTextHeight(largeSize, lineCount);

      expect(largeHeight).toBeGreaterThan(smallHeight);
      expect(largeHeight / smallHeight).toBe(largeSize / smallSize);
    });

    it('should return zero for zero lines', () => {
      const fontSize = 72;
      const lineCount = 0;

      const height = calculateTextHeight(fontSize, lineCount);

      expect(height).toBe(0);
    });
  });
});
