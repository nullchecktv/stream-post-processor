# Manual Testing Documentation

This directory contains manual testing documentation for the Episode Overview Page responsive layout implementation.

## Documents

### 1. `responsive-implementation-verification.md`
**Purpose:** Technical verification document that confirms all responsive features have been implemented correctly.

**Contents:**
- Detailed code review of each component
- Verification of Tailwind CSS responsive classes
- Confirmation of touch target sizes
- Accessibility implementation review
- Performance optimization verification

**Use this document to:**
- Verify implementation completeness
- Understand how responsive features are coded
- Reference specific implementation details
- Confirm technical requirements are met

### 2. `episode-overview-responsive-testing.md`
**Purpose:** Comprehensive manual testing checklist for QA and testing teams.

**Contents:**
- Step-by-step testing procedures
- Viewport-specific test cases
- Touch device testing scenarios
- Cross-browser testing checklist
- Performance testing guidelines
- Sign-off section for testers

**Use this document to:**
- Perform manual QA testing
- Verify responsive behavior on real devices
- Test across different browsers
- Document testing results
- Sign off on responsive implementation

## Testing Workflow

### For Developers
1. Review `responsive-implementation-verification.md` to understand what's been implemented
2. Make any necessary code changes
3. Test locally using browser DevTools device emulation
4. Verify all responsive breakpoints work correctly

### For QA Testers
1. Read `responsive-implementation-verification.md` for context
2. Use `episode-overview-responsive-testing.md` as your testing checklist
3. Test on real devices (iOS and Android)
4. Test across multiple browsers
5. Document any issues found
6. Sign off when all tests pass

## Quick Start Testing Guide

### Minimum Testing Requirements
To verify responsive layout is working:

1. **Desktop (≥1024px)**
   - Open Episode Overview Page
   - Verify 2-column content grid
   - Verify horizontal workflow progress
   - Verify Next Action Card appears before Workflow Progress

2. **Tablet (768px - 1023px)**
   - Resize browser to tablet width
   - Verify 2-column content grid maintained
   - Verify horizontal workflow progress maintained
   - Verify all content readable

3. **Mobile (<768px)**
   - Resize browser to mobile width
   - Verify single-column content grid
   - Verify vertical workflow progress
   - Verify inline editing form works
   - Verify all touch targets adequate

### Critical Test Cases
These must pass for production:

- [ ] No horizontal scrolling on any viewport size
- [ ] All text readable without zooming on mobile
- [ ] All buttons and inputs tappable on touch devices
- [ ] Form submission works on mobile
- [ ] Content cards stack correctly on mobile
- [ ] Workflow progress switches between horizontal/vertical layouts

## Test Environment Setup

### Browser DevTools
1. Open Chrome DevTools (F12)
2. Click "Toggle device toolbar" (Ctrl+Shift+M)
3. Select device presets or enter custom dimensions
4. Test at these key breakpoints:
   - 375px (iPhone SE)
   - 768px (iPad Portrait)
   - 1024px (iPad Landscape)
   - 1920px (Desktop)

### Real Device Testing
Test on at least:
- 1 iOS device (iPhone or iPad)
- 1 Android device (phone or tablet)
- 1 desktop browser (Chrome, Firefox, or Safari)

## Reporting Issues

When reporting responsive layout issues, include:

1. **Device/Browser:** What device and browser you're using
2. **Viewport Size:** Exact width × height in pixels
3. **Issue Description:** What's wrong and what you expected
4. **Screenshot:** Visual evidence of the issue
5. **Steps to Reproduce:** How to recreate the issue
6. **Severity:** Critical, High, Medium, or Low

## Status

**Implementation Status:** ✅ Complete

**Testing Status:** ⏳ Pending Manual Testing

**Last Updated:** 2025-01-15

## Next Steps

1. Assign QA tester to perform manual testing
2. Test on real iOS and Android devices
3. Verify accessibility with screen readers
4. Conduct cross-browser testing
5. Document any issues found
6. Fix any critical or high-priority issues
7. Re-test after fixes
8. Sign off on responsive implementation

## Questions?

If you have questions about:
- **Implementation details:** See `responsive-implementation-verification.md`
- **How to test:** See `episode-overview-responsive-testing.md`
- **Code changes:** Review the component files in `frontend/src/components/episodes/`
- **Requirements:** See `.kiro/specs/episode-overview-layout/requirements.md`
