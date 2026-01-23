# Calm Creator Dashboard Theme - Design

## Overview

This design document outlines the implementation strategy for reskinning the application with the Calm Creator Dashboard theme. The implementation uses CSS custom properties (variables) for all theme-dependent values, enabling seamless dark/light mode toggling.

**Critical:** Both dark and light themes are first-class requirements with full visual parity. All components must render correctly in both themes.

## Architecture

### Theme System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Root                         │
│                  (ThemeProvider wraps app)                   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ├─ ThemeContext (React Context)
                              │  └─ State: 'dark' | 'light'
                              │  └─ Persisted in localStorage
                              │
                              ├─ CSS Variables (index.css)
                              │  └─ [data-theme="dark"] { ... }
                              │  └─ [data-theme="light"] { ... }
                              │
                              └─ Components (use CSS variables)
                                 └─ bg-[var(--color-surface)]
                                 └─ text-[var(--color-text-primary)]
```

### File Structure

```
frontend/src/
├── index.css                          # Theme CSS variables
├── contexts/
│   └── ThemeContext.tsx              # Theme state management
├── components/
│   └── common/
│       └── ThemeToggle.tsx           # Theme toggle button
└── [all other components]            # Updated to use CSS variables
```

## Design Decisions

### 1. CSS Custom Properties Over Tailwind Theme

**Decision:** Use CSS custom properties with Tailwind's arbitrary values syntax rather than extending Tailwind's theme configuration.

**Rationale:**
- More flexible for runtime theme switching
- Works seamlessly with `data-theme` attribute
- No build-time configuration needed
- Easier to maintain and debug
- Standard CSS approach that works everywhere

**Implementation:**
```tsx
// Use arbitrary values with CSS variables
<div className="bg-[var(--color-surface)]">
```

### 2. localStorage for Theme Persistence

**Decision:** Store theme preference in localStorage, not in user profile/database.

**Rationale:**
- Immediate availability (no API call needed)
- Works before authentication
- Device-specific preference (users may prefer different themes on different devices)
- Simpler implementation
- No backend changes required

### 3. Context API for Theme State

**Decision:** Use React Context API for theme state management.

**Rationale:**
- Built-in React feature (no additional dependencies)
- Sufficient for simple theme state
- Easy to access from any component
- Lightweight and performant

### 4. Dark Mode as Default

**Decision:** Dark mode is the default theme. Users can toggle to light mode via the theme switcher.

**Rationale:**
- Aligns with "Calm Creator Dashboard" vision
- Reduces eye strain for extended sessions
- Modern SaaS aesthetic
- Matches the primary design direction

**Important:** Light mode is a first-class requirement with full visual parity to dark mode. Both themes must be fully functional and tested. All components, pages, and interactions must work flawlessly in both themes with no visual regressions.

## Component Design

### 1. Theme Context Provider

**Location:** `frontend/src/contexts/ThemeContext.tsx`

**Responsibilities:**
- Manage theme state ('dark' | 'light')
- Persist theme to localStorage
- Apply theme to document root
- Provide theme toggle function

**Interface:**
```typescript
type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}
```

**Key Features:**
- Initializes from localStorage or defaults to 'dark'
- Sets `data-theme` attribute on `document.documentElement`
- Saves to localStorage on every change
- Provides `useTheme` hook for easy access

### 2. Theme Toggle Component

**Location:** `frontend/src/components/common/ThemeToggle.tsx`

**Responsibilities:**
- Render toggle button with appropriate icon
- Call `toggleTheme` on click
- Show current theme state visually

**Visual Design:**
- Button with surface background
- Sun icon for dark mode (clicking switches to light)
- Moon icon for light mode (clicking switches to dark)
- Hover state with raised surface color
- Smooth transition using motion tokens

**Placement:**
Theme toggle lives in user profile dropdown and Settings page.

### 3. CSS Variables Definition

**Location:** `frontend/src/index.css`

**Structure:**
```css
/* Base theme variables (theme-independent tokens) */
:root {
  /* Typography */
  --font-ui: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --font-editorial: 'Source Serif 4', serif;

  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */

  /* Line Heights */
  --leading-body: 1.5;
  --leading-heading: 1.25;

  /* Spacing */
  --space-1: 0.25rem;    /* 4px */
  --space-2: 0.5rem;     /* 8px */
  --space-3: 0.75rem;    /* 12px */
  --space-4: 1rem;       /* 16px */
  --space-6: 1.5rem;     /* 24px */
  --space-8: 2rem;       /* 32px */
  --space-12: 3rem;      /* 48px */
  --space-16: 4rem;      /* 64px */

  /* Border Radius */
  --radius-sm: 0.375rem;  /* 6px */
  --radius-md: 0.625rem;  /* 10px */
  --radius-lg: 0.75rem;   /* 12px */
  --radius-full: 9999px;

  /* Motion */
  --duration-fast: 150ms;
  --duration-base: 200ms;
  --easing: ease-out;

  /* Semantic Colors (theme-independent) */
  --color-success: #22C55E;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #38BDF8;
}

/* Dark Theme (default) */
[data-theme="dark"] {
  /* Surfaces */
  --color-background: #0B0F14;
  --color-surface: #111827;
  --color-surface-raised: #1F2937;
  --color-surface-hover: #171F2E;     /* Between surface and raised for subtle hover */
  --color-border: #263041;
  --color-divider: #1A2332;           /* Softer than border, distinct from raised */
  --color-overlay: rgba(0, 0, 0, 0.6); /* Calm opacity for modal backdrops */

  /* Text */
  --color-text-primary: #E5E7EB;
  --color-text-secondary: #9CA3AF;
  --color-text-muted: #6B7280;
  --color-text-disabled: #4B5563;
  --color-text-on-accent: #FFFFFF;

  /* Accent */
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-accent-subtle: #312E81;     /* Use sparingly at small surface area */
  --color-focus: #818CF8;             /* Lighter tint for visibility */
}

/* Light Theme */
[data-theme="light"] {
  /* Surfaces */
  --color-background: #FFFFFF;
  --color-surface: #F9FAFB;
  --color-surface-raised: #F3F4F6;
  --color-surface-hover: #F5F6F7;     /* Between surface and raised for subtle hover */
  --color-border: #E5E7EB;
  --color-divider: #EBEDEF;           /* Softer than border, distinct from raised */
  --color-overlay: rgba(0, 0, 0, 0.5); /* Standard opacity for light mode */

  /* Text */
  --color-text-primary: #111827;
  --color-text-secondary: #4B5563;
  --color-text-muted: #6B7280;
  --color-text-disabled: #9CA3AF;
  --color-text-on-accent: #FFFFFF;

  /* Accent */
  --color-accent: #6366F1;
  --color-accent-hover: #4F46E5;
  --color-accent-subtle: #EEF2FF;
  --color-focus: #6366F1;             /* Deeper for contrast on light surfaces */
}

/* Apply background to body */
body {
  background-color: var(--color-background);
  color: var(--color-text-primary);
  font-family: var(--font-ui);
  transition: background-color var(--duration-base) var(--easing),
              color var(--duration-base) var(--easing);
}
```

### Token Definitions

**Surface Tokens:**
- `--color-background`: Page background (lowest elevation)
- `--color-surface`: Cards, panels (elevated from background)
- `--color-surface-raised`: Modals, dropdowns (highest elevation)
- `--color-surface-hover`: Hover state for interactive surfaces (lists, cards)
- `--color-border`: Subtle borders around cards and inputs
- `--color-divider`: Hairline dividers between rows/sections
- `--color-overlay`: Modal backdrop overlay

**Text Tokens:**
- `--color-text-primary`: Main content, headings
- `--color-text-secondary`: Supporting text, labels
- `--color-text-muted`: Metadata, captions, helper text
- `--color-text-disabled`: Disabled state text
- `--color-text-on-accent`: Text on accent-colored backgrounds (buttons, badges)

**Accent Tokens:**
- `--color-accent`: Primary actions, links
- `--color-accent-hover`: Hover state for accent elements
- `--color-accent-subtle`: Subtle accent backgrounds (badges, highlights) - **use sparingly at small surface area; prefer borders/indicators over full fills**
- `--color-focus`: Focus ring color (theme-specific: lighter in dark mode, deeper in light mode for contrast)

**Focus Color Note:**
The focus color is theme-specific to ensure visibility on all surfaces:
- Dark mode: Lighter tint (#818CF8) for visibility on dark backgrounds
- Light mode: Deeper shade (#6366F1) for contrast on light surfaces

Focus states must be visible on neutral surfaces, accent surfaces, and in both themes.

**Semantic State Tokens:**
- `--color-success`: Success states (#22C55E)
- `--color-warning`: Warning states (#F59E0B)
- `--color-error`: Error states (#EF4444)
- `--color-info`: Info states (#38BDF8)

**Semantic State Usage Rule:**
Semantic colors (success, warning, error, info) are limited to:
- Icons
- Small badges
- Inline indicators
- Borders
- Feedback messages

**They must NOT be used as large background surfaces.** This prevents jarring UI and maintains the calm aesthetic.

### Navigation-Specific Rules

Navigation requires special attention to prevent visual drift:

**Sidebar Background:**
- Use `--color-surface` for sidebar background
- Never introduce custom navigation colors

**Active Navigation Item:**
- Use `--color-accent-subtle` only as a small indicator (left bar or pill)
- Never use full-fill accent backgrounds on nav items
- Keep active state subtle and calm

**Navigation Hover:**
- Use `--color-surface-hover` for hover states
- Transition smoothly with `duration-[var(--duration-fast)]`

**Navigation Text:**
- Primary nav items: `--color-text-primary`
- Secondary nav items: `--color-text-secondary`
- Muted/helper text: `--color-text-muted`

**Critical:** Navigation must not introduce new colors outside the defined token system.

## Component Migration Strategy

### Phase 1: Foundation (Priority 1)

**Components to update first:**
1. **App.tsx** - Wrap with ThemeProvider
2. **index.css** - Add CSS variables
3. **ThemeContext.tsx** - Create context
4. **ThemeToggle.tsx** - Create toggle component

**Verification:** Both dark and light themes work correctly at the foundation level.

### Phase 2: Layout Components (Priority 2)

**Components that affect overall structure:**
1. **Sidebar.tsx** - Navigation background and text
2. **Header.tsx** - Top bar styling
3. **DashboardLayout.tsx** - Main layout container
4. **EpisodeLayout.tsx** - Episode page layout

**Verification:** Layout renders correctly in both dark and light themes.

### Phase 3: Common Components (Priority 3)

**Reusable UI components:**
1. **Button.tsx** - Primary, secondary, and tertiary buttons
2. **Input.tsx** - Form inputs
3. **Modal.tsx** - Modal dialogs
4. **Toast.tsx** - Toast notifications
5. **LoadingSpinner.tsx** - Loading states
6. **EmptyState.tsx** - Empty state messages
7. **StatusIndicator.tsx** - Status badges

**Verification:** Each component renders correctly in both themes.

### Phase 4: Feature Components (Priority 4)

**Feature-specific components:**
1. **Episode components** - Cards, headers, forms
2. **Clip components** - Clip cards, player
3. **Quote components** - Quote cards, graphics
4. **Team components** - Team management UI
5. **Profile components** - User profile UI

**Verification:** All feature components work in both themes.

### Phase 5: Pages & Polish (Priority 5)

**Top-level page components:**
1. **Dashboard.tsx**
2. **EpisodesListPage.tsx**
3. **EpisodeOverviewPage.tsx**
4. **ProfilePage.tsx**
5. **TeamDetailPage.tsx**
6. All other pages

**Verification:** Full application works flawlessly in both dark and light themes.

## Component Update Patterns

### Pattern 1: Background Colors

**Before:**
```tsx
<div className="bg-gray-900">
```

**After:**
```tsx
<div className="bg-[var(--color-surface)]">
```

### Pattern 2: Text Colors

**Before:**
```tsx
<h1 className="text-white">Title</h1>
<p className="text-gray-400">Description</p>
<span className="text-gray-500">Metadata</span>
```

**After:**
```tsx
<h1 className="text-[var(--color-text-primary)]">Title</h1>
<p className="text-[var(--color-text-secondary)]">Description</p>
<span className="text-[var(--color-text-muted)]">Metadata</span>
```

### Pattern 3: Borders

**Before:**
```tsx
<div className="border border-gray-700">
```

**After:**
```tsx
<div className="border border-[var(--color-border)]">
```

### Pattern 4: Buttons

**Before:**
```tsx
<button className="bg-indigo-600 hover:bg-indigo-700 text-white">
  Click me
</button>
```

**After:**
```tsx
<button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)] transition-colors duration-[var(--duration-fast)]">
  Click me
</button>
```

### Pattern 5: Cards

**Before:**
```tsx
<div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
```

**After:**
```tsx
<div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--radius-lg)] p-[var(--space-6)]">
```

### Pattern 6: Elevation/Hover States

**Before:**
```tsx
<div className="bg-gray-800 hover:bg-gray-700">
```

**After:**
```tsx
<div className="bg-[var(--color-surface)] hover:bg-[var(--color-surface-hover)] transition-colors duration-[var(--duration-fast)]">
```

### Pattern 7: Focus States

**Before:**
```tsx
<button className="focus:ring-2 focus:ring-indigo-500">
```

**After:**
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]">
```

**Critical:** Use `--color-focus`, not `--color-accent`, for focus states. The focus color must be visible on both neutral and accent surfaces in both themes.

### Pattern 8: Dividers

**Before:**
```tsx
<div className="border-t border-gray-700">
```

**After:**
```tsx
<div className="border-t border-[var(--color-divider)]">
```

### Pattern 9: Overlays

**Before:**
```tsx
<div className="bg-black bg-opacity-75">
```

**After:**
```tsx
<div className="bg-[var(--color-overlay)]">
```

## Typography Implementation

### Font Loading

**Location:** `frontend/index.html` or `frontend/src/index.css`

**Google Fonts:**
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Source+Serif+4:wght@400;600&display=swap" rel="stylesheet">
```

**Or self-hosted** (preferred for performance):
```css
@font-face {
  font-family: 'Inter';
  src: url('/fonts/Inter-Regular.woff2') format('woff2');
  font-weight: 400;
  font-display: swap;
}
/* Additional weights... */
```

### Typography Usage

**Headings:**
```tsx
<h1 className="text-[length:var(--text-3xl)] leading-[var(--leading-heading)] font-semibold text-[var(--color-text-primary)]">
  Page Title
</h1>

<h2 className="text-[length:var(--text-2xl)] leading-[var(--leading-heading)] font-semibold text-[var(--color-text-primary)]">
  Section Title
</h2>
```

**Body Text:**
```tsx
<p className="text-[length:var(--text-base)] leading-[var(--leading-body)] text-[var(--color-text-primary)]">
  Main content text
</p>
```

**Editorial Accent:**
```tsx
<h2 className="font-[family-name:var(--font-editorial)] text-[length:var(--text-2xl)] text-[var(--color-text-primary)]">
  Welcome to Your Dashboard
</h2>
```

**Editorial Font Usage Rule:**
Editorial typefaces must NOT be used for:
- Body copy
- Forms
- Navigation
- Data-dense views (tables, lists)

Use editorial fonts only for:
- Section headers
- Empty states
- Landing pages
- Light editorial moments

## Spacing Implementation

### Consistent Spacing

**Card Padding:**
```tsx
<div className="p-[var(--space-4)]">  {/* 16px */}
<div className="p-[var(--space-6)]">  {/* 24px */}
```

**Section Gaps:**
```tsx
<div className="space-y-[var(--space-8)]">  {/* 32px between children */}
<div className="space-y-[var(--space-12)]"> {/* 48px between children */}
```

**Page Padding:**
```tsx
<div className="p-[var(--space-6)] md:p-[var(--space-12)] lg:p-[var(--space-16)]">
  {/* 24px mobile, 48px tablet, 64px desktop */}
</div>
```

## Motion Implementation

### Transition Rules

**CRITICAL: Never use `transition-all`**

`transition-all` causes:
- Accidental animations on unintended properties
- Performance issues
- Unpredictable behavior

**DO:**
```tsx
<button className="transition-colors duration-[var(--duration-fast)]">
<div className="transition-opacity duration-[var(--duration-base)]">
<div className="transition-transform duration-[var(--duration-fast)]">
```

**DON'T:**
```tsx
<div className="transition-all duration-200"> {/* NEVER DO THIS */}
```

**Allowed transition properties:**
- `transition-colors`
- `transition-opacity`
- `transition-transform`
- `transition-shadow`
- Specific properties: `transition-[background-color,color]`

### Animations

**Skeleton Loaders:**
```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.skeleton {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  background-color: var(--color-surface-raised);
}
```

## Accessibility Considerations

### Color Contrast

All text/background combinations must meet WCAG AA standards:
- Normal text: 4.5:1 contrast ratio
- Large text (18px+): 3:1 contrast ratio

**Verification:**
- Use browser DevTools contrast checker
- Test both dark and light themes
- Verify semantic colors (success, warning, error, info)

### Focus States

**Visible Focus Indicators:**
```tsx
<button className="focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)]">
```

**Focus must be visible on:**
- Neutral surfaces (background, surface, surface-raised)
- Accent surfaces (accent buttons, badges)
- Both dark and light themes

### Reduced Motion

**Respect user preferences:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Testing Strategy

### Visual Testing

**Manual Testing Checklist:**
1. ✅ All pages render correctly in dark mode
2. ✅ All pages render correctly in light mode
3. ✅ Theme toggle works without page reload
4. ✅ Theme preference persists across sessions
5. ✅ No hardcoded colors remain
6. ✅ Text contrast meets WCAG AA in both themes
7. ✅ Focus states are visible on all surfaces in both themes
8. ✅ Hover states work correctly in both themes
9. ✅ Transitions are smooth (no `transition-all`)
10. ✅ No visual regressions in either theme
11. ✅ Semantic colors used appropriately (not as large backgrounds)
12. ✅ Editorial fonts not used in dense workflows

### Component Testing

**Test Each Component:**
1. Render in dark mode
2. Render in light mode
3. Toggle theme while component is mounted
4. Verify colors update immediately
5. Check for any hardcoded values
6. Verify focus states work on all surfaces
7. Test hover states in both themes

### Browser Testing

**Test in:**
- Chrome/Edge (Chromium)
- Firefox
- Safari
- Mobile browsers (iOS Safari, Chrome Mobile)

### Automated Testing

**CI Guardrail Against Hardcoded Colors:**

Add ESLint rule or custom lint check to block:
- Tailwind color utilities: `text-gray-*`, `bg-gray-*`, `border-gray-*`, etc.
- Tailwind absolute colors: `text-white`, `bg-white`, `text-black`, `bg-black`
- Arbitrary Tailwind colors: `bg-[#...]`, `text-[#...]`, `border-[rgb...]`
- Inline style colors: `style={{ color: "#...", backgroundColor: "#...", borderColor: "..." }}`

**CI must fail if any of these patterns are present.**

**Example ESLint rule:**
```js
// .eslintrc.js
rules: {
  'no-restricted-syntax': [
    'error',
    {
      selector: 'JSXAttribute[name.name="className"] Literal[value=/text-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-/]',
      message: 'Use CSS variables instead of Tailwind color utilities'
    },
    {
      selector: 'JSXAttribute[name.name="className"] Literal[value=/bg-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-/]',
      message: 'Use CSS variables instead of Tailwind color utilities'
    },
    {
      selector: 'JSXAttribute[name.name="className"] Literal[value=/border-(gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)-/]',
      message: 'Use CSS variables instead of Tailwind color utilities'
    },
    {
      selector: 'JSXAttribute[name.name="className"] Literal[value=/\\[(#|rgb|rgba|hsl|hsla)/]',
      message: 'Use CSS variables instead of arbitrary color values'
    },
    {
      selector: 'JSXAttribute[name.name="style"] ObjectExpression Property[key.name=/^(color|backgroundColor|borderColor)$/]',
      message: 'Use CSS variables instead of inline style colors'
    }
  ]
}
```

**CI Pipeline:**
```yaml
# .github/workflows/theme-check.yml
- name: Check for hardcoded colors
  run: npm run lint
```

## Performance Considerations

### CSS Variable Performance

**Optimization:**
- CSS variables are performant (native browser feature)
- Theme switching is instant (no re-render needed)
- Transitions smooth out visual changes

### Font Loading

**Strategy:**
- Use `font-display: swap` to prevent FOIT (Flash of Invisible Text)
- Preload critical fonts
- Consider self-hosting for better performance

### Bundle Size

**Impact:**
- CSS variables add minimal overhead
- ThemeContext is lightweight
- No additional dependencies required

## Migration Checklist

### Pre-Migration

- [ ] Review all existing components
- [ ] Identify hardcoded colors
- [ ] Create component inventory
- [ ] Set up CSS variables in index.css
- [ ] Set up ESLint rules for color checking

### During Migration

- [ ] Create ThemeContext
- [ ] Create ThemeToggle component
- [ ] Update App.tsx with ThemeProvider
- [ ] Migrate components by priority
- [ ] Test each component in both themes after migration
- [ ] Verify no hardcoded colors remain
- [ ] Verify focus states work on all surfaces

### Post-Migration

- [ ] Full visual regression testing in both themes
- [ ] Accessibility audit in both themes
- [ ] Performance testing
- [ ] Documentation updates
- [ ] Team training on theme system

## Rollout Strategy

### Phase 1: Infrastructure (Week 1)
- Set up CSS variables
- Create ThemeContext
- Create ThemeToggle
- Test theme switching mechanism
- **Verify both themes work at foundation level**

### Phase 2: Core Components (Week 2)
- Migrate layout components
- Migrate common components
- Test in isolation
- **Verify both themes for each component**

### Phase 3: Feature Components (Week 3)
- Migrate episode components
- Migrate clip/quote components
- Migrate team components
- **Verify both themes for all features**

### Phase 4: Pages & Polish (Week 4)
- Migrate all pages
- Final testing in both themes
- Bug fixes
- Documentation
- **Full visual parity verification**

## Maintenance Guidelines

### Adding New Components

**Always use CSS variables:**
```tsx
// ✅ Correct
<div className="bg-[var(--color-surface)]">

// ❌ Wrong - will be caught by ESLint
<div className="bg-gray-900">
```

### Updating Colors

**Modify CSS variables, not components:**
```css
/* Update in index.css */
[data-theme="dark"] {
  --color-accent: #7C3AED; /* Change to purple */
}

[data-theme="light"] {
  --color-accent: #7C3AED; /* Update both themes */
}
```

### Adding New Theme Values

**Follow the pattern:**
```css
:root {
  --new-token: value; /* If theme-independent */
}

[data-theme="dark"] {
  --new-color: dark-value;
}

[data-theme="light"] {
  --new-color: light-value;
}
```

## Future Enhancements

### Potential Additions

1. **System Theme Detection:**
   ```tsx
   const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
   ```

2. **Additional Themes:**
   - High contrast mode
   - Custom brand themes
   - Seasonal themes

3. **Theme Customization:**
   - User-selectable accent colors
   - Font size preferences
   - Spacing density options

4. **Sync Across Devices:**
   - Store theme in user profile
   - Sync via API
   - Override with local preference

## Success Criteria

### Functional Requirements

- ✅ All components use CSS variables
- ✅ Theme toggle works correctly
- ✅ Theme persists across sessions
- ✅ No hardcoded theme colors
- ✅ Both themes are fully functional
- ✅ All components render correctly in both dark and light themes
- ✅ Theme toggle maintains visual hierarchy in both modes

### Visual Requirements

- ✅ Consistent visual hierarchy in both themes
- ✅ Proper elevation system in both themes
- ✅ Smooth transitions (no `transition-all`)
- ✅ Professional appearance in both themes
- ✅ No visual regressions in either theme
- ✅ Full visual parity between dark and light modes

### Technical Requirements

- ✅ No performance degradation
- ✅ Accessible (WCAG AA) in both themes
- ✅ Works in all supported browsers
- ✅ Maintainable code
- ✅ Well-documented system
- ✅ CI guardrails prevent hardcoded colors
- ✅ Focus states visible on all surfaces in both themes
