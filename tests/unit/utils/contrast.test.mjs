import { describe, it, expect } from '@jest/globals';
import {
  hexToRgb,
  getLuminance,
  getContrastRatio,
  applyTextShadowIfNeeded
} from '../../../functions/quotes/utils/contrast.mjs';

describe('Contrast Utilities', () => {
  describe('hexToRgb', () => {
    it('should convert hex color to RGB', () => {
      const rgb = hexToRgb('#FF0000');
      expect(rgb).toEqual({ r: 255, g: 0, b: 0 });
    });

    it('should handle hex without hash prefix', () => {
      const rgb = hexToRgb('00FF00');
      expect(rgb).toEqual({ r: 0, g: 255, b: 0 });
    });

    it('should convert black correctly', () => {
      const rgb = hexToRgb('#000000');
      expect(rgb).toEqual({ r: 0, g: 0, b: 0 });
    });

    it('should convert white correctly', () => {
      const rgb = hexToRgb('#FFFFFF');
      expect(rgb).toEqual({ r: 255, g: 255, b: 255 });
    });
  });

  describe('getLuminance', () => {
    it('should calculate luminance for white', () => {
      const luminance = getLuminance('#FFFFFF');
      expect(luminance).toBeCloseTo(1.0, 2);
    });

    it('should calculate luminance for black', () => {
      const luminance = getLuminance('#000000');
      expect(luminance).toBeCloseTo(0.0, 2);
    });

    it('should calculate luminance for gray', () => {
      const luminance = getLuminance('#808080');
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(1);
    });

    it('should calculate luminance for red', () => {
      const luminance = getLuminance('#FF0000');
      expect(luminance).toBeGreaterThan(0);
      expect(luminance).toBeLessThan(0.5);
    });
  });

  describe('getContrastRatio', () => {
    it('should calculate maximum contrast for black and white', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeCloseTo(21, 0);
    });

    it('should calculate minimum contrast for identical colors', () => {
      const ratio = getContrastRatio('#808080', '#808080');
      expect(ratio).toBeCloseTo(1, 1);
    });

    it('should calculate contrast ratio greater than 4.5 for good readability', () => {
      const ratio = getContrastRatio('#000000', '#FFFFFF');
      expect(ratio).toBeGreaterThan(4.5);
    });

    it('should calculate low contrast for similar colors', () => {
      const ratio = getContrastRatio('#AAAAAA', '#BBBBBB');
      expect(ratio).toBeLessThan(2);
    });

    it('should be symmetric', () => {
      const ratio1 = getContrastRatio('#FF0000', '#00FF00');
      const ratio2 = getContrastRatio('#00FF00', '#FF0000');
      expect(ratio1).toBeCloseTo(ratio2, 2);
    });
  });

  describe('applyTextShadowIfNeeded', () => {
    let mockCtx;

    beforeEach(() => {
      mockCtx = {
        shadowColor: null,
        shadowBlur: 0,
        shadowOffsetX: 0,
        shadowOffsetY: 0
      };
    });

    it('should apply shadow when contrast is below 4.5', () => {
      const applied = applyTextShadowIfNeeded(mockCtx, '#AAAAAA', '#BBBBBB');

      expect(applied).toBe(true);
      expect(mockCtx.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
      expect(mockCtx.shadowBlur).toBe(8);
      expect(mockCtx.shadowOffsetX).toBe(2);
      expect(mockCtx.shadowOffsetY).toBe(2);
    });

    it('should not apply shadow when contrast is above 4.5', () => {
      const applied = applyTextShadowIfNeeded(mockCtx, '#000000', '#FFFFFF');

      expect(applied).toBe(false);
      expect(mockCtx.shadowColor).toBeNull();
      expect(mockCtx.shadowBlur).toBe(0);
    });

    it('should apply shadow for low contrast text on background', () => {
      const applied = applyTextShadowIfNeeded(mockCtx, '#333333', '#444444');

      expect(applied).toBe(true);
      expect(mockCtx.shadowColor).toBe('rgba(0, 0, 0, 0.5)');
    });
  });
});
