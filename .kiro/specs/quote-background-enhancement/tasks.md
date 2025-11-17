# Implementation Plan

- [x] 1. Create hash and text utility functions





  - Create `functions/quotes/utils/hash.mjs` with CRC32 hash implementation
  - Implement `hashQuoteText()` function with case-insensitive normalization
  - Implement `getPatternIndex()` function to return pattern index (0-49)
  - Create `functions/quotes/utils/text.mjs` with text sizing utilities
  - Implement `calculateFontSize()` function with length-based sizing logic
  - Implement `wrapText()` function for multi-line text wrapping
  - Implement `calculateTextHeight()` function for vertical positioning
  - _Requirements: 1.2, 1.3, 1.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

- [x] 1.1 Write unit tests for hash and text utilities

  - Test hash function determinism and case-insensitivity
  - Test pattern index distribution across 500 sample quotes
  - Test font size calculation for various text lengths
  - Test text wrapping with different canvas widths
  - _Requirements: 4.1, 4.3, 4.4, 11.1, 11.2, 11.3_

- [x] 2. Implement pattern library foundation





  - Create `functions/quotes/patterns/index.mjs` with pattern registry
  - Define pattern function signature with JSDoc comments
  - Implement `getPattern()` function with modulo-based selection
  - Create pattern category subdirectories (gradients, geometric, textures, abstract, minimalist)
  - Export PATTERNS array from index file
  - _Requirements: 1.1, 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 3. Implement gradient patterns (10 patterns)





  - Create `functions/quotes/patterns/gradients.mjs`
  - Implement linear gradient patterns: top-to-bottom, diagonal, multi-stop
  - Implement radial gradient patterns: center, offset, multi-circle
  - Implement conic gradient patterns: color wheel, split
  - Apply brand colors with appropriate opacity (25-40%)
  - Export all gradient pattern functions
  - _Requirements: 1.1, 2.1, 2.2, 10.1_

- [x] 4. Implement geometric patterns (15 patterns)





  - Create `functions/quotes/patterns/geometric.mjs`
  - Implement circle patterns: scattered, grid, concentric
  - Implement line patterns: diagonal, horizontal, vertical, crosshatch
  - Implement polygon patterns: triangles, hexagons, random
  - Implement grid patterns: square, diamond, offset
  - Use seeded random for deterministic scattered elements
  - Export all geometric pattern functions
  - _Requirements: 1.1, 2.1, 2.2, 10.2_

- [x] 5. Implement texture patterns (10 patterns)





  - Create `functions/quotes/patterns/textures.mjs`
  - Implement dot patterns: random, grid, varying sizes
  - Implement noise patterns: perlin-style, grain
  - Implement stippling patterns: dense, sparse
  - Implement halftone patterns
  - Apply subtle opacity for non-distracting backgrounds
  - Export all texture pattern functions
  - _Requirements: 1.1, 2.1, 2.2, 10.3_

- [x] 6. Implement abstract patterns (10 patterns)





  - Create `functions/quotes/patterns/abstract.mjs`
  - Implement wave patterns: sine waves, organic waves
  - Implement curve patterns: bezier curves, flowing lines
  - Implement blob patterns: organic shapes
  - Implement spiral and swirl patterns
  - Use smooth curves and gradients for professional appearance
  - Export all abstract pattern functions
  - _Requirements: 1.1, 2.1, 2.2, 10.4_

- [x] 7. Implement minimalist patterns (5 patterns)





  - Create `functions/quotes/patterns/minimalist.mjs`
  - Implement solid with corner accent pattern
  - Implement subtle vignette pattern
  - Implement single geometric element pattern
  - Implement gradient edge pattern
  - Implement clean with border detail pattern
  - Export all minimalist pattern functions
  - _Requirements: 1.1, 2.1, 2.2, 10.5_

- [x] 8. Add text readability enhancements





  - Create `functions/quotes/utils/contrast.mjs`
  - Implement `getLuminance()` function for color luminance calculation
  - Implement `getContrastRatio()` function for WCAG contrast checking
  - Implement `applyTextShadowIfNeeded()` function for low-contrast scenarios
  - Ensure minimum 4.5:1 contrast ratio for text
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 9. Update quote data model and schemas




  - Add `orientation` field to quote schema in `schemas/quotes.mjs`
  - Set default value to 'landscape' in schema
  - Add validation for orientation enum ('landscape', 'portrait')
  - Update TypeScript types in `schemas/quotes.d.ts`
  - _Requirements: 12.1, 12.5_

- [x] 10. Update quote API endpoints




  - Modify `functions/quotes/create-quote.mjs` to accept orientation parameter
  - Modify `functions/quotes/update-quote.mjs` to accept orientation parameter
  - Add orientation validation in both endpoints
  - Ensure orientation defaults to 'landscape' when not provided
  - Trigger graphic regeneration when orientation changes
  - _Requirements: 12.4, 12.5, 12.7_

- [x] 11. Enhance quote graphics generator





  - Update `functions/quotes/generate-graphic.mjs` to import pattern library
  - Add orientation-based dimension calculation (1920x1080 or 1080x1920)
  - Integrate hash function to select pattern index
  - Apply selected pattern after base background
  - Integrate dynamic font size calculation
  - Adjust text layout for portrait orientation
  - Update text wrapping to use new utility functions
  - Apply text shadow when contrast is insufficient
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 11.1, 11.8, 12.2, 12.3, 12.8, 12.9_

- [x] 11.1 Write integration tests for graphic generation




  - Test landscape graphic generation with patterns
  - Test portrait graphic generation with patterns
  - Test pattern consistency across multiple generations
  - Test font sizing for various text lengths
  - Verify S3 upload and DynamoDB update
  - _Requirements: 1.1, 12.2, 12.3, 12.8_

- [x] 12. Update quote detail page UI





  - Add orientation toggle control in `frontend/src/pages/QuoteDetailPage.tsx`
  - Create landscape/portrait button group
  - Update state management for orientation field
  - Adjust image container styling based on orientation
  - Add orientation to save/update API calls
  - Trigger regeneration when orientation changes
  - _Requirements: 12.6, 12.7, 12.10_

- [x] 13. Update quote list page UI




  - Modify `frontend/src/pages/EpisodeQuotesPage.tsx` to display orientation
  - Adjust thumbnail display to reflect actual graphic orientation
  - Add orientation indicator badge to quote cards
  - Ensure grid layout accommodates both orientations
  - _Requirements: 12.10_

- [x] 14. Update quote API types





  - Add orientation field to QuoteDetail type in `frontend/src/types/index.ts`
  - Add orientation to quote creation request type
  - Add orientation to quote update request type
  - Update API client functions in `frontend/src/api/quotes.ts`
  - _Requirements: 12.1, 12.4, 12.5_

- [ ] 15. Perform visual testing and validation
  - Generate test quotes with all 50 patterns
  - Verify pattern visual quality and professionalism
  - Test text readability across all patterns
  - Verify landscape and portrait orientations
  - Test font sizing with short, medium, and long quotes
  - Validate brand color application in patterns
  - _Requirements: 1.1, 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.4, 11.1, 12.2, 12.3_

- [ ] 16. Update documentation
  - Document pattern library structure and usage
  - Add examples of each pattern category
  - Document hash function and pattern selection logic
  - Document font sizing algorithm
  - Add orientation field to API documentation in `openapi.yaml`
  - _Requirements: 9.1, 9.2, 9.3, 9.4_
