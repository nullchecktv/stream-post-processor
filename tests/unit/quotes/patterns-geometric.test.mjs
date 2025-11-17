import { describe, it, expect, beforeEach } from '@jest/globals';
import * as geometric from '../../../functions/quotes/patterns/geometric.mjs';

describe('Geometric Patterns', () => {
  let mockCtx;
  let branding;

  beforeEach(() => {
    mockCtx = {
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 0,
      globalAlpha: 1,
      fillRect: () => {},
      strokeRect: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      closePath: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      rotate: () => {},
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      createRadialGradient: () => ({
        addColorStop: () => {}
      })
    };

    branding = {
      colors: {
        primary: '#3B82F6',
        secondary: '#8B5CF6',
        background: '#FFFFFF',
        text: '#1F2937'
      }
    };
  });

  it('should export 15 pattern functions', () => {
    const patterns = [
      'scatteredCircles',
      'circleGrid',
      'concentricCircles',
      'diagonalLines',
      'horizontalLines',
      'verticalLines',
      'crosshatch',
      'trianglePattern',
      'hexagonPattern',
      'randomPolygons',
      'squareGrid',
      'diamondGrid',
      'offsetGrid',
      'spiralCircles',
      'wavyLines'
    ];

    patterns.forEach(patternName => {
      expect(geometric[patternName]).toBeDefined();
      expect(typeof geometric[patternName]).toBe('function');
    });
  });

  it('should execute scatteredCircles without errors', () => {
    expect(() => {
      geometric.scatteredCircles(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute circleGrid without errors', () => {
    expect(() => {
      geometric.circleGrid(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute concentricCircles without errors', () => {
    expect(() => {
      geometric.concentricCircles(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute line patterns without errors', () => {
    expect(() => {
      geometric.diagonalLines(mockCtx, 1920, 1080, branding);
      geometric.horizontalLines(mockCtx, 1920, 1080, branding);
      geometric.verticalLines(mockCtx, 1920, 1080, branding);
      geometric.crosshatch(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute polygon patterns without errors', () => {
    expect(() => {
      geometric.trianglePattern(mockCtx, 1920, 1080, branding);
      geometric.hexagonPattern(mockCtx, 1920, 1080, branding);
      geometric.randomPolygons(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute grid patterns without errors', () => {
    expect(() => {
      geometric.squareGrid(mockCtx, 1920, 1080, branding);
      geometric.diamondGrid(mockCtx, 1920, 1080, branding);
      geometric.offsetGrid(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute spiralCircles without errors', () => {
    expect(() => {
      geometric.spiralCircles(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should execute wavyLines without errors', () => {
    expect(() => {
      geometric.wavyLines(mockCtx, 1920, 1080, branding);
    }).not.toThrow();
  });

  it('should use deterministic random for scattered patterns', () => {
    const calls1 = [];
    const calls2 = [];

    const trackingCtx1 = {
      ...mockCtx,
      arc: (x, y, r) => calls1.push({ x, y, r })
    };

    const trackingCtx2 = {
      ...mockCtx,
      arc: (x, y, r) => calls2.push({ x, y, r })
    };

    geometric.scatteredCircles(trackingCtx1, 1920, 1080, branding);
    geometric.scatteredCircles(trackingCtx2, 1920, 1080, branding);

    expect(calls1.length).toBe(calls2.length);
    expect(calls1.length).toBeGreaterThan(0);

    for (let i = 0; i < calls1.length; i++) {
      expect(calls1[i].x).toBe(calls2[i].x);
      expect(calls1[i].y).toBe(calls2[i].y);
      expect(calls1[i].r).toBe(calls2[i].r);
    }
  });

  it('should work with portrait orientation', () => {
    expect(() => {
      geometric.scatteredCircles(mockCtx, 1080, 1920, branding);
      geometric.circleGrid(mockCtx, 1080, 1920, branding);
      geometric.diagonalLines(mockCtx, 1080, 1920, branding);
    }).not.toThrow();
  });
});
