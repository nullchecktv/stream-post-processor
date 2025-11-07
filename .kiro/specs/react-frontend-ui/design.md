# Design Document

## Overview

This design outlines a modern React-based web application for the livestream post-production platform. The application provides an intuitive interface for content creators to manage their profiles, teams, and episodes. Built with Vite for optimal performance and Tailwind CSS for beautiful, responsive styling, the application emphasizes simplicity, speed, and user delight.

### Key Design Principles

- **Simplicity First**: No over-abstraction of components; each component serves a clear purpose
- **Visual Excellence**: Stunning modern design with primary color #5B8C5A and accent #E6F3D4
- **Performance**: Fast loading, optimistic updates, and smooth transitions
- **User Guidance**: Contextual help tips that can be dismissed and remembered
- **Security**: All routes protected with Cognito authentication

## Architecture

### Technology Stack

- **Build Tool**: Vite 5.x for fast development and optimized production builds
- **Framework**: React 18.x with functional components and hooks
- **Routing**: React Router v6 for client-side navigation
- **Authentication**: AWS Amplify for Cognito integration
- **Styling**: Tailwind CSS 3.x for utility-first styling
- **Icons**: lucide-react for modern, consistent icons
- **HTTP Client**: Native fetch API (no external library needed)
- **State Management**: React Context API for global state (auth, user profile, sidebar)
- **Form Handling**: React Hook Form for performant form management
- **Validation**: Zod for schema validation

### Project Structure

```
frontend/
├── public/
│   └── index.html
├── src/
│   ├── api/
│   │   ├── client.js          # Axios instance with auth interceptor
│   │   ├── episodes.js        # Episode API calls
│   │   ├── teams.js           # Team API calls
│   │   └── users.js           # User profile API calls
│   ├── components/
│   │   ├── auth/
│   │   │   └── AuthGuard.jsx  # Route protection component
│   │   ├── common/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── LoadingSpinner.jsx
│   │   │   └── HelpTip.jsx    # Dismissable help tip component
│   │   ├── dashboard/
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── UpcomingEpisodes.jsx
│   │   │   ├── PreviousEpisodes.jsx
│   │   │   └── CreateEpisodeModal.jsx
│   │   ├── episodes/
│   │   │   ├── EpisodeDetail.jsx
│   │   │   ├── EpisodeForm.jsx
│   │   │   └── EpisodeCard.jsx
│   │   ├── onboarding/
│   │   │   ├── OnboardingWizard.jsx
│   │   │   ├── ProfileStep.jsx
│   │   │   └── TeamStep.jsx
│   │   └── layout/
│   │       ├── Sidebar.jsx
│   │       ├── SidebarItem.jsx
│   │       └── PageLayout.jsx
│   ├── contexts/
│   │   ├── AuthContext.jsx    # Authentication state
│   │   ├── UserContext.jsx    # User profile state
│   │   └── SidebarContext.jsx # Sidebar collapsed state
│   ├── hooks/
│   │   ├── useAuth.js         # Authentication hook
│   │   ├── useUser.js         # User profile hook
│   │   ├── useSidebar.js      # Sidebar state hook
│   │   ├── useHelpTips.js     # Help tips management
│   │   └── useApi.js          # API call wrapper with loading states
│   ├── pages/
│   │   ├── Dashboard.jsx
│   │   ├── EpisodeDetailPage.jsx
│   │   ├── OnboardingPage.jsx
│   │   └── NotFoundPage.jsx
│   ├── utils/
│   │   ├── auth.js            # Auth helper functions
│   │   ├── date.js            # Date formatting utilities
│   │   └── validation.js      # Validation schemas
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── .env.example
├── .env.local
├── index.html
├── package.json
├── tailwind.config.js
├── vite.config.js
└── README.md
```

## Components and Interfaces

### Authentication Layer

#### AuthGuard Component
Protects routes by checking authentication status and redirecting to Cognito login if needed.

```jsx
// Wraps protected routes
<AuthGuard>
  <Dashboard />
</AuthGuard>
```

**Responsibilities:**
- Check if user is authenticated via Amplify
- Redirect to Cognito hosted UI if not authenticated
- Handle token refresh automatically
- Show loading state during auth check

#### AuthContext
Provides authentication state throughout the application.

**State:**
- `isAuthenticated`: boolean
- `user`: Cognito user object
- `loading`: boolean
- `signOut`: function

### User Profile Management

#### UserContext
Manages user profile data and active team context.

**State:**
- `profile`: UserProfile object from API
- `loading`: boolean
- `error`: string | null
- `refreshProfile`: function
- `updateProfile`: function

**Profile Object Structure:**
```typescript
{
  email: string
  name: string
  activeTeamId: string | null
  preferences: {
    timezone?: string
    notifications?: boolean
  }
  teams: TeamMembership[]
  ownedTeams: TeamMembership[]
  memberTeams: TeamMembership[]
  createdAt: string
  updatedAt: string
}
```

#### SidebarContext
Manages sidebar collapsed state and persistence.

**State:**
- `isCollapsed`: boolean
- `toggleSidebar`: function
- `collapseSidebar`: function
- `expandSidebar`: function

**Persistence:**
- Reads initial state from localStorage on mount
- Saves state to localStorage on every change
- Key: `sidebarCollapsed`

### Onboarding Flow

#### OnboardingWizard Component
Multi-step wizard for first-time users.

**Steps:**
1. Profile Setup (required)
2. Team Creation (optional)

**Features:**
- Progress indicator showing current step
- Back/Next navigation
- Skip option for team creation
- Form validation with inline errors
- Smooth transitions between steps

#### ProfileStep Component
Collects basic user information.

**Fields:**
- Name (required)
- Timezone (optional, with autocomplete)
- Notification preferences (optional, checkbox)

**Validation:**
- Name: 1-100 characters
- Timezone: Valid timezone string

#### TeamStep Component
Optional team creation during onboarding.

**Fields:**
- Team name (required if creating)
- Description (optional)
- Default platforms (optional, multi-select)

**Actions:**
- Create Team button
- Skip button (prominent)

### Dashboard

#### DashboardLayout Component
Main dashboard container with left sidebar navigation and content areas.

**Layout:**
- Left sidebar navigation (fixed position)
- Main content area (with left margin for sidebar):
  - Upcoming Episodes (prominent, larger cards)
  - Previous Episodes (subtle, smaller cards)
- Floating "Create Episode" button (bottom-right of content area)

#### UpcomingEpisodes Component
Displays episodes with future air dates or no air date.

**Features:**
- Grid layout (responsive: 1 col mobile, 2 cols tablet, 3 cols desktop)
- Episode cards with:
  - Title
  - Episode number
  - Air date (if set)
  - Status badge
  - Platform icons
- Empty state with helpful message and create button
- Loading skeleton during fetch

#### PreviousEpisodes Component
Displays past episodes in a more compact format.

**Features:**
- List layout with smaller cards
- Collapsible section (starts collapsed)
- Shows last 10 episodes by default
- "Load More" button for pagination
- Subtle styling to de-emphasize

#### CreateEpisodeModal Component
Modal dialog for quick episode creation.

**Fields:**
- Title (required)
- Episode Number (required, integer)
- Air Date (optional, date-time picker)
- Series Name (optional)

**Behavior:**
- Opens from dashboard button or keyboard shortcut (Ctrl/Cmd + N)
- Validates on submit
- Shows loading state during creation
- On success: closes modal and navigates to episode detail page
- On error: shows error message inline

### Episode Management

#### EpisodeDetailPage Component
Full-page view for editing episode details.

**Sections:**
- Header with title and status
- Metadata form (editable)
- Track management section
- Transcript upload section
- Clips section (future)

**Features:**
- Auto-save indicator
- Unsaved changes warning
- Breadcrumb navigation
- Action buttons (Save, Delete, etc.)

#### EpisodeForm Component
Reusable form for episode metadata.

**Fields:**
- Title
- Episode Number
- Description (textarea)
- Air Date (date-time picker)
- Platforms (multi-select checkboxes)
- Themes (tag input)
- Series Name

**Validation:**
- Title: 1-200 characters
- Episode Number: positive integer
- Description: max 1000 characters
- Air Date: ISO 8601 format
- Platforms: enum values
- Series Name: max 100 characters

### Common Components

#### Button Component
Reusable button with variants.

**Variants:**
- primary: #5B8C5A background
- secondary: #E6F3D4 background with dark text
- danger: red for destructive actions
- ghost: transparent with border

**Sizes:**
- sm, md, lg

**States:**
- loading (shows spinner)
- disabled

#### Modal Component
Reusable modal dialog.

**Features:**
- Backdrop with click-to-close
- ESC key to close
- Focus trap
- Smooth fade-in animation
- Responsive sizing

#### HelpTip Component
Contextual help tooltip that can be dismissed.

**Props:**
- `id`: unique identifier for persistence
- `content`: help text or JSX
- `position`: top, bottom, left, right

**Behavior:**
- Shows on first visit
- Dismissable with X button
- Stores dismissal in localStorage
- Can be reset via settings

#### LoadingSpinner Component
Loading indicator with brand colors.

**Variants:**
- inline: small spinner for buttons
- page: full-page overlay
- section: centered in container

### Navigation

#### Sidebar Component
Modern left sidebar navigation that extends the full height of the page.

**Layout:**
- Fixed position on left side
- Full viewport height
- Width: 240px (expanded), 64px (collapsed)
- Z-index above content but below modals
- Background: White with subtle shadow
- Border-right: 1px solid gray-200

**Structure (top to bottom):**
1. **Header Section** (80px height)
   - Logo/brand (full logo when expanded, icon when collapsed)
   - Collapse toggle button (chevron icon)

2. **Navigation Section** (flex-grow)
   - Navigation items list
   - Each item: icon + label (label hidden when collapsed)
   - Active item: accent background (#E6F3D4) with primary text color (#5B8C5A)
   - Hover: light gray background

3. **User Section** (bottom, 80px height)
   - User avatar (32px circle)
   - User name and email (when expanded)
   - Active team badge (when expanded)
   - Dropdown menu trigger
   - Menu options: Switch Team, Settings, Sign Out

**Navigation Items:**
- Dashboard (Home icon from lucide-react)
- Episodes (Video icon)
- Teams (Users icon)
- Settings (Settings icon)

**Collapsed State:**
- Width: 64px
- Show icons only (24px size, centered)
- Hide all text labels
- Show tooltips on hover (positioned to the right)
- Collapse toggle shows expand chevron

**Expanded State:**
- Width: 240px
- Show icons (20px size) + labels
- Full user information visible
- Collapse toggle shows collapse chevron

**Mobile Behavior (< 768px):**
- Default: collapsed (off-screen)
- Toggle button in top-left of page
- Opens as overlay with backdrop
- Expanded state: 280px width
- Backdrop click closes sidebar
- Smooth slide-in/out animation

**State Management:**
```javascript
// Stored in localStorage
{
  "sidebarCollapsed": boolean
}
```

**Animation:**
- Width transition: 200ms ease-in-out
- Label fade: 150ms ease-in-out
- Tooltip delay: 500ms

#### SidebarItem Component
Individual navigation item within the sidebar.

**Props:**
- `to`: Route path
- `icon`: Icon component
- `label`: Text label
- `isCollapsed`: Boolean from parent

**States:**
- Default: Gray text, transparent background
- Hover: Gray-100 background
- Active: Accent background (#E6F3D4), primary text (#5B8C5A), left border (3px primary)

**Layout:**
- Height: 48px
- Padding: 12px 16px (expanded), 12px (collapsed, centered)
- Icon size: 20px (expanded), 24px (collapsed)
- Gap between icon and label: 12px
- Border-radius: 8px (with 4px margin from edges)

**Tooltip (when collapsed):**
- Position: right of item
- Offset: 8px
- Background: Gray-900
- Text: White
- Padding: 6px 12px
- Border-radius: 6px
- Arrow pointing left

## Data Models

### Episode
```typescript
interface Episode {
  id: string
  title: string
  status: string
  episodeNumber: number
  description?: string
  airDate?: string
  platforms?: Platform[]
  themes?: string[]
  seriesName?: string
  createdAt: string
  updatedAt: string
}

type Platform = "linkedin live" | "X" | "twitch" | "youtube"
```

### Team
```typescript
interface Team {
  id: string
  name: string
  description?: string
  ownerId: string
  status: "active" | "archived"
  settings?: {
    defaultPlatforms?: Platform[]
    timezone?: string
  }
  createdAt: string
  updatedAt: string
}
```

### UserProfile
```typescript
interface UserProfile {
  email: string
  name: string
  activeTeamId: string | null
  preferences?: {
    timezone?: string
    notifications?: boolean
  }
  teams: TeamMembership[]
  ownedTeams: TeamMembership[]
  memberTeams: TeamMembership[]
  createdAt: string
  updatedAt: string
}

interface TeamMembership {
  teamId: string
  name: string
  description?: string
  role: "owner" | "administrator" | "member"
  status: "active" | "pending"
  joinedAt: string
  teamStatus: string
}
```

## API Integration

### API Client Configuration

Using native fetch API with a simple wrapper for authentication and error handling:

```javascript
// src/api/client.js
import { Auth } from 'aws-amplify'

const API_BASE_URL = import.meta.env.VITE_API_URL

async function getAuthToken() {
  const session = await Auth.currentSession()
  return session.getIdToken().getJwtToken()
}

export async function apiRequest(endpoint, options = {}) {
  const token = await getAuthToken()

  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (response.status === 401) {
    await Auth.signOut()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw {
      status: response.status,
      message: error.message || 'Request failed',
      error: error.error
    }
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}
```

### API Service Modules

#### Episodes API
```javascript
// src/api/episodes.js
import { apiRequest } from './client'

export const episodesApi = {
  list: (params) => {
    const query = new URLSearchParams(params).toString()
    return apiRequest(`/episodes${query ? `?${query}` : ''}`)
  },
  get: (id) => apiRequest(`/episodes/${id}`),
  create: (data) => apiRequest('/episodes', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiRequest(`/episodes/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiRequest(`/episodes/${id}`, {
    method: 'DELETE'
  })
}
```

#### Users API
```javascript
// src/api/users.js
import { apiRequest } from './client'

export const usersApi = {
  getProfile: () => apiRequest('/me'),
  updateProfile: (data) => apiRequest('/me', {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  setActiveTeam: (teamId) => apiRequest('/me/teams', {
    method: 'POST',
    body: JSON.stringify({ teamId })
  })
}
```

#### Teams API
```javascript
// src/api/teams.js
import { apiRequest } from './client'

export const teamsApi = {
  list: () => apiRequest('/teams'),
  get: (id) => apiRequest(`/teams/${id}`),
  create: (data) => apiRequest('/teams', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  update: (id, data) => apiRequest(`/teams/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  delete: (id) => apiRequest(`/teams/${id}`, {
    method: 'DELETE'
  })
}
```

#### PageLayout Component
Wrapper component that provides consistent layout with sidebar.

**Structure:**
```jsx
<div className="flex h-screen">
  <Sidebar />
  <main className={`flex-1 overflow-auto transition-all ${
    isCollapsed ? 'ml-16' : 'ml-60'
  }`}>
    {children}
  </main>
</div>
```

**Features:**
- Adjusts main content margin based on sidebar state
- Handles overflow for scrollable content
- Smooth transition when sidebar collapses/expands
- Full viewport height

## Routing Structure

```javascript
// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import PageLayout from './components/layout/PageLayout'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<LoginRedirect />} />

        {/* Protected routes with sidebar */}
        <Route element={<AuthGuard />}>
          <Route element={<PageLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          {/* Onboarding without sidebar */}
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
```

### Route Guards

**OnboardingCheck**: Redirects to onboarding if profile doesn't exist
```javascript
// In Dashboard component
useEffect(() => {
  const checkProfile = async () => {
    try {
      await usersApi.getProfile()
    } catch (error) {
      if (error.response?.status === 404) {
        navigate('/onboarding')
      }
    }
  }
  checkProfile()
}, [])
```

## Design System

### Color Palette

**Primary Colors:**
- Primary: `#5B8C5A` (sage green)
- Primary Light: `#7BA879`
- Primary Dark: `#4A7349`
- Accent: `#E6F3D4` (light sage)

**Neutral Colors:**
- Gray 50: `#F9FAFB`
- Gray 100: `#F3F4F6`
- Gray 200: `#E5E7EB`
- Gray 300: `#D1D5DB`
- Gray 400: `#9CA3AF`
- Gray 500: `#6B7280`
- Gray 600: `#4B5563`
- Gray 700: `#374151`
- Gray 800: `#1F2937`
- Gray 900: `#111827`

**Semantic Colors:**
- Success: `#10B981`
- Warning: `#F59E0B`
- Error: `#EF4444`
- Info: `#3B82F6`

### Typography

**Font Family:**
- Sans: `Inter, system-ui, -apple-system, sans-serif`
- Mono: `'Fira Code', monospace`

**Font Sizes:**
- xs: 0.75rem (12px)
- sm: 0.875rem (14px)
- base: 1rem (16px)
- lg: 1.125rem (18px)
- xl: 1.25rem (20px)
- 2xl: 1.5rem (24px)
- 3xl: 1.875rem (30px)
- 4xl: 2.25rem (36px)

**Font Weights:**
- normal: 400
- medium: 500
- semibold: 600
- bold: 700

### Spacing

Using Tailwind's default spacing scale (4px base unit):
- 1: 0.25rem (4px)
- 2: 0.5rem (8px)
- 3: 0.75rem (12px)
- 4: 1rem (16px)
- 6: 1.5rem (24px)
- 8: 2rem (32px)
- 12: 3rem (48px)
- 16: 4rem (64px)

### Shadows

- sm: `0 1px 2px 0 rgb(0 0 0 / 0.05)`
- DEFAULT: `0 1px 3px 0 rgb(0 0 0 / 0.1)`
- md: `0 4px 6px -1px rgb(0 0 0 / 0.1)`
- lg: `0 10px 15px -3px rgb(0 0 0 / 0.1)`
- xl: `0 20px 25px -5px rgb(0 0 0 / 0.1)`

### Border Radius

- sm: 0.125rem (2px)
- DEFAULT: 0.25rem (4px)
- md: 0.375rem (6px)
- lg: 0.5rem (8px)
- xl: 0.75rem (12px)
- 2xl: 1rem (16px)
- full: 9999px

## Error Handling

### Error Boundary
Global error boundary to catch React errors.

**Features:**
- Fallback UI with error message
- "Report Issue" button
- "Reload Page" button
- Logs error to console (and monitoring service in production)

### API Error Handling

**Error Types:**
- 400 Bad Request: Show validation errors inline
- 401 Unauthorized: Redirect to login
- 403 Forbidden: Show permission denied message
- 404 Not Found: Show resource not found message
- 409 Conflict: Show conflict message (e.g., duplicate team name)
- 500 Internal Server Error: Show generic error with retry option

**Error Display:**
- Toast notifications for transient errors
- Inline errors for form validation
- Modal dialogs for critical errors
- Retry buttons where appropriate

## Testing Strategy

### Unit Tests
- Component rendering tests
- Hook behavior tests
- Utility function tests
- API service tests (mocked)

**Tools:**
- Vitest for test runner
- React Testing Library for component tests
- MSW (Mock Service Worker) for API mocking

### Integration Tests
- User flow tests (onboarding, episode creation)
- Authentication flow tests
- Form submission tests

### E2E Tests (Future)
- Playwright for end-to-end testing
- Critical user journeys
- Cross-browser testing

## Performance Optimization

### Code Splitting
- Route-based code splitting with React.lazy
- Component-level splitting for heavy components
- Vendor chunk separation

### Caching Strategy
- React Query for API response caching
- Cache invalidation on mutations
- Optimistic updates for better UX

### Bundle Optimization
- Tree shaking enabled
- Minification in production
- Gzip compression
- Asset optimization (images, fonts)

### Loading States
- Skeleton screens for content loading
- Progressive loading for lists
- Lazy loading for images
- Suspense boundaries for code splitting

## Accessibility

### WCAG 2.1 AA Compliance
- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Color contrast ratios meet standards

### Screen Reader Support
- Descriptive alt text for images
- ARIA live regions for dynamic content
- Proper heading hierarchy
- Form labels and error announcements

### Keyboard Navigation
- Tab order follows visual flow
- Skip links for main content
- Keyboard shortcuts documented
- Focus indicators visible

## Security Considerations

### Authentication
- Cognito hosted UI for login
- JWT tokens stored securely
- Automatic token refresh
- Secure logout with token invalidation

### Data Protection
- HTTPS only
- No sensitive data in localStorage
- XSS protection via React's built-in escaping
- CSRF protection via SameSite cookies

### Input Validation
- Client-side validation with Zod
- Server-side validation (backend responsibility)
- Sanitization of user input
- SQL injection prevention (backend responsibility)

## Deployment

### Environment Variables
```
VITE_API_URL=https://api.example.com/api
VITE_COGNITO_USER_POOL_ID=us-east-1_xxxxx
VITE_COGNITO_CLIENT_ID=xxxxx
VITE_COGNITO_DOMAIN=auth.example.com
VITE_COGNITO_REDIRECT_SIGN_IN=https://app.example.com
VITE_COGNITO_REDIRECT_SIGN_OUT=https://app.example.com
```

### Build Process
1. Install dependencies: `npm install`
2. Run tests: `npm test`
3. Build for production: `npm run build`
4. Preview build: `npm run preview`

### Hosting
- Static hosting (S3 + CloudFront, Vercel, Netlify)
- SPA routing configuration
- Cache headers for assets
- Gzip/Brotli compression

## Help Tips System

### Implementation
Help tips are stored in localStorage with a unique ID per tip.

**Data Structure:**
```javascript
{
  "helpTips": {
    "dashboard-create-episode": true,  // dismissed
    "episode-detail-save": false,      // not dismissed
    // ...
  }
}
```

### Tip Locations
- Dashboard: "Create Episode" button
- Episode Detail: Save button, Track upload
- Onboarding: Each step explanation
- Navigation: Team switcher

### Reset Mechanism
Settings page includes "Reset Help Tips" button to clear all dismissals.

## Future Enhancements

### Phase 2 Features
- Team management UI
- Clip review interface
- Bulk episode operations
- Advanced search and filtering

### Phase 3 Features
- Real-time collaboration
- Activity feed
- Analytics dashboard
- Export functionality

### Phase 4 Features
- Mobile app (React Native)
- Offline support
- Advanced customization
- Integrations with external tools
