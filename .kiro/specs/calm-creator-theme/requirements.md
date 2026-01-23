# Calm Creator Dashboard Theme - Requirements

## Overview

Reskin the entire application with the "Calm Creator Dashboard" theme - a modern, dark-first SaaS UI designed for content creators. The theme prioritizes clarity, speed, and trust over visual novelty, creating a professional control room experience.

**Theme Architecture:** All colors use semantic CSS custom properties (CSS variables) to enable future light/dark theme toggling without component changes.

## User Stories

### US-1: As a creator, I want a calm, dark interface that reduces eye strain during extended work sessions
**Acceptance Criteria:**
- AC-1.1: All pages use semantic color variables (e.g., `var(--color-background)`) instead of hardcoded values
- AC-1.2: Dark theme is the default with `data-theme="dark"` attribute on root element
- AC-1.3: Text contrast meets WCAG AA standards with the defined text colors
- AC-1.4: Surface colors create clear visual hierarchy using semantic variables
- AC-1.5: No bright or jarring colors that cause eye fatigue
- AC-1.6: All color references use CSS custom properties to enable future theme toggling

### US-2: As a creator, I want consistent typography that's easy to read at all sizes
**Acceptance Criteria:**
- AC-2.1: Inter font family is used for all UI text via `var(--font-ui)`
- AC-2.2: Type scale (12px to 30px) is consistently applied using CSS variables
- AC-2.3: Line heights use `var(--leading-body)` for body text and `var(--leading-heading)` for headings
- AC-2.4: Optional editorial typeface (Source Serif 4 or Fraunces) is available via `var(--font-editorial)` for section headers and empty states

### US-3: As a creator, I want a single, disciplined accent color that guides my attention
**Acceptance Criteria:**
- AC-3.1: Primary accent uses `var(--color-accent)` for all primary actions
- AC-3.2: Accent hover state uses `var(--color-accent-hover)` for interactive feedback
- AC-3.3: Subtle accent backgrounds use `var(--color-accent-subtle)`
- AC-3.4: Semantic colors (success, warning, error, info) are used sparingly and only when needed
- AC-3.5: No gradients, glows, or multiple competing accent colors
- AC-3.6: All accent color references use CSS variables for theme flexibility

### US-4: As a creator, I want consistent spacing that creates visual rhythm
**Acceptance Criteria:**
- AC-4.1: All spacing uses the 8px base scale via CSS variables (--space-1 through --space-16)
- AC-4.2: Card padding is 16-24px consistently using `var(--space-4)` or `var(--space-6)`
- AC-4.3: Section separation is 32-48px using `var(--space-8)` or `var(--space-12)`
- AC-4.4: Page padding scales from 24px (mobile) to 48-64px (desktop) using responsive spacing variables

### US-5: As a creator, I want buttons and controls that feel confident and predictable
**Acceptance Criteria:**
- AC-5.1: Primary buttons use `var(--color-accent)` background with white text
- AC-5.2: Secondary buttons use `var(--color-surface)` with `var(--color-border)` borders
- AC-5.3: Button radius uses `var(--radius-md)` for medium corners
- AC-5.4: No gradients, glows, or animated button effects
- AC-5.5: Hover states use `var(--color-accent-hover)` and are subtle and consistent

### US-6: As a creator, I want cards and panels with subtle, stable styling
**Acceptance Criteria:**
- AC-6.1: Card radius uses `var(--radius-md)` or `var(--radius-lg)` consistently
- AC-6.2: Cards use 1px solid border with `var(--color-border)`
- AC-6.3: Shadows are minimal or none (stability over float)
- AC-6.4: Raised surfaces use `var(--color-surface-raised)` for modals and hover states

### US-7: As a creator, I want motion that reinforces state and progress without distraction
**Acceptance Criteria:**
- AC-7.1: All transitions use `var(--duration-fast)` or `var(--duration-base)`
- AC-7.2: Easing uses `var(--easing)` for natural feel
- AC-7.3: Step transitions, skeleton loaders, and progress indicators are used
- AC-7.4: No playful or exaggerated animations

### US-8: As a creator, I want platform-specific previews that look like real outputs
**Acceptance Criteria:**
- AC-8.1: Aspect-ratio previews support 9:16, 1:1, and 16:9 formats
- AC-8.2: Caption blocks are styled to resemble real platforms
- AC-8.3: Platform icons are monochrome and subtle using `var(--color-text-muted)`
- AC-8.4: Status pills ("Generated", "Approved", "Exported") use semantic color variables

### US-9: As a creator, I want the dashboard to feel like a professional control room
**Acceptance Criteria:**
- AC-9.1: Dashboard layout is clean with clear information hierarchy
- AC-9.2: Episode cards show status, metadata, and actions clearly using theme variables
- AC-9.3: Navigation is predictable and always accessible
- AC-9.4: Empty states use `var(--font-editorial)` and helpful guidance

### US-10: As a creator, I want forms and inputs that are clear and easy to use
**Acceptance Criteria:**
- AC-10.1: Input fields have clear labels using `var(--color-text-secondary)`
- AC-10.2: Form validation is immediate and helpful using semantic colors
- AC-10.3: Input backgrounds use `var(--color-surface)` to contrast with page background
- AC-10.4: Focus states use `var(--color-accent)` with clear visual feedback

### US-11: As a creator, I want to toggle between dark and light themes based on my preference
**Acceptance Criteria:**
- AC-11.1: Theme toggle button is accessible in the user profile or settings area
- AC-11.2: Theme preference is persisted in localStorage
- AC-11.3: Theme preference is applied immediately without page reload
- AC-11.4: Theme toggle icon clearly indicates current theme (sun/moon icons)
- AC-11.5: Theme preference is loaded on app initialization
- AC-11.6: All components automatically adapt when theme changes (no manual updates needed)

## Design Tokens

### Color Token Architecture

**Critical:** All colors must use semantic CSS custom properties (variables) to enable future theme toggling. Never use hardcoded color values in components. Components should reference semantic variables like `var(--color-background)`, not specific hex values.

### Semantic Color Variables
```css
/* Surfaces - semantic names that work for any theme */
--color-background: /* theme-specific value */;  /* Page background - lowest elevation */
--color-surface: /* theme-specific value */;     /* Cards, panels - elevated from background */
--color-surface-raised: /* theme-specific value */; /* Modals, dropdowns, hover - highest elevation */
--color-border: /* theme-specific value */;      /* Subtle borders and dividers */

/* Text - semantic names for hierarchy */
--color-text-primary: /* theme-specific value */;   /* Main content, headings */
--color-text-secondary: /* theme-specific value */; /* Supporting text, labels */
--color-text-muted: /* theme-specific value */;     /* Metadata, captions, helper text */
--color-text-disabled: /* theme-specific value */;  /* Disabled state text */

/* Accent - brand color that adapts to theme */
--color-accent: /* theme-specific value */;        /* Primary actions, links, focus states */
--color-accent-hover: /* theme-specific value */;  /* Hover state for accent elements */
--color-accent-subtle: /* theme-specific value */; /* Subtle backgrounds, badges (dark tint in dark mode) */

/* Semantic states - consistent across themes */
--color-success: #22C55E;
--color-warning: #F59E0B;
--color-error: #EF4444;
--color-info: #38BDF8;
```

### Dark Theme Values (Default)
```css
[data-theme="dark"] {
  /* Surfaces */
  --color-background: #0B0F14;      /* Page background - darkest */
  --color-surface: #111827;          /* Cards, panels - elevated from background */
  --color-surface-raised: #1F2937;   /* Modals, dropdowns, hover states - highest elevation */
  --color-border: #263041;           /* Subtle borders and dividers */

  /* Text */
  --color-text-primary: #E5E7EB;     /* Main content, headings */
  --color-text-secondary: #9CA3AF;   /* Supporting text, labels */
  --color-text-muted: #6B7280;       /* Metadata, captions, helper text */
  --color-text-disabled: #4B5563;    /* Disabled state text */

  /* Accent */
  --color-accent: #6366F1;           /* Primary actions, links, focus states */
  --color-accent-hover: #4F46E5;     /* Hover state for accent elements */
  --color-accent-subtle: #312E81;    /* Dark indigo tint for backgrounds, badges */
}
```

### Light Theme Values (Future - Not Implemented Yet)
```css
[data-theme="light"] {
  /* Surfaces - inverted for light mode */
  --color-background: #FFFFFF;       /* Page background - lightest */
  --color-surface: #F9FAFB;          /* Cards, panels - slightly darker than background */
  --color-surface-raised: #F3F4F6;   /* Modals, dropdowns, hover - more contrast */
  --color-border: #E5E7EB;           /* Subtle borders and dividers */

  /* Text - inverted for light mode */
  --color-text-primary: #111827;     /* Main content, headings */
  --color-text-secondary: #4B5563;   /* Supporting text, labels */
  --color-text-muted: #6B7280;       /* Metadata, captions, helper text */
  --color-text-disabled: #9CA3AF;    /* Disabled state text */

  /* Accent - same brand color, adjusted subtle bg */
  --color-accent: #6366F1;           /* Primary actions, links, focus states */
  --color-accent-hover: #4F46E5;     /* Hover state for accent elements */
  --color-accent-subtle: #EEF2FF;    /* Light indigo tint for backgrounds, badges */
}
```

### Typography Tokens
```css
/* Font Families */
--font-ui: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
--font-editorial: 'Source Serif 4', serif;

/* Font Sizes */
--text-xs: 12px;
--text-sm: 14px;
--text-base: 16px;
--text-lg: 18px;
--text-xl: 20px;
--text-2xl: 24px;
--text-3xl: 30px;

/* Line Heights */
--leading-body: 1.5;
--leading-heading: 1.25;
```

### Spacing Tokens
```css
--space-1: 4px;
--space-2: 8px;
--space-3: 12px;
--space-4: 16px;
--space-6: 24px;
--space-8: 32px;
--space-12: 48px;
--space-16: 64px;
```

### Border Radius Tokens
```css
--radius-sm: 6px;
--radius-md: 10px;
--radius-lg: 12px;
--radius-full: 9999px;
```

### Motion Tokens
```css
--duration-fast: 150ms;
--duration-base: 200ms;
--easing: ease-out;
```

## Implementation Guidelines

### Surface Elevation System

The theme uses a three-level elevation system to create visual hierarchy:

**Level 1 - Background** (`--color-background`)
- Page background
- Lowest elevation
- Use for: Main page container, app background

**Level 2 - Surface** (`--color-surface`)
- Cards, panels, sections
- Elevated from background
- Use for: Episode cards, content panels, sidebar, form containers

**Level 3 - Raised Surface** (`--color-surface-raised`)
- Modals, dropdowns, popovers
- Highest elevation, appears "above" other content
- Use for: Modal dialogs, dropdown menus, tooltips, hover states on cards

### Text Color Usage Rules

**Primary Text** (`--color-text-primary`)
- Main content, body copy
- Headings (h1-h6)
- Important labels
- Use for: Episode titles, page headings, primary navigation

**Secondary Text** (`--color-text-secondary`)
- Supporting information
- Form labels
- Section subheadings
- Use for: Input labels, card metadata labels, secondary navigation

**Muted Text** (`--color-text-muted`)
- Tertiary information
- Timestamps, captions
- Helper text, hints
- Placeholder text
- Use for: "2 hours ago", file sizes, character counts, input placeholders

**Disabled Text** (`--color-text-disabled`)
- Disabled form elements
- Inactive states
- Use for: Disabled buttons, inactive menu items, unavailable options

### Using Theme Variables

**DO:**
```tsx
// Use semantic variables
<div className="bg-[var(--color-surface)] text-[var(--color-text-primary)]">
  <button className="bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)]">
    Click me
  </button>
</div>

// Text hierarchy example
<div className="bg-[var(--color-surface)] p-6">
  <h2 className="text-[var(--color-text-primary)] text-xl">Episode Title</h2>
  <p className="text-[var(--color-text-secondary)] text-sm">Episode Number: 42</p>
  <span className="text-[var(--color-text-muted)] text-xs">Created 2 hours ago</span>
</div>

// Elevation example
<div className="bg-[var(--color-background)]">
  <div className="bg-[var(--color-surface)] p-4">
    Card content
    <div className="bg-[var(--color-surface-raised)] p-2">
      Dropdown menu
    </div>
  </div>
</div>
```

**DON'T:**
```tsx
// Never hardcode theme-specific colors
<div className="bg-gray-900 text-gray-100">
  <button className="bg-indigo-500 hover:bg-indigo-600">
    Click me
  </button>
</div>

// Don't mix elevation levels incorrectly
<div className="bg-[var(--color-surface-raised)]">
  <div className="bg-[var(--color-background)]"> {/* Wrong - going backwards in elevation */}
    Content
  </div>
</div>
```

### Theme Switching (Future)

The architecture supports future theme switching via:
```tsx
// Future implementation
document.documentElement.setAttribute('data-theme', 'light');
// or
document.documentElement.setAttribute('data-theme', 'dark');
```

All components will automatically adapt because they use semantic variables.

### Theme Toggle Implementation

**ThemeContext Provider:**
```tsx
// src/contexts/ThemeContext.tsx
import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [theme, setTheme] = useState<Theme>(() => {
    const stored = localStorage.getItem('theme');
    return (stored === 'light' || stored === 'dark') ? stored : 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};
```

**Theme Toggle Button Component:**
```tsx
// src/components/common/ThemeToggle.tsx
import { useTheme } from '../../contexts/ThemeContext';

export const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-[var(--radius-md)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-raised)] border border-[var(--color-border)] transition-colors duration-[var(--duration-fast)]"
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {theme === 'dark' ? (
        <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-[var(--color-text-primary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
};
```

**Usage in App:**
```tsx
// src/App.tsx
import { ThemeProvider } from './contexts/ThemeContext';

function App() {
  return (
    <ThemeProvider>
      {/* Rest of app */}
    </ThemeProvider>
  );
}
```

## Technical Constraints

- Must maintain existing component structure and functionality
- Must not break existing features or workflows
- Must be responsive across mobile, tablet, and desktop
- Must maintain accessibility standards (WCAG AA)
- Should use Tailwind CSS v4 configuration for tokens
- Should minimize custom CSS in favor of utility classes
- **Must use CSS custom properties for all theme-dependent colors**
- **Must never hardcode theme-specific color values in components**

## Out of Scope

- Backend changes or API modifications
- New features or functionality beyond theme toggle
- Changes to data models or business logic
- Performance optimizations unrelated to styling
- Browser compatibility beyond current support

## Success Metrics

- All pages and components use the new theme consistently
- No visual regressions or broken layouts
- Accessibility scores remain at or above current levels
- User feedback indicates improved visual clarity and reduced eye strain
- Development team can easily maintain and extend the theme
- **All color references use CSS variables (0 hardcoded theme colors in components)**
- **Theme can be toggled by changing data-theme attribute (verified manually)**

## Dependencies

- Tailwind CSS v4 configuration with CSS variable support
- Inter font family (Google Fonts or self-hosted)
- Optional: Source Serif 4 or Fraunces for editorial accents
- Existing React component structure
- Current routing and state management
- CSS custom properties browser support (all modern browsers)
- React Context API for theme state management
- localStorage for theme persistence
