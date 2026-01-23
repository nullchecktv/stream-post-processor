# Implementation Plan: Flat 2.0 Design System

## Overview

This implementation plan refines the existing component library to implement a cohesive flat 2.0 design system with social media aspect ratios. The work focuses on extending Tailwind configuration, creating a base Card component, and updating existing card components to use consistent styling and aspect ratios.

## Tasks

- [x] 1. Extend Tailwind configuration with flat design tokens
  - Add flat shadow aliases (flat-sm, flat, flat-md, flat-lg) to boxShadow
  - Add flat border radius aliases (flat, flat-lg, flat-xl) to borderRadius
  - Verify existing color scheme meets WCAG AA contrast requirements
  - _Requirements: 1.1, 1.2, 3.1, 8.1, 12.1_

- [x] 2. Create base Card component with aspect ratio support
  - [x] 2.1 Implement Card component in frontend/src/components/common/Card.tsx
    - Create Card component with aspectRatio prop (landscape, square, portrait, instagram, none)
    - Apply flat design styling (rounded-flat, shadow-flat, border-gray-200)
pdate EpisodeCard to use base Card component
    - Wrap content in Card with aspectRatio="landscape" (16:9)
    - Apply flat design styling to thumbnail area
    - Use consistent spacing (p-4, space-y-2)
    - Ensure hover state works with Card component
    - _Requirements: 2.1, 6.1, 6.2, 6.3, 9.1, 9.2_

  - [ ]* 3.2 Write unit tests for updated EpisodeCard
    - Test landscape aspect ratio is applied
    - Test card renders with episode data
    - Test hover state triggers navigation
    - _Requirements: 2.5, 6.5_

- [x] 4. Refine ClipCard component with orientation-based aspect ratios
  - [x] 4.1 Update ClipCard to support landscape and portrait orientations
    - Add orientation prop (landscape | portrait)
    - Use Card with aspectRatio based on orientation (16:9 or 9:16)
    - Maintain video thumbnail area with play icon fallback
    - Add duration badge overlay with proper positioning
    - Apply consistent spacing (p-3, space-y-1)
    - _Requirements: 2.1, 2.2, 2.3, 6.1, 6.2, 6.3_

  - [ ]* 4.2 Write unit tests for updated ClipCard
    - Test landscape orientation uses 16:9 aspect ratio
    - Test portrait orientation uses 9:16 aspect ratio
    - Test duration badge is displayed
    - Test thumbnail fallback shows play icon
    - _Requirements: 2.5, 6.5_

- [x] 5. Refine QuoteCard component with square aspect ratio
  - [x] 5.1 Update QuoteCard to use square aspect ratio
    - Use Card with aspectRatio="square" (1:1)
    - Apply gradient background (from-accent to-primary-light)
    - Center quote text with line-clamp-4
    - Position speaker attribution and status at bottom
    - Use consistent padding (p-6)
    - _Requirements: 2.3, 6.1, 6.2, 6.3_

  - [ ]* 5.2 Write unit tests for updated QuoteCard
    - Test square aspect ratio is applied
    - Test quote text is displayed with line clamping
    - Test speaker attribution is shown when present
    - Test speaker attribution is hidden when missing
    - _Requirements: 2.5, 6.5_

- [x] 6. Refine BlogPostCard component with Instagram portrait aspect ratio
  - [x] 6.1 Update BlogPostCard to use Instagram portrait aspect ratio
    - Use Card with aspectRatio="instagram" (4:5)
    - Apply gradient background to header area (from-accent to-primary-light)
    - Display title in header with line-clamp-3
    - Show excerpt in content area with line-clamp-3
    - Position status and date at bottom
    - Use consistent spacing (p-6 header, p-4 content)
    - _Requirements: 2.4, 6.1, 6.2, 6.3_

  - [ ]* 6.2 Write unit tests for updated BlogPostCard
    - Test Instagram portrait aspect ratio is applied
    - Test title and excerpt are displayed with line clamping
    - Test status and date are shown
    - Test missing excerpt is handled gracefully
    - _Requirements: 2.5, 6.5_

- [-] 7. Refine Button component with flat 2.0 styling
  - [x] 7.1 Update Button component styling
    - Use rounded-flat for border radius
    - Apply flat shadows (shadow-flat, hover:shadow-flat-md for primary)
    - Ensure smooth transitions (transition-all duration-200)
    - Maintain clear focus states (focus:ring-2 focus:ring-offset-2)
    - Keep existing variant logic (primary, secondary, tertiary)
    - _Requirements: 1.1, 1.2, 1.3, 7.1, 7.2, 7.3_

  - [ ]* 7.2 Write unit tests for updated Button
    - Test all variants render with correct flat styling
    - Test hover states apply shadow changes
    - Test focus states are visible
    - Test disabled state prevents interaction
    - _Requirements: 7.2, 7.4, 12.2_

- [x] 8. Create ContentGrid component for responsive layouts
  - [x] 8.1 Implement ContentGrid component
    - Create ContentGrid in frontend/src/components/common/ContentGrid.tsx
    - Support configurable columns per breakpoint (sm, md, lg, xl)
    - Apply consistent gap spacing (default gap-6)
    - Support custom className for additional styling
    - _Requirements: 3.3, 9.1, 9.3, 9.4, 11.1, 11.2, 11.3_

  - [ ]* 8.2 Write unit tests for ContentGrid
    - Test grid classes are applied correctly
    - Test responsive column configuration works
    - Test gap spacing is applied
    - Test custom className is merged
    - _Requirements: 9.4, 11.4_

- [x] 9. Update dashboard pages to use ContentGrid
  - [x] 9.1 Update DashboardLayout to use ContentGrid
    - Replace existing grid layout with ContentGrid component
    - Configure appropriate column counts (sm: 1, md: 2, lg: 3, xl: 4)
    - Ensure episode cards maintain aspect ratios in grid
    - _Requirements: 9.1, 9.2, 9.3, 10.3_

  - [x] 9.2 Update PreviousEpisodes and UpcomingEpisodes components
    - Use ContentGrid for episode card layouts
    - Ensure consistent spacing between cards
    - Verify responsive behavior across breakpoints
    - _Requirements: 9.1, 9.3, 10.3_

- [x] 10. Update episode detail pages with refined components
  - [x] 10.1 Update EpisodeContentPage to use refined card components
    - Ensure ClipCard, QuoteCard, and BlogPostCard use new aspect ratios
    - Apply ContentGrid for content sections
    - Maintain consistent section spacing
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [x] 10.2 Update ClipDetailPage and QuoteDetailPage
    - Apply flat design styling to detail views
    - Ensure consistent header and metadata styling
    - Maintain design cohesion with card components
    - _Requirements: 10.1, 10.2, 10.5_

- [x] 11. Checkpoint - Verify visual consistency and responsiveness
  - Test all pages render correctly with new design system
  - Verify aspect ratios are maintained across viewport sizes
  - Check hover states and interactive feedback
  - Ensure color contrast meets accessibility requirements
  - Test keyboard navigation and focus states
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Update component exports and documentation
  - [x] 12.1 Update component index files
    - Export Card component from frontend/src/components/common/index.ts
    - Export ContentGrid component from frontend/src/components/common/index.ts
    - Update episode component exports if needed
    - _Requirements: 6.1, 9.1_

  - [x] 12.2 Add TypeScript type definitions
    - Create or update frontend/src/types/design-tokens.ts with AspectRatio type
    - Ensure all component props are properly typed
    - Export types for reuse across components
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

## Notes

- All tasks reference specific requirements for traceability
- Test tasks are marked as optional (*) to focus on core implementation first
- Checkpoints ensure incremental validation of the design system
- Existing color scheme is preserved - only shadows, borders, and aspect ratios are updated
- Components maintain backward compatibility where possible
