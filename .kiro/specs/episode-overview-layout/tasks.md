# Implemention Plan

## Overview
This implementation plan focuses on enhancing the Episode Overview Page layout with compact workflow progress, repositioned next action card, inline episode editing, enhanced content cards styling, and consolidated episode view.

## Tasks

- [x] 1. Implement compact workflow progress component





  - Reduce vertical space by 30-40% through smaller indicators and tighter spacing
  - Update WorkflowProgress component with reduced padding (p-4 instead of p-6)
  - Reduce step indicator size from w-10 h-10 to w-8 h-8
  - Reduce font sizes for labels (text-xs instead of text-sm)
  - Maintain all accessibility features (ARIA labels, keyboard navigation)
  - Test responsive behavior on mobile, tablet, and desktop viewports
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 2. Reposition next action card to top of content area





  - Move NextActionCard to appear before WorkflowProgress in EpisodeOverviewPage
  - Update layout order: Breadcrumb → Episode Header → Next Action Card → Workflow Progress → Content Cards
  - Ensure Next Action Card is visible without scrolling on standard desktop viewports
  - Maintain existing gradient backgrounds and visual prominence
  - Test layout on different viewport sizes
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Implement inline episode metadata editing





- [x] 3.1 Create episode header edit mode UI


  - Add Edit/Save/Cancel button toggle in episode header
  - Transform metadata fields into editable inputs when in edit mode
  - Implement read-only mode display with current styling
  - Add visual indicator for edit mode (subtle background color change)
  - _Requirements: 8.1, 8.2, 8.3, 8.9_



- [x] 3.2 Implement form validation and state management





  - Add form state management (isEditing, editedData, validationErrors, isSaving)
  - Implement inline validation for title, episodeNumber, description, airDate, platforms, themes, seriesName
  - Display validation errors below fields with red text and icons
  - Implement unsaved changes warning on cancel


  - _Requirements: 8.4, 8.8_

- [x] 3.3 Wire up save and cancel functionality





  - Connect save button to episodesApi.update() method
  - Implement loading state during save operation
  - Handle successful save (return to read-only mode, refresh data)
  - Handle API errors with user-friendly messages
  - Implement cancel with confirmation if changes exist
  - _Requirements: 8.5, 8.6, 8.7, 8.10_

- [x] 4. Remove separate episode details page navigation





  - Remove "Edit Details" button that navigates to /episodes/{id}/details
  - Update episode header to use inline editing instead
  - Ensure all episode metadata previously on details page is displayed on overview
  - Maintain same data validation rules as details page
  - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 5. Enhance content cards visual styling





- [x] 5.1 Update content cards heading and base styles


  - Change "Generated Content" heading to "Created Content" in ContentCardsGrid
  - Add enhanced shadow and border styles to card base classes
  - Implement hover states with shadow-md and border color changes
  - Add transition-all duration-200 for smooth animations
  - _Requirements: 3.1, 3.2, 3.5_

- [x] 5.2 Add color accents to content cards

  - Add left border color accents: blue for plan, purple for blog, green for clips, amber for quotes
  - Implement colored icon backgrounds (bg-{color}-50 with text-{color}-600)
  - Update PlanCard, BlogPostCard, ClipsCard, QuotesCard components
  - Ensure consistent border-l-4 styling across all card types
  - _Requirements: 3.3_

- [x] 5.3 Add cursor pointer to clickable cards

  - Add cursor-pointer class to clickable content cards
  - Apply pointer cursor to entire card surface
  - Maintain pointer cursor during hover transitions
  - Ensure non-clickable cards use default cursor
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 6. Ensure responsive layout behavior





  - Test compact workflow progress on tablet and mobile viewports
  - Verify content cards grid stacks properly on smaller screens
  - Ensure next action card remains prominent across all viewport sizes
  - Test inline editing form on mobile devices
  - Verify all interactive elements are accessible on touch devices
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 7. Verify accessibility compliance





  - Verify all ARIA labels and roles are maintained after layout changes
  - Test keyboard navigation through workflow progress and edit form
  - Ensure content cards have appropriate ARIA attributes
  - Test screen reader announcements for next action card and edit mode
  - Verify logical tab order after repositioning elements
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_

- [x] 8. Performance optimization





  - Verify layout changes don't increase initial load time
  - Ensure CSS-based styling for content cards (no JavaScript animations)
  - Optimize workflow progress component to avoid unnecessary re-renders
  - Test smooth scrolling performance with new layout
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

