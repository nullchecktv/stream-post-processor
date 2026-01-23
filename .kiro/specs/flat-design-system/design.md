# Design Document: Flat 2.0 Design System

## Overview

This design document outlines the implementation of a cohesive flat 2.0 design system for the livestream post-production application. The design system refines the existing visual language using minimal shadows, vibrant colors, clean lines, and social media-inspired aspect ratios. The system will be implemented by extending the current Tailwind CSS configuration and refining existing React components.

The flat 2.0 aesthetic balances the simplicity of flat design with subtle depth cues, creating an interface that feels modern and approachable while maintaining clear visual hierarchy. Social media aspect ratios (16:9, 1:1, 9:16, 4:5) are integrated into content cards to help creators visualize how their content will appear when shared across platforms.

## Architecture

### Design Token System

The design system builds upon the existing design tokens already defined in `frontend/tailwind.config.js`. The current configuration includes:

**Existing Token Categories:**
- **Colors**: Primary (green-based #5B8C5A), accent (#E6F3D4), gray scale, semantic colors (success, warning, error, info)
- **Spacing**: Standard Tailwind spacing scale (4px base unit: 1, 2, 3, 4, 6, 8, 12, 16)
- **Typography**: Inter font family, comprehensive font size scale with line heights, font weights (normal, medium, semibold, bold)
- **Shadows**: 5-level shadow scale (sm, DEFAULT, md, lg, xl)
- **Borders**: Border radius scale (sm through 2xl, plus full)
- **Transitions**: Duration (DEFAULT 200ms, fast 150ms, slow 300ms) and timing functions

**Refinements Needed:**
- Create named shadow aliases for flat design aesthetic (flat-sm, flat, flat-md, flat-lg)
- Add named border radius aliases for consistency (flat, flat-lg, flat-xl)
- Ensure all existing color combinations meet WCAG AA contrast requirements
- Keep existing color scheme (primary green #5B8C5A, accent #E6F3D4)

**Implementation Location:**
- `frontend/tailwind.config.js` - Extend existing configuration with flat design aliases

### Component Architecture

The design system refines the existing component architecture in `frontend/src/components/`:

**Existing Components to Refine:**
- **Common components**: Button, StatusIndicator, Modal, Input, EmptyState
- **Episode components**: EpisodeCard, ClipCard, QuoteCard, BlogPostCard, TrackCard
- **Dashboard components**: DashboardLayout, PreviousEpisodes, UpcomingEpisodes
- **Layout components**: Sidebar, PageLayout, TopHeader

**New Components to Create:**
- **Card** (base component): Reusable card container with aspect ratio support
- **ContentGrid**: Responsive grid layout for content cards

**Component Refinement Strategy:**
1. Create base Card component with aspect ratio support
2. Update existing card components to use base Card and apply aspect ratios
3. Apply flat 2.0 styling (minimal shadows, clean borders, vibrant colors)
4. Ensure consistent spacing, typography, and interactive states
5. Refine Button component for flat 2.0 aesthetic
6. Update StatusIndicator to use consistent badge styling

### Aspect Ratio System

Content cards implement aspect
```javascript
// frontend/tailwind.config.js - Add to existing extend section
export default {
  theme: {
    extend: {
      colors: {
        // Existing primary, accent, gray, success, warning, error, info
        // Add secondary palette for variety
        secondary: {
          DEFAULT: '#8B7BA8',
          light: '#A89BC4',
          dark: '#6F5F8A',
        },
      },
      boxShadow: {
        // Token Configuration

**Tailwind Config Extensions:**

```javascript
// frontend/tailwind.config.js - Add to existing extend section
export default {
  theme: {
    extend: {
      // Keep existing colors unchanged
      boxShadow: {
        // Existing: sm, DEFAULT, md, lg, xl
        // Add flat design aliases (map to existing values)
        'flat-sm': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'flat': '0 1px 3px 0 rgb(0 0 0 / 0.1)',
        'flat-md': '0 4px 6px -1px rgb(0 0 0 / 0.1)',
        'flat-lg': '0 10px 15px -3px rgb(0 0 0 / 0.1)',
      },
      borderRadius: {
        // Existing: sm, DEFAULT, md, lg, xl, 2xl, full
        // Add flat design aliases
        'flat': '0.5rem',      // 8px
        'flat-lg': '0.75rem',  // 12px
        'flat-xl': '1rem',     // 16px
      },
    },
  },
};
```

### Base Card Component

**New Component: `frontend/src/components/common/Card.tsx`**

```typescript
interface CardProps {
  aspectRatio?: 'landscape' | 'square' | 'portrait' | 'instagram' | 'none';
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}

const Card: React.FC<CardProps> = ({
  aspectRatio = 'none',
  children,
  className = '',
  onClick,
  hoverable = false,
}) => {
  const aspectRatioClass = {
    landscape: 'aspect-[16/9]',
    square: 'aspect-square',
    portrait: 'aspect-[9/16]',
    instagram: 'aspect-[4/5]',
    none: '',
  }[aspectRatio];

  const hoverClass = hoverable
    ? 'transition-shadow duration-200 hover:shadow-flat-md cursor-pointer'
    : '';

  return (
    <div
      className={`
        bg-white rounded-flat border border-gray-200
        shadow-flat overflow-hidden
        ${aspectRatioClass}
        ${hoverClass}
        ${className}
      `}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
```

### Refined Episode Card Component

**Update: `frontend/src/components/episodes/EpisodeCard.tsx`**

Apply aspect ratio and flat 2.0 styling to existing EpisodeCard:

```typescript
// Key changes:
// 1. Wrap in Card component with landscape aspect ratio
// 2. Use flat design shadows and borders
// 3. Ensure consistent spacing (p-4, space-y-2)
// 4. Use vibrant gradient backgrounds
// 5. Apply hover states

<Card aspectRatio="landscape" hoverable onClick={() => navigate(`/episodes/${episode.id}`)}>
  <div className="h-full flex flex-col">
    {/* Thumbnail area - maintains 16:9 aspect ratio */}
    <div className="flex-1 bg-gradient-to-br from-primary-light to-primary flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl font-bold text-white">
          #{episode.episodeNumber}
        </div>
      </div>
    </div>

    {/* Content area */}
    <div className="p-4 space-y-2">
      <h3 className="font-semibold text-lg text-gray-900 line-clamp-2">
        {episode.title}
      </h3>

      <div className="flex items-center justify-between">
        <StatusIndicator status={episode.status} />
        {episode.airDate && (
          <span className="text-sm text-gray-500">
            {formatDate(episode.airDate)}
          </span>
        )}
      </div>
    </div>
  </div>
</Card>
```

### Refined Clip Card Component

**Update: `frontend/src/components/episodes/ClipCard.tsx`**

Apply aspect ratio based on clip orientation:

```typescript
// Key changes:
// 1. Support landscape (16:9) and portrait (9:16) aspect ratios
// 2. Use Card component with appropriate aspect ratio
// 3. Maintain video thumbnail area
// 4. Add duration badge overlay
// 5. Consistent spacing and typography

interface ClipCardProps {
  clip: Clip;
  orientation?: 'landscape' | 'portrait';
  onClick?: () => void;
}

const ClipCard: React.FC<ClipCardProps> = ({
  clip,
  orientation = 'landscape',
  onClick,
}) => {
  const aspectRatio = orientation === 'landscape' ? 'landscape' : 'portrait';

  return (
    <Card aspectRatio={aspectRatio} hoverable onClick={onClick}>
      <div className="h-full flex flex-col">
        {/* Video thumbnail area */}
        <div className="flex-1 bg-gray-900 flex items-center justify-center relative">
          {clip.s3Key ? (
            <img
              src={getThumbnailUrl(clip.s3Key)}
              alt={clip.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-white text-4xl">
              <PlayIcon />
            </div>
          )}

          {/* Duration badge */}
          <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-2 py-1 rounded">
            {formatDuration(clip.duration)}
          </div>
        </div>

        {/* Content area */}
        <div className="p-3 space-y-1">
          <p className="text-sm font-medium text-gray-900 line-clamp-2">
            {clip.hook}
          </p>
          <StatusIndicator status={clip.status} size="sm" />
        </div>
      </div>
    </Card>
  );
};
```

### Refined Quote Card Component

**Update: `frontend/src/components/episodes/QuoteCard.tsx`**

Apply square (1:1) aspect ratio for Instagram-style presentation:

```typescript
// Key changes:
// 1. Use square aspect ratio (1:1)
// 2. Vibrant gradient background
// 3. Center quote text with proper line clamping
// 4. Attribution and status at bottom
// 5. Consistent padding and spacing

const QuoteCard: React.FC<QuoteCardProps> = ({ quote, onClick }) => {
  return (
    <Card aspectRatio="square" hoverable onClick={onClick}>
      <div className="h-full flex flex-col justify-between p-6 bg-gradient-to-br from-accent to-primary-light">
        {/* Quote text */}
        <div className="flex-1 flex items-center">
          <blockquote className="text-lg font-medium text-gray-900 line-clamp-4">
            "{quote.text}"
          </blockquote>
        </div>

        {/* Attribution and status */}
        <div className="flex items-center justify-between mt-4">
          {quote.speaker && (
            <span className="text-sm font-medium text-gray-700">
              — {quote.speaker}
            </span>
          )}
          <StatusIndicator status={quote.status} size="sm" />
        </div>
      </div>
    </Card>
  );
};
```

### Refined Blog Post Card Component

**Update: `frontend/src/components/episodes/BlogPostCard.tsx`**

Apply Instagram portrait (4:5) aspect ratio:

```typescript
// Key changes:
// 1. Use instagram aspect ratio (4:5)
// 2. Header area with gradient background
// 3. Content area with excerpt
// 4. Status and date at bottom
// 5. Consistent spacing

const BlogPostCard: React.FC<BlogPostCardProps> = ({ blog, onClick }) => {
  return (
    <Card aspectRatio="instagram" hoverable onClick={onClick}>
      <div className="h-full flex flex-col">
        {/* Header area */}
        <div className="flex-1 bg-gradient-to-br from-accent to-primary-light p-6 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-gray-900 line-clamp-3">
            {blog.title}
          </h3>
        </div>

        {/* Content area */}
        <div className="p-4 space-y-2">
          <p className="text-sm text-gray-600 line-clamp-3">
            {blog.excerpt || 'No excerpt available'}
          </p>

          <div className="flex items-center justify-between">
            <StatusIndicator status={blog.status} size="sm" />
            <span className="text-xs text-gray-500">
              {formatDate(blog.createdAt)}
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
};
```

### Refined Button Component

**Update: `frontend/src/components/common/Button.tsx`**

Apply flat 2.0 styling to existing Button component:

```typescript
// Key changes:
// 1. Use flat border radius (rounded-flat)
// 2. Minimal shadows (shadow-flat, shadow-flat-md on hover)
// 3. Smooth transitions
// 4. Clear focus states
// 5. Consistent sizing

const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  onClick,
  disabled = false,
  className = '',
}) => {
  const baseClasses = 'font-medium rounded-flat transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantClasses = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-flat hover:shadow-flat-md',
    secondary: 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50 focus:ring-primary shadow-flat-sm hover:shadow-flat',
    tertiary: 'bg-transparent text-primary hover:bg-primary-light/20 focus:ring-primary',
  }[variant];

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  }[size];

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  return (
    <button
      className={`${baseClasses} ${variantClasses} ${sizeClasses} ${disabledClasses} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};
```

### Content Grid Component

**New Component: `frontend/src/components/common/ContentGrid.tsx`**

```typescript
interface ContentGridProps {
  children: React.ReactNode;
  columns?: {
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
}

const ContentGrid: React.FC<ContentGridProps> = ({
  children,
  columns = { sm: 1, md: 2, lg: 3, xl: 4 },
  gap = 6,
  className = '',
}) => {
  return (
    <div
      className={`
        grid
        grid-cols-${columns.sm || 1}
        md:grid-cols-${columns.md || 2}
        lg:grid-cols-${columns.lg || 3}
        xl:grid-cols-${columns.xl || 4}
        gap-${gap}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default ContentGrid;
```

## Data Models

### Design Token Types

```typescript
// frontend/src/types/design-tokens.ts

export interface ColorPalette {
  DEFAULT: string;
  light?: string;
  dark?: string;
}

export type AspectRatio = 'landscape' | 'square' | 'portrait' | 'instagram' | 'none';

export type ButtonVariant = 'primary' | 'secondary' | 'tertiary';

export type ButtonSize = 'sm' | 'md' | 'lg';

export type StatusBadgeSize = 'sm' | 'md';

export interface BaseCardProps {
  aspectRatio?: AspectRatio;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Aspect Ratio Preservation

*For any* content card component (Episode, Clip, Quote, Blog), when rendered at any viewport width, the aspect ratio SHALL be maintained according to its specified ratio (16:9, 1:1, 9:16, or 4:5).

**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 2: Color Contrast Compliance

*For any* color combination used in the design system (text on background, button states, status badges), the contrast ratio SHALL meet or exceed WCAG AA requirements (4.5:1 for normal text, 3:1 for large text).

**Validates: Requirements 4.4, 12.1**

### Property 3: Spacing Consistency

*For any* component using spacing utilities, the spacing values SHALL be multiples of the 4px base unit from the defined spacing scale.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

### Property 4: Shadow Elevation Hierarchy

*For any* two components with different elevation levels, the component with higher elevation SHALL have a larger shadow value from the defined shadow scale.

**Validates: Requirements 8.1, 8.2, 8.3**

### Property 5: Interactive State Feedback

*For any* interactive element (button, card, link), when the element transitions between states (default, hover, active, focus), there SHALL be a visible change in appearance using color, shadow, or border modifications.

**Validates: Requirements 1.3, 7.2, 12.2**

### Property 6: Responsive Grid Adaptation

*For any* content grid layout, when the viewport width changes across breakpoints (sm, md, lg, xl), the number of columns SHALL adjust according to the defined responsive configuration while maintaining card aspect ratios.

**Validates: Requirements 9.3, 11.1, 11.2, 11.3**

### Property 7: Typography Hierarchy Consistency

*For any* page or component, heading elements (h1-h6) SHALL use font sizes and weights that create a clear visual hierarchy where h1 > h2 > h3 > h4 > h5 > h6 in visual prominence.

**Validates: Requirements 5.1, 5.2, 5.3**

### Property 8: Component Visual Consistency

*For any* two instances of the same card type (e.g., two EpisodeCards), they SHALL use identical border radius, padding, shadow, and hover state styling regardless of their content or location.

**Validates: Requirements 6.1, 6.2, 6.3, 6.4**

### Property 9: Status Badge Color Mapping

*For any* status value, the status badge SHALL consistently use the same color scheme across all components and pages where that status appears.

**Validates: Requirements 4.2, 12.3**

### Property 10: Focus Indicator Visibility

*For any* interactive element, when it receives keyboard focus, there SHALL be a visible focus indicator with sufficient contrast against the background.

**Validates: Requirements 12.2, 12.4**

## Error Handling

### Component Error Boundaries

All card components and layout components are wrapped in error boundaries to prevent rendering failures from breaking the entire page.

**Error Boundary Strategy:**
- Catch rendering errors in card components
- Display fallback UI with error message
- Log errors to console for debugging
- Provide retry mechanism where appropriate

### Missing Data Handling

Components gracefully handle missing or incomplete data:

**Episode Cards:**
- Missing thumbnail: Show placeholder with episode number
- Missing platforms: Hide platform icons section
- Missing air date: Hide date display

**Clip Cards:**
- Missing thumbnail: Show play icon placeholder
- Missing duration: Hide duration badge
- Missing title: Show hook text only

**Quote Cards:**
- Missing speaker: Hide attribution line
- Missing text: Show error state

**Blog Cards:**
- Missing excerpt: Show title only
- Missing date: Hide date display

### Aspect Ratio Fallbacks

If aspect ratio cannot be maintained due to browser limitations:
- Fall back to min-height constraints
- Maintain responsive behavior
- Log warning for debugging

### Color Contrast Failures

If a color combination fails contrast requirements:
- Use fallback color from palette
- Log warning with specific color values
- Provide alternative color suggestion

## Testing Strategy

### Unit Testing

**Component Testing:**
- Test each card component renders correctly with valid props
- Test aspect ratio classes are applied correctly
- Test hover states trigger appropriate class changes
- Test click handlers are called when interactive
- Test missing data scenarios render fallback UI

**Button Testing:**
- Test all button variants render with correct styles
- Test all button sizes apply correct classes
- Test disabled state prevents clicks
- Test focus states are visible

**Status Badge Testing:**
- Test all status values map to correct colors
- Test size variants apply correct classes
- Test unknown status values use fallback color

### Property-Based Testing

**Property Tests:**
- Generate random viewport widths and verify aspect ratios are maintained
- Generate random color combinations and verify contrast ratios
- Generate random spacing values and verify they are multiples of 4px
- Generate random component hierarchies and verify shadow ordering
- Generate random content lengths and verify truncation works correctly

**Test Configuration:**
- Minimum 100 iterations per property test
- Use fast-check or similar library for property generation
- Tag tests with feature name and property number

### Integration Testing

**Page Layout Testing:**
- Test dashboard renders grid of cards correctly
- Test episode detail page shows all content sections
- Test responsive breakpoints adjust layouts correctly
- Test navigation between pages maintains design consistency

### Visual Regression Testing

**Snapshot Testing:**
- Capture screenshots of all card components
- Capture screenshots of key pages (dashboard, episode detail)
- Compare against baseline images
- Flag visual changes for review

### Accessibility Testing

**Automated Testing:**
- Run axe-core or similar tool on all pages
- Verify color contrast ratios programmatically
- Check for missing ARIA labels
- Verify keyboard navigation works

**Manual Testing:**
- Test with screen reader (NVDA, JAWS, VoiceOver)
- Test keyboard-only navigation
- Test with high contrast mode
- Test with zoom levels up to 200%

### Browser Compatibility Testing

**Target Browsers:**
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

**Mobile Testing:**
- iOS Safari (latest 2 versions)
- Chrome Android (latest version)

### Performance Testing

**Metrics to Monitor:**
- First Contentful Paint (FCP)
- Largest Contentful Paint (LCP)
- Cumulative Layout Shift (CLS)
- Time to Interactive (TTI)

**Performance Targets:**
- FCP < 1.8s
- LCP < 2.5s
- CLS < 0.1
- TTI < 3.8s
