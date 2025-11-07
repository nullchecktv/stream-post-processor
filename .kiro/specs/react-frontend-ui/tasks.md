# Implementation Plan

- [x] 1. Project Setup and Configuration





  - Initialize Vite React project with TypeScript support
  - Configure Tailwind CSS with custom color palette (#5B8C5A primary, #E6F3D4 accent)
  - Set up project structure (api/, components/, contexts/, hooks/, pages/, utils/)
  - Configure environment variables for API URL and Cognito settings
  - Install and configure AWS Amplify for Cognito authentication
  - Install React Router v6 for routing
  - Install React Hook Form and Zod for form handling and validation
  - Install lucide-react for icons
  - Create .env.example file with required environment variables
  - _Requirements: 1.1, 6.1, 6.2, 6.3_

- [x] 2. Authentication Infrastructure




  - [x] 2.1 Configure AWS Amplify with Cognito


    - Set up Amplify configuration in main.jsx
    - Configure Cognito User Pool and Client ID
    - Set up hosted UI redirect URLs
    - _Requirements: 1.1, 1.2, 1.3_

  - [x] 2.2 Create AuthContext and useAuth hook


    - Implement AuthContext with authentication state
    - Create useAuth hook for accessing auth state
    - Handle token refresh automatically
    - Implement signOut function
    - _Requirements: 1.1, 1.2, 1.5_

  - [x] 2.3 Build AuthGuard component


    - Check authentication status on mount
    - Redirect to Cognito login if not authenticated
    - Show loading spinner during auth check
    - Wrap protected routes with AuthGuard
    - _Requirements: 1.1, 1.3_

- [x] 3. API Client and Services



  - [x] 3.1 Create API client wrapper





    - Implement apiRequest function using native fetch
    - Add automatic auth token injection
    - Handle 401 responses with automatic sign out
    - Parse JSON responses and handle errors
    - _Requirements: 1.4, 9.1, 9.2_

  - [x] 3.2 Build Episodes API service





    - Implement list, get,, update, delete methods
    - Handle query parameters for pagination
    - _Requirements: 3.1, 3.2, 4.1, 4.6, 5.1_

  - [x] 3.3 Build Users API service




    - Implement getProfile, updateProfile, setActiveTeam methods
    - _Requirements: 2.1, 2.4, 5.6_

  - [x] 3.4 Build Teams API service




    - Implement list, get, create, update, delete methods
    - _Requirements: 2.5, 2.6_

- [x] 4. User Profile Management




  - [x] 4.1 Create UserContext and useUser hook


    - Implement UserContext with profile state
    - Create useUser hook for accessing profile
    - Implement refreshProfile and updateProfile functions
    - Handle loading and error states
    - _Requirements: 2.1, 2.4, 5.6_

  - [x] 4.2 Build profile detection logic


    - Check for profile existence on app load
    - Redirect to onboarding if profile not found (404 response)
    - _Requirements: 2.1_

- [x] 5. Common UI Components





  - [x] 5.1 Create Button component


    - Implement variants (primary, secondary, danger, ghost)
    - Add size options (sm, md, lg)
    - Handle loading and disabled states
    - Apply brand colors to primary variant
    - _Requirements: 6.1, 6.2, 6.6_

  - [x] 5.2 Create Input component


    - Build text input with label and error display
    - Add validation state styling
    - Support different input types
    - _Requirements: 6.3, 6.5, 9.3_

  - [x] 5.3 Create Modal component


    - Implement backdrop with click-to-close
    - Add ESC key handler
    - Implement focus trap
    - Add smooth fade-in animation
    - Make responsive
    - _Requirements: 4.2, 6.6_

  - [x] 5.4 Create LoadingSpinner component

    - Build spinner with brand colors
    - Create variants (inline, page, section)
    - _Requirements: 8.1, 8.5_

  - [x] 5.5 Create HelpTip component


    - Build dismissable tooltip component
    - Store dismissal state in localStorage
    - Position tooltip relative to target element
    - Add smooth show/hide animation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 6. Onboarding Flow




  - [x] 6.1 Create OnboardingWizard component


    - Build multi-step wizard container
    - Implement progress indicator
    - Add back/next navigation
    - Handle step transitions with animations
    - _Requirements: 2.2, 2.8_

  - [x] 6.2 Build ProfileStep component


    - Create form with name, timezone, notifications fields
    - Implement validation with Zod schema
    - Show inline validation errors
    - Submit profile data to PUT /me endpoint
    - _Requirements: 2.3, 2.4, 9.3_

  - [x] 6.3 Build TeamStep component


    - Create optional team creation form
    - Add prominent "Skip" button
    - Implement team name, description, settings fields
    - Submit team data to POST /teams endpoint
    - _Requirements: 2.5, 2.6_

  - [x] 6.4 Create OnboardingPage component


    - Integrate OnboardingWizard with steps
    - Navigate to dashboard on completion
    - Handle errors during onboarding
    - _Requirements: 2.1, 2.7_

- [x] 7. Navigation and Layout




  - [x] 7.1 Create Sidebar component


    - Build fixed left sidebar with full height
    - Add logo/brand at top
    - Implement collapsible functionality (240px expanded, 64px collapsed)
    - Add collapse toggle button
    - Persist collapsed state in localStorage
    - Implement smooth expand/collapse animation
    - Make responsive: auto-collapse on mobile with overlay toggle
    - _Requirements: 10.3, 10.4, 10.5, 10.11, 6.7_

  - [x] 7.2 Create SidebarItem component


    - Build navigation item with icon and label
    - Highlight active route with accent color
    - Add hover effects
    - Show tooltip when sidebar is collapsed
    - Handle click navigation
    - _Requirements: 10.6, 10.7, 6.6_

  - [x] 7.3 Add navigation icons


    - Install icon library (lucide-react or heroicons)
    - Add icons for Dashboard (Home), Episodes (Video), Teams (Users), Settings (Gear)
    - Ensure icons are visible in both expanded and collapsed states
    - _Requirements: 10.3, 10.7_

  - [x] 7.4 Create user section in sidebar


    - Build user section at bottom of sidebar
    - Display user avatar and name (when expanded)
    - Show active team indicator
    - Add Switch Team and Sign Out options
    - _Requirements: 10.3_

  - [x] 7.5 Create PageLayout component


    - Build layout wrapper with sidebar
    - Add main content area with appropriate left margin
    - Adjust margin based on sidebar collapsed state
    - _Requirements: 10.1, 10.2_

- [x] 8. Dashboard




  - [x] 8.1 Create DashboardLayout component


    - Build main dashboard container
    - Add sections for upcoming and previous episodes
    - Position floating "Create Episode" button
    - _Requirements: 3.1_

  - [x] 8.2 Build UpcomingEpisodes component


    - Fetch episodes from GET /episodes endpoint
    - Filter for upcoming episodes (future air date or no air date)
    - Display in responsive grid layout
    - Show episode cards with metadata
    - Implement empty state with helpful message
    - Add loading skeleton
    - _Requirements: 3.1, 3.2, 3.3, 8.1, 8.5_

  - [x] 8.3 Build PreviousEpisodes component


    - Filter for past episodes
    - Display in compact list layout
    - Make section collapsible (starts collapsed)
    - Implement "Load More" pagination
    - Apply subtle styling
    - _Requirements: 3.1, 3.2, 3.3_

  - [x] 8.4 Create EpisodeCard component


    - Display episode title, number, air date
    - Show status badge with appropriate styling
    - Add platform icons
    - Make clickable to navigate to detail page
    - _Requirements: 3.4, 3.6_

  - [x] 8.5 Build CreateEpisodeModal component


    - Create modal with episode creation form
    - Add fields: title, episode number, air date, series name
    - Implement validation with Zod schema
    - Submit to POST /episodes endpoint
    - Show loading state during creation
    - Navigate to episode detail page on success
    - Display inline errors on failure
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8_

  - [x] 8.6 Create Dashboard page component


    - Integrate DashboardLayout with episode components
    - Check for profile on mount and redirect to onboarding if needed
    - Handle keyboard shortcut (Ctrl/Cmd + N) for create modal
    - _Requirements: 3.1, 4.1_

- [x] 9. Episode Detail and Editing




  - [x] 9.1 Create EpisodeForm component


    - Build form with all episode metadata fields
    - Implement validation with Zod schema
    - Show inline validation errors
    - Handle form state with React Hook Form
    - _Requirements: 5.3, 5.4, 9.3_

  - [x] 9.2 Build EpisodeDetailPage component


    - Fetch episode data from GET /episodes/{id} endpoint
    - Display episode metadata in editable form
    - Show save button when form is dirty
    - Submit changes to PUT /episodes/{id} endpoint
    - Display success feedback on save
    - Show error messages on failure
    - Add breadcrumb navigation
    - Implement unsaved changes warning
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 10.5_

- [x] 10. Routing and Navigation





  - [x] 10.1 Set up React Router


    - Configure BrowserRouter in App.jsx
    - Define route structure
    - Implement route-based code splitting with React.lazy
    - _Requirements: 10.1, 10.2, 8.4_

  - [x] 10.2 Create protected route structure


    - Wrap all routes except login with AuthGuard
    - Set up onboarding route
    - Configure dashboard as home route
    - Add episode detail route with parameter
    - Create 404 NotFoundPage
    - _Requirements: 10.2, 10.7_

  - [x] 10.3 Implement navigation helpers


    - Update page title based on current route
    - Handle browser back/forward navigation
    - _Requirements: 10.5, 10.6_

- [x] 11. Error Handling and User Feedback




  - [x] 11.1 Create ErrorBoundary component


    - Catch React errors globally
    - Display fallback UI with error message
    - Add "Reload Page" button
    - Log errors to console
    - _Requirements: 9.5_

  - [x] 11.2 Implement error handling utilities


    - Create error message formatter
    - Build error display components (toast, inline)
    - Handle different error types (400, 401, 403, 404, 500)
    - Add retry functionality for network errors
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.6_

  - [x] 11.3 Add success notifications


    - Create toast notification component
    - Show success messages for completed actions
    - _Requirements: 9.4_

- [x] 12. Help Tips System





  - [x] 12.1 Create useHelpTips hook
    - Implement localStorage-based persistence
    - Create functions to check, dismiss, and reset tips
    - _Requirements: 7.2, 7.3, 7.4_


  - [x] 12.2 Add help tips to key locations

    - Dashboard: "Create Episode" button tip
    - Episode Detail: Save button tip
    - Onboarding: Step explanation tips
    - _Requirements: 7.1, 7.6_


  - [x] 12.3 Implement reset functionality


    - Add "Reset Help Tips" option in settings/user menu
    - Clear all dismissals from localStorage
    - _Requirements: 7.5_

- [x] 13. Performance Optimization




  - [x] 13.1 Implement code splitting

    - Use React.lazy for route components
    - Add Suspense boundaries with loading fallbacks
    - _Requirements: 8.4_

  - [x] 13.2 Add caching strategy


    - Implement simple in-memory cache for API responses
    - Cache episode list and detail data
    - Invalidate cache on mutations
    - _Requirements: 8.3_

  - [x] 13.3 Optimize bundle


    - Configure Vite for production optimization
    - Enable tree shaking and minification
    - Optimize asset loading
    - _Requirements: 8.6_

- [x] 14. Styling and Visual Polish





  - [x] 14.1 Configure Tailwind with custom theme


    - Set up custom color palette in tailwind.config.js
    - Configure typography and spacing
    - Add custom shadows and border radius
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 14.2 Implement responsive design


    - Make all components responsive
    - Test on mobile, tablet, and desktop breakpoints
    - Adjust layouts for different screen sizes
    - _Requirements: 6.7_

  - [x] 14.3 Add animations and transitions


    - Implement smooth transitions for modals and tooltips
    - Add hover effects on interactive elements
    - Create loading animations
    - _Requirements: 6.6_

- [ ] 15. Final Integration and Testing
  - [ ] 15.1 Integration testing
    - Test complete onboarding flow
    - Test episode creation and editing flow
    - Test authentication flow (login, logout, token refresh)
    - Verify help tips system works correctly
    - _Requirements: All_

  - [ ] 15.2 Cross-browser testing
    - Test in Chrome, Firefox, Safari, Edge
    - Verify responsive design on different devices
    - Check accessibility with screen readers
    - _Requirements: 6.7, 8.6_

  - [ ] 15.3 Performance validation
    - Measure initial page load time
    - Verify code splitting is working
    - Check bundle size
    - Test on slower network connections
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

  - [ ] 15.4 Documentation
    - Create README with setup instructions
    - Document environment variables
    - Add component usage examples
    - Document deployment process
    - _Requirements: All_

