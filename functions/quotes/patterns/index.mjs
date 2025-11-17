/**
 * Pattern Library for Quote Graphics
 *
 * This module provides a registry of 50 background patterns for quote graphics.
 * Each pattern is a function that draws on a canvas context using team branding colors.
 */

/**
 * Pattern function signature
 *
 * @callback PatternFunction
 * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
 * @param {number} width - Canvas width in pixels
 * @param {number} height - Canvas height in pixels
 * @param {Object} branding - Team branding configuration
 * @param {Object} branding.colors - Color palette
 * @param {string} branding.colors.primary - Primary brand color (hex)
 * @param {string} branding.colors.secondary - Secondary brand color (hex)
 * @param {string} branding.colors.background - Background color (hex)
 * @param {string} branding.colors.text - Text color (hex)
 */

import * as gradients from './gradients.mjs';
import * as geometric from './geometric.mjs';
import * as textures from './textures.mjs';
import * as abstract from './abstract.mjs';
import * as minimalist from './minimalist.mjs';

/**
 * Registry of all available patterns
 * Total: 50 patterns (10 gradients + 15 geometric + 10 textures + 10 abstract + 5 minimalist)
 */
export const PATTERNS = [
  // Gradient patterns (10)
  gradients.linearGradientTopBottom,
  gradients.linearGradientDiagonal,
  gradients.linearGradientMultiStop,
  gradients.radialGradientCenter,
  gradients.radialGradientOffset,
  gradients.radialGradientMultiCircle,
  gradients.conicGradientColorWheel,
  gradients.conicGradientSplit,
  gradients.linearGradientHorizontal,
  gradients.radialGradientCorner,

  // Geometric patterns (15)
  geometric.scatteredCircles,
  geometric.circleGrid,
  geometric.concentricCircles,
  geometric.diagonalLines,
  geometric.horizontalLines,
  geometric.verticalLines,
  geometric.crosshatch,
  geometric.trianglePattern,
  geometric.hexagonPattern,
  geometric.randomPolygons,
  geometric.squareGrid,
  geometric.diamondGrid,
  geometric.offsetGrid,
  geometric.spiralCircles,
  geometric.wavyLines,

  // Texture patterns (10)
  textures.randomDots,
  textures.dotGrid,
  textures.varyingSizeDots,
  textures.perlinNoise,
  textures.grainTexture,
  textures.denseStippling,
  textures.sparseStippling,
  textures.halftonePattern,
  textures.organicDots,
  textures.clusteredDots,

  // Abstract patterns (10)
  abstract.sineWaves,
  abstract.organicWaves,
  abstract.bezierCurves,
  abstract.flowingLines,
  abstract.organicBlobs,
  abstract.spiralPattern,
  abstract.swirlPattern,
  abstract.concentricWaves,
  abstract.randomCurves,
  abstract.fluidShapes,

  // Minimalist patterns (5)
  minimalist.solidWithCornerAccent,
  minimalist.subtleVignette,
  minimalist.singleGeometricElement,
  minimalist.gradientEdge,
  minimalist.cleanWithBorderDetail
];

/**
 * Get a pattern function by index
 * Uses modulo to ensure index wraps around if it exceeds pattern count
 *
 * @param {number} index - Pattern index (0-49, or any number which will be wrapped)
 * @returns {PatternFunction} Pattern drawing function
 */
export function getPattern(index) {
  const wrappedIndex = index % PATTERNS.length;
  return PATTERNS[wrappedIndex];
}
