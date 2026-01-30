# Calm Creator Dashboard Theme - Tasks

## Overview

Implementation tasks for the Calm Creator Dashboard theme reskin. All tasks must ensure both dark and light themes work correctly with full visual parity.

## Phase 1: Foundation & Infrastructure

### 1.1 Set up CSS variables in index.css
- [x] Add all theme-independent tokens (:root)
  - Typography tokens (fonts, sizes, line heights)
  - Spacing tokens (space-1 through space-16)
  - Border radius tokens
  - Motion tokens (duration, easing)
  - Semantic state colors
- [x] Add dark theme variables ([data-theme="dark"])
  - Surface tokens (background, surface, surface-raised, surface-hover, border, divider, overlay)
  - Text tokens (primary, secondary, muted, disabled, on-accent)
  - Accent tokens (accent, accent-hover, accent-subtle, focus)
- [x] Add light theme variables ([data-theme="light"])
  - All surface tokens with light mode values
  - All text tokens with light mode values
  - All accent tokens with light mode values (including theme-specific focus)
- [x] Add body styles with CSS variable references
- [x] Add reduced motion media query support
- [x] Verify CSS is copy-safe and properly formatted

**Acceptance Criteria:**
- All tokens defined in both themes
- Dark mode uses calmer overlay opacity (0.6)
- Light mode focus color differs from dark mode
- Surface-hover and divider are distinct from surface-raised
- Accent-subtle includes usage note in comment

### 1.2 Create ThemeContext
- [x] Create `frontend/src/contexts/ThemeContext.tsx`
- [x] Define Theme type ('dark' | 'light')
- [x] Define ThemeContextType interface
- [x] Implement ThemeProvider component
  - Initialize theme from localStorage (default: 'dark')
  - Set data-theme attribute on document.documentElement
  - Save theme to localStorage on change
  - Provide toggleTheme function
- [x] Implement useTheme hook
- [x] Add TypeScript types

**Acceptance Criteria:**
- Theme persists across page reloads
- Theme changes apply immediately without reload
- data-theme attribute updates correctly
- Hook throws error if used outside provider

### 1.3 Create ThemeToggle component
- [x] Create `frontend/src/components/common/ThemeToggle.tsx`
- [x] Implement button with surface background
- [x] Add sun icon for dark mode
- [x] Add moon icon for light mode
- [x] Add hover state with surface-raised color
- [x] Add smooth transitions using motion tokens
- [x] Add aria-label for accessibility
- [x] Use CSS variables for all colors

**Acceptance Criteria:**
- Icons switch based on current theme
- Button uses theme variables
- Hover state works in both themes
- Accessible with keyboard navigation
- Smooth transitions (150-200ms)

### 1.4 Integrate ThemeProvider into App
- [x] Wrap App component with ThemeProvider in `frontend/src/App.tsx`
- [x] Verify theme initializes correctly
- [x] Test theme toggle functionality
- [x] Verify localStorage persistence

**Acceptance Criteria:**
- App renders in default dark theme
- Theme toggle works from any page
- Theme persists across navigation
- No console errors

### 1.5 Add ThemeToggle to UI
- [x] Add ThemeToggle to user profile dropdown
- [x] Add ThemeToggle to Settings page
- [x] Verify placement matches design
- [x] Test in both themes

**Acceptance Criteria:**
- Toggle accessible from profile dropdown
- Toggle accessible from Settings page
- Consistent styling in both locations

### 1.6 Set up ESLint rules for color checking
- [x] Add ESLint rules to block Tailwind color utilities
- [x] Add rules to block text-white, bg-white, text-black, bg-black
- [x] Add rules to block arbitrary color values (bg-[#...])
- [x] Add rules to block inline style colors
- [x] Test ESLint catches hardcoded colors
- [x] Document rules in project README

**Acceptance Criteria:**
- ESLint fails on hardcoded Tailwind colors
- ESLint fails on absolute colors (white/black)
- ESLint fails on arbitrary color values
- ESLint fails on inline style colors
- CI pipeline runs lint check

## Phase 2: Layout Components

### 2.1 Update Sidebar component
- [x] Replace all hardcoded colors with CSS variables
- [x] Use --color-surface for sidebar background
- [x] Use --color-surface-hover for nav item hover
- [x] Use --color-accent-subtle for active nav indicator (small bar/pill only)
- [x] Use text color tokens for nav text hierarchy
- [x] Add smooth transitions for hover states
- [x] Test in both dark and light themes
- [x] Verify navigation rules are followed (no full-fill accent backgrounds)

**Acceptance Criteria:**
- Sidebar renders correctly in both themes
- Active nav uses subtle indicator, not full fill
- Hover states work smoothly
- No hardcoded colors remain
- Text hierarchy is clear

### 2.2 Update Header component
- [x] Replace all hardcoded colors with CSS variables
- [x] Use --color-surface for header background
- [x] Use text color tokens appropriately
- [x] Update border colors to use --color-border
- [x] Test in both themes

**Acceptance Criteria:**
- Header renders correctly in both themes
- All colors use CSS variables
- Visual hierarchy maintained

### 2.3 Update DashboardLayout component
- [x] Replace background colors with --color-background
- [x] Update any surface colors to use --color-surface
- [x] Update spacing to use spacing tokens
- [ ] Test in both themes

**Acceptance Criteria:**
- Layout renders correctly in both themes
- Proper elevation hierarchy
- Consistent spacing

### 2.4 Update EpisodeLayout component
- [ ] Replace all hardcoded colors with CSS variables
- [x] Update surface and background colors
- [x] Update text colors
- [ ] Test in both themes

**Acceptance Criteria:**
- Episode layout works in both themes
- No visual regressions

## Phase 3: Common Components

### 3.1 Update Button component
- [x] Replace primary button colors with --color-accent and --color-accent-hover
- [x] Use --color-text-on-accent for button text
- [x] Replace secondary button colors with --color-surface and --color-border
- [x] Update focus states to use --color-focus
- [x] Use transition-colors (not transition-all)
- [x] Add focus ring with proper offset
- [x] Test all button variants in both themes

**Acceptance Criteria:**
- Primary buttons use accent colors
- Secondary buttons use surface colors
- Focus states visible on all surfaces
- No transition-all usage
- Works in both themes

### 3.2 Update Input component
- [x] Replace background with --color-surface
- [x] Replace border with --color-border
- [x] Replace text colors with appropriate tokens
- [x] Update focus state to use --color-focus
- [x] Update placeholder text to use --color-text-muted
- [x] Update disabled state to use --color-text-disabled
- [x] Test in both themes

**Acceptance Criteria:**
- Inputs render correctly in both themes
- Focus states clearly visible
- Disabled states properly styled
- Placeholder text uses muted color
ce-raised
- [x] Use semantic colors for success/warning/error/info (icons and borders only)
- [ ] Update text colors
- [x] Update border radius
- [ ] Test in both themes

**Acceptance Criteria:**
- Toasts render correctly in both themes
- Semantic colors used appropriately (not as large backgrounds)
- Clear visual feedback

### 3.5 Update LoadingSpinner component
- [x] Replace colors with --color-accent or --color-text-muted
- [ ] Test in both themes

**Acceptance Criteria:**
- Spinner visible in both themes
- Appropriate color usage

### 3.6 Update EmptyState component
- [x] Use --font-editorial for headings (if appropriate)
- [ ] Replace text colors with appropriate tokens
- [x] Update any background colors
- [ ] Test in both themes

**Acceptance Criteria:**
- Empty states render correctly in both themes
- Editorial font used appropriately (not for dense content)
- Clear visual hierarchy

### 3.7 Update StatusIndicator component
- [x] Replace status badge backgrounds with appropriate tokens
- [x] Use semantic colors for status types (small badges only)
- [ ] Update text colors
- [ ] Test in both themes

**Acceptance Criteria:**
- Status badges clear in both themes
- Semantic colors used appropriately
- Readable text

### 3.8 Update remaining common components
- [x] ConfirmDialog
- [x] ColorPicker
- [x] ChipInput
- [x] MultiSelect
- [x] MarkdownPreview
- [x] HelpTip
- [x] FormatToggle
- [x] ViewToggle
- [x] All skeleton components

**Acceptance Criteria:**
- All common components use CSS variables
- All work correctly in both themes
- No hardcoded colors

## Phase 4: Feature Components

### 4.1 Update Episode components
- [x] EpisodeCard - surfaces, borders, text, hover states
- [x] EpisodeHeader - backgrounds, text hierarchy
- [x] EpisodeStatusChip - semantic colors (small badges only)
- [x] BasicInfoStep, ThemesStep, PlatformsStep, ReviewStep - form styling
- [x] PlanCard, PlanForm, PlanRecommendations - surfaces and text
- [x] DetailedOutline - text hierarchy
- [x] MermaidDiagram - ensure visibility in both themes
- [x] NextActionCard - surfaces and accent usage
- [x] StatusHistoryTimeline - dividers and text
- [x] WorkflowProgress, MiniWorkflowProgress - progress indicators
- [ ] Test all episode components in both themes

**Acceptance Criteria:**
- All episode components work in both themes
- Proper elevation and hierarchy
- No hardcoded colors
- Forms are clear and usable

### 4.2 Update Clip components
- [x] ClipCard - surfaces, borders, hover states
- [x] ClipPlayer - controls visibility in both themes
- [x] ClipModal - modal styling
- [x] ClipsCard, ClipsList - list styling with dividers
- [x] ClipQualityIndicator - semantic colors (small indicators)
- [ ] Test all clip components in both themes

**Acceptance Criteria:**
- All clip components work in both themes
- Video controls visible
- Clear visual feedback

### 4.3 Update Quote components
- [x] QuoteCard - surfaces, borders, text
- [x] QuotesCard - list styling
- [ ] Test in both themes

**Acceptance Criteria:**
- Quote components work in both themes
- Readable text
- Clear hierarchy

### 4.4 Update Blog components
- [x] BlogPostCard - surfaces, borders, text
- [ ] Test in both themes

**Acceptance Criteria:**
- Blog components work in both themes
- Proper styling

### 4.5 Update Team components
- [x] Team cards and lists
- [x] Member management UI
- [x] Invitation components
- [ ] Test in both themes

**Acceptance Criteria:**
- Team components work in both themes
- Clear member hierarchy
- Invitation UI clear

### 4.6 Update Profile components
- [x] Profile forms
- [x] Settings sections
- [ ] Test in both themes

**Acceptance Criteria:**
- Profile components work in both themes
- Forms are usable

### 4.7 Update Activity components
- [x] ActivityBadge - semantic colors (small badge)
- [x] ActivityDropdown - surfaces and elevation
- [x] ActivityItem - text hierarchy and dividers
- [ ] Test in both themes

**Acceptance Criteria:**
- Activity components work in both themes
- Clear visual hierarchy
- Badges use semantic colors appropriately

### 4.8 Update Upload components
- [x] TrackUploader - surfaces and progress
- [x] TranscriptUploader - surfaces and feedback
- [x] UploadManager, UploadProgress - progress indicators
- [ ] Test in both themes

**Acceptance Criteria:**
- Upload components work in both themes
- Progress clearly visible
- Feedback clear

## Phase 5: Pages

### 5.1 Update Dashboard page
- [x] Replace all hardcoded colors
- [-] Test layout in both themes
- [ ] Verify all child components render correctly

**Acceptance Criteria:**
- Dashboard works perfectly in both themes
- No visual regressions
- Clear information hierarchy

### 5.2 Update Episode pages
- [x] EpisodesListPage
- [x] EpisodeOverviewPage
- [x] EpisodePlanPage
- [x] EpisodeContentPage
- [x] EpisodeClipsPage
- [x] EpisodeQuotesPage
- [ ] Test all in both themes

**Acceptance Criteria:**
- All episode pages work in both themes
- Consistent styling
- No hardcoded colors

### 5.3 Update Content detail pages
- [x] ClipDetailPage
- [x] QuoteDetailPage
- [x] BlogPage
- [ ] Test in both themes

**Acceptance Criteria:**
- Detail pages work in both themes
- Content clearly visible
- Proper hierarchy

### 5.4 Update Team pages
- [x] TeamsListPage
- [x] TeamDetailPage
- [x] TeamMembersPage
- [x] TeamGeneralSettingsPage
- [x] TeamBrandingSettingsPage
- [x] TeamWritingSettingsPage
- [ ] Test in both themes

**Acceptance Criteria:**
- Team pages work in both themes
- Settings forms usable
- Clear visual hierarchy

### 5.5 Update Auth pages
- [x] LoginPage
- [x] SignupPage
- [x] ForgotPasswordPage
- [x] EmailVerificationPage
- [ ] Test in both themes

**Acceptance Criteria:**
- Auth pages work in both themes
- Forms clear and accessible
- Error states visible

### 5.6 Update Profile and Settings pages
- [x] ProfilePage
- [x] OnboardingPage
- [ ] Test in both themes

**Acceptance Criteria:**
- Profile pages work in both themes
- Forms usable
- Clear feedback

### 5.7 Update Activity page
- [x] ActivityPage
- [ ] Test in both themes

**Acceptance Criteria:**
- Activity page works in both themes
- Timeline clear
- Items readable

### 5.8 Update NotFoundPage
- [x] Replace colors with CSS variables
- [ ] Test in both themes

**Acceptance Criteria:**
- 404 page works in both themes
- Clear messaging

## Phase 6: Testing & Polish

### 6.1 Visual regression testing
- [x] Test all pages in dark mode
- [ ] Test all pages in light mode
- [ ] Test theme toggle on every page
- [ ] Verify no visual regressions
- [ ] Check text contrast in both themes (WCAG AA)
- [ ] Verify focus states visible on all surfaces in both themes
- [ ] Test hover states in both themes

**Acceptance Criteria:**
- All pages render correctly in both themes
- No visual regressions
- Contrast meets WCAG AA
- Focus states always visible

### 6.2 Accessibility audit
- [ ] Run accessibility checker in dark mode
- [ ] Run accessibility checker in light mode
- [ ] Verify all focus states visible
- [ ] Test keyboard navigation in both themes
- [ ] Verify screen reader compatibility
- [ ] Test reduced motion preference

**Acceptance Criteria:**
- WCAG AA compliance in both themes
- Keyboard navigation works
- Screen readers work correctly
- Reduced motion respected

### 6.3 Browser testing
- [ ] Test in Chrome (dark and light)
- [ ] Test in Firefox (dark and light)
- [ ] Test in Safari (dark and light)
- [ ] Test in Edge (dark and light)
- [ ] Test on mobile browsers (iOS Safari, Chrome Mobile)

**Acceptance Criteria:**
- Works in all supported browsers
- Both themes render correctly
- No browser-specific issues

### 6.4 Performance testing
- [ ] Measure theme switch performance
- [ ] Verify no layout shifts during theme change
- [ ] Check bundle size impact
- [ ] Test with slow network
- [ ] Verify font loading performance

**Acceptance Criteria:**
- Theme switches instantly
- No layout shifts
- Minimal bundle size increase
- Fonts load efficiently

### 6.5 Final polish
- [ ] Review all spacing consistency
- [ ] Verify all transitions use correct duration
- [ ] Check all border radius consistency
- [ ] Verify no transition-all usage
- [ ] Ensure editorial fonts not used in dense views
- [ ] Verify semantic colors not used as large backgrounds
- [ ] Check navigation follows rules (no full-fill accents)

**Acceptance Criteria:**
- Consistent spacing throughout
- Smooth transitions everywhere
- Consistent border radius
- No transition-all
- Editorial fonts used appropriately
- Semantic colors used correctly
- Navigation styling correct

### 6.6 Documentation
- [ ] Update component documentation with theme usage
- [ ] Document CSS variable usage patterns
- [ ] Create theme maintenance guide
- [ ] Document ESLint rules
- [ ] Add examples to style guide

**Acceptance Criteria:**
- Clear documentation for developers
- Usage patterns documented
- Maintenance guide complete
- ESLint rules documented

### 6.7 CI/CD integration
- [ ] Verify ESLint runs in CI
- [ ] Add theme check to PR process
- [ ] Document deployment process
- [ ] Test in staging environment

**Acceptance Criteria:**
- CI fails on hardcoded colors
- PR checks include theme validation
- Staging deployment successful

## Success Criteria

- ✅ All components use CSS variables (0 hardcoded colors)
- ✅ Theme toggle works correctly
- ✅ Theme persists across sessions
- ✅ Both themes are fully functional
- ✅ All components render correctly in both dark and light themes
- ✅ Theme toggle maintains visual hierarchy in both modes
- ✅ No visual regressions in either theme
- ✅ Consistent visual hierarchy in both themes
- ✅ Proper elevation system in both themes
- ✅ Smooth transitions (no transition-all)
- ✅ Professional appearance in both themes
- ✅ Full visual parity between dark and light modes
- ✅ No performance degradation
- ✅ Accessible (WCAG AA) in both themes
- ✅ Works in all supported browsers
- ✅ Maintainable code
- ✅ Well-documented system
- ✅ CI guardrails prevent hardcoded colors
- ✅ Focus states visible on all surfaces in both themes
