# Implementation Plan

- [x] 1. Set up core infrastructure and type definitions




  - Create TypeScript interfaces for Team, TeamMember, PendingInvitation, and Notification types in `frontend/src/types/index.ts`
  - Add team-related types to UserProfile interface
  - Create error type definitions for API responses
  - _Requirements: 1.1, 2.1, 3.1, 4.1_

- [x] 2. Implement API client modules





  - [x] 2.1 Create teams API client in `frontend/src/api/teams.ts`


    - Implement listTeams, createTeam, getTeam, updateTeam, deleteTeam methods
    - Implement listMembers, inviteMember, updateMemberRole, removeMember, leaveTeam, cancelInvitation methods
    - Add proper TypeScript types for all request/response payloads
    - _Requirements: 3.3, 4.3, 5.3, 6.1, 7.3, 8.3, 9.3, 10.3, 11.3_
  - [x] 2.2 Create invitations API client in `frontend/src/api/invitations.ts`


    - Implement makeDecision method for accepting/rejecting invitations
    - Add proper error handling for invitation states (expired, already processed, etc.)
    - _Requirements: 1
  - [x] 2.3 Create notifications API client in `frontend/src/api/notifications.ts`


    - Implement listNotifications, markAsRead, deleteNotification methods
    - Add pagination support with nextToken
    - Add filtering by read status
    - _Requirements: 14.1, 14.4, 15.2_
  - [x] 2.4 Enhance users API client in `frontend/src/api/users.ts`


    - Add setActiveTeam method for team switching
    - Update getProfile and updateProfile to handle team-related fields
    - _Requirements: 4.3, 17.3_

- [x] 3. Create context providers for state management






  - [x] 3.1 Implement TeamContext in `frontend/src/contexts/TeamContext.tsx`

    - Create TeamProvider component with state for activeTeam, teams, loading, error
    - Implement fetchTeams, createTeam, updateTeam, deleteTeam, setActiveTeam methods
    - Implement fetchMembers, inviteMember, updateMemberRole, removeMember, leaveTeam, cancelInvitation methods
    - Add automatic team fetching on mount when user is authenticated
    - Integrate with UserContext to sync active team state
    - _Requirements: 3.3, 4.3, 5.3, 6.1, 7.3, 8.3, 9.3, 10.3, 11.3_
  - [x] 3.2 Implement NotificationContext in `frontend/src/contexts/NotificationContext.tsx`


    - Create NotificationProvider component with state for notifications, unreadCount, loading, error
    - Implement fetchNotifications, markAsRead, deleteNotification methods
    - Implement acceptInvitation and rejectInvitation methods
    - Add polling mechanism for new notifications (every 30 seconds)
    - Calculate and update unreadCount automatically
    - _Requirements: 12.3, 13.3, 14.1, 14.2, 14.4, 15.2_

  - [x] 3.3 Enhance UserContext in `frontend/src/contexts/UserContext.tsx`

    - Update UserProfile interface to include team-related fields
    - Ensure profile refresh after team operations
    - Add integration points for TeamContext
    - _Requirements: 4.4, 17.3_

- [x] 4. Create custom hooks for reusable logic





  - [x] 4.1 Create useTeams hook in `frontend/src/hooks/useTeams.ts`


    - Export hook that accesses TeamContext
    - Add error handling for missing provider
    - _Requirements: 3.1, 4.1, 5.1, 6.1_
  - [x] 4.2 Create useNotifications hook in `frontend/src/hooks/useNotifications.ts`


    - Export hook that accesses NotificationContext
    - Add error handling for missing provider
    - _Requirements: 14.1, 15.1_
  - [x] 4.3 Create useTeamPermissions hook in `frontend/src/hooks/useTeamPermissions.ts`


    - Calculate permissions based on user role (owner, administrator, member)
    - Return boolean flags for canInviteMembers, canRemoveMembers, canUpdateRoles, canUpdateTeam, canDeleteTeam, canCancelInvitations
    - Integrate with useUser and useTeams hooks
    - _Requirements: 5.5, 7.1, 8.1, 9.1, 11.1, 16.1_

- [x] 5. Implement authentication and signup flow




  - [x] 5.1 Create SignupPage in `frontend/src/pages/SignupPage.tsx`


    - Build registration form with email, password, confirm password, and name fields
    - Add client-side validation for email format, password strength, and matching passwords
    - Integrate with AWS Amplify signUp method
    - Display error messages for duplicate emails with link to login
    - Redirect to email verification page on successful signup
    - _Requirements: 1.1, 1.2, 1.4_
  - [x] 5.2 Create EmailVerificationPage in `frontend/src/pages/EmailVerificationPage.tsx`


    - Build verification code input form
    - Integrate with AWS Amplify confirmSignUp method
    - Add resend code functionality
    - Redirect to onboarding page after successful verification
    - Display error messages for invalid codes
    - _Requirements: 1.3_
  - [x] 5.3 Enhance OnboardingPage in `frontend/src/pages/OnboardingPage.tsx`


    - Add multi-step wizard (welcome, invitations, team creation)
    - Fetch and display pending team invitations using NotificationContext
    - Add invitation acceptance/rejection functionality
    - Add option to create first team
    - Add option to skip and continue in individual mode
    - Redirect to dashboard after completion
    - _Requirements: 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 12.2, 12.3_
  - [x] 5.4 Update App.tsx routing


    - Add /signup route for SignupPage
    - Add /verify-email route for EmailVerificationPage
    - Update /onboarding route to use enhanced OnboardingPage
    - Wrap application with TeamProvider and NotificationProvider
    - _Requirements: 1.1, 1.3, 2.1_

- [x] 6. Build team management pages






  - [x] 6.1 Create TeamsListPage in `frontend/src/pages/TeamsListPage.tsx`

    - Display grid/list view of all user's teams using useTeams hook
    - Show team cards with name, description, role, and member count
    - Add "Create Team" button that opens team creation modal
    - Add search and filter functionality
    - Highlight active team with visual indicator
    - Add quick team switching on card click
    - _Requirements: 4.1, 4.2, 4.3_

  - [x] 6.2 Create TeamDetailPage in `frontend/src/pages/TeamDetailPage.tsx`

    - Display team information (name, description, settings)
    - Show quick stats (member count, episode count, clip count)
    - Add navigation buttons to settings and members pages
    - Add "Leave Team" button for non-owners
    - Display recent activity feed
    - _Requirements: 5.1, 10.1_


  - [x] 6.3 Create TeamSettingsPage in `frontend/src/pages/TeamSettingsPage.tsx`

    - Build editable form for team name, description, default platforms, and timezone
    - Add permission check to ensure only owners can access
    - Implement form submission with updateTeam API call
    - Add "Delete Team" button with confirmation dialog (owner only)
    - Display success/error messages using toast notifications

    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 16.1, 16.2, 16.3, 16.4, 16.5_
  - [x] 6.4 Create TeamMembersPage in `frontend/src/pages/TeamMembersPage.tsx`

    - Display member list using fetchMembers API call
    - Show pending invitations section (visible to owners and administrators only)
    - Add "Invite Member" button that opens invitation modal
    - Implement pagination for teams with more than 20 members
    - Add search functionality for members
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1_
  - [x] 6.5 Add team routes to App.tsx


    - Add /teams route for TeamsListPage
    - Add /teams/:teamId route for TeamDetailPage
    - Add /teams/:teamId/settings route for TeamSettingsPage
    - Add /teams/:teamId/members route for TeamMembersPage
    - Ensure routes are protected with AuthGuard and ProfileGuard
    - _Requirements: 20.1, 20.2, 20.3_

- [x] 7. Build reusable team components






  - [x] 7.1 Create TeamSelector in `frontend/src/components/teams/TeamSelector.tsx`

    - Build dropdown component showing current active team
    - Display list of all user's teams
    - Add "Individual Mode" option to clear active team
    - Add "Create Team" option
    - Implement team switching with setActiveTeam API call
    - Integrate with TopHeader component
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  - [x] 7.2 Create InvitationCard in `frontend/src/components/teams/InvitationCard.tsx`


    - Display team name, description, inviter name, and role
    - Add "Accept" and "Reject" buttons
    - Show loading states during API calls
    - Display invitation date and expiration
    - Add visual styling with team branding
    - _Requirements: 2.3, 12.2, 12.3, 13.1, 13.2_
  - [x] 7.3 Create MemberListItem in `frontend/src/components/teams/MemberListItem.tsx`


    - Display member avatar (initials), name, email, role, and join date
    - Add owner badge for team owner
    - Add role change dropdown (visible to owners only)
    - Add "Remove" button (visible to owners and administrators)
    - Implement role change with updateMemberRole API call
    - Implement member removal with removeMember API call
    - _Requirements: 6.2, 6.3, 8.1, 8.2, 8.3, 8.5, 9.1, 9.2, 9.3, 9.5_
  - [x] 7.4 Create InviteMemberModal in `frontend/src/components/teams/InviteMemberModal.tsx`


    - Build modal with email input and role selector
    - Add email validation
    - Implement invitation submission with inviteMember API call
    - Display success message indicating if user was added immediately or invited
    - Display error messages for duplicate members or invalid emails
    - Close modal on successful invitation
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 7.5 Create TeamForm in `frontend/src/components/teams/TeamForm.tsx`


    - Build reusable form component for creating and editing teams
    - Add fields for name, description, default platforms, and timezone
    - Implement client-side validation (name length, required fields)
    - Support both create and update modes
    - Display loading state during submission
    - _Requirements: 3.1, 3.2, 3.3, 5.2_

- [x] 8. Build notification system






  - [x] 8.1 Create NotificationsPage in `frontend/src/pages/NotificationsPage.tsx`

    - Display list of all notifications using useNotifications hook
    - Add unread/read filter tabs
    - Implement pagination for more than 20 notifications
    - Show empty state when no notifications exist
    - Add "Mark all as read" button
    - _Requirements: 14.1, 14.2, 14.5_

  - [x] 8.2 Create NotificationBadge in `frontend/src/components/notifications/NotificationBadge.tsx`

    - Display red badge with unread count
    - Hide badge when count is 0
    - Add animated appearance for new notifications
    - Implement click handler to open notifications
    - Integrate with TopHeader component
    - _Requirements: 14.3_
  - [x] 8.3 Create NotificationItem in `frontend/src/components/notifications/NotificationItem.tsx`


    - Display notification icon based on type
    - Show title, message, and timestamp
    - Add read/unread visual indicator
    - Add "Mark as Read" button
    - Add "Delete" button
    - Add "Accept" and "Reject" buttons for invitation notifications
    - Implement markAsRead, deleteNotification, acceptInvitation, rejectInvitation actions
    - _Requirements: 12.2, 12.3, 12.4, 12.5, 13.1, 13.2, 13.3, 13.4, 13.5, 14.4, 15.1, 15.2, 15.3_

  - [x] 8.4 Add notifications route to App.tsx

    - Add /notifications route for NotificationsPage
    - Ensure route is protected with AuthGuard and ProfileGuard
    - _Requirements: 14.1, 20.2_

- [x] 9. Build profile management




  - [x] 9.1 Create ProfilePage in `frontend/src/pages/ProfilePage.tsx`


    - Display user profile information (email, name, account creation date)
    - Build editable form for name, timezone, and notification preferences
    - Implement form submission with updateProfile API call
    - Add "Sign Out" button
    - Display success/error messages using toast notifications
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_
  - [x] 9.2 Add profile route to App.tsx


    - Add /profile route for ProfilePage
    - Ensure route is protected with AuthGuard and ProfileGuard
    - _Requirements: 17.1, 20.2_

- [x] 10. Implement common UI components




  - [x] 10.1 Create ConfirmDialog in `frontend/src/components/common/ConfirmDialog.tsx`


    - Build modal component with title, message, and action buttons
    - Support danger, warning, and info variants with different colors
    - Add keyboard support (Enter to confirm, Escape to cancel)
    - Implement modal overlay with click-outside to close
    - _Requirements: 9.2, 10.2, 11.2, 13.2, 16.2_

  - [x] 10.2 Create EmptyState in `frontend/src/components/common/EmptyState.tsx`

    - Build component for displaying empty states with icon, title, and message
    - Add optional action button
    - Support different variants (no teams, no members, no notifications)
    - _Requirements: 6.1, 8.1, 14.5_
  - [x] 10.3 Create LoadingSpinner enhancements in `frontend/src/components/common/LoadingSpinner.tsx`


    - Add inline variant for button loading states
    - Add card variant for loading cards
    - Ensure existing page variant continues to work
    - _Requirements: 18.4_

- [x] 11. Add error handling and user feedback





  - [x] 11.1 Enhance error handling in API client


    - Add specific error messages for 403 (permission denied)
    - Add specific error messages for 404 (resource not found)
    - Add specific error messages for 409 (conflict - duplicate, already member)
    - Add specific error messages for 422 (validation errors)
    - Transform API errors to user-friendly messages
    - _Requirements: 18.1, 18.3_
  - [x] 11.2 Add toast notifications for all operations


    - Show success toasts for team creation, updates, deletion
    - Show success toasts for member invitations, role changes, removals
    - Show success toasts for invitation acceptance/rejection
    - Show success toasts for notification actions
    - Show error toasts for failed operations with retry options
    - _Requirements: 18.2, 18.5_
  - [x] 11.3 Add loading states to all async operations


    - Add loading spinners to buttons during API calls
    - Add skeleton screens for loading content
    - Add loading overlays for page transitions
    - Disable form inputs during submission
    - _Requirements: 18.4_

- [x] 12. Implement responsive design






  - [x] 12.1 Add responsive layouts for team pages

    - Implement desktop layouts (1024px+) with multi-column grids
    - Implement tablet layouts (768px-1023px) with adapted grids
    - Implement mobile layouts (<768px) with single-column stacks
    - Ensure all forms are mobile-friendly
    - _Requirements: 19.1, 19.2, 19.3_

  - [x] 12.2 Add responsive navigation

    - Implement hamburger menu for mobile devices
    - Ensure TeamSelector works on mobile
    - Add bottom navigation for mobile (optional)
    - Ensure touch-friendly interactive elements (min 44px)
    - _Requirements: 19.4, 19.5_


  - [ ] 12.3 Test responsive behavior across devices
    - Test on desktop browsers (Chrome, Firefox, Safari)
    - Test on tablet devices (iPad, Android tablets)
    - Test on mobile devices (iPhone, Android phones)
    - Verify touch interactions work correctly
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_
-

- [x] 13. Add navigation and routing enhancements



  - [x] 13.1 Update TopHeader component


    - Integrate TeamSelector component
    - Integrate NotificationBadge component
    - Add profile menu with link to ProfilePage
    - Ensure responsive behavior on mobile
    - _Requirements: 20.1, 20.2_

  - [x] 13.2 Update Sidebar component

    - Add "Teams" navigation link
    - Add "Notifications" navigation link
    - Add "Profile" navigation link
    - Highlight active route
    - _Requirements: 20.2_
  - [x] 13.3 Add route guards for team-specific pages


    - Redirect to team selection if no active team when accessing team-specific pages
    - Maintain navigation state when switching teams
    - Add breadcrumb navigation for nested pages
    - _Requirements: 20.3, 20.4, 20.5_

- [ ]* 14. Write unit tests for core functionality
  - [ ]* 14.1 Test TeamContext provider
    - Test team fetching and state updates
    - Test team creation, update, and deletion
    - Test member management operations
    - Test error handling
    - _Requirements: 3.3, 5.3, 6.1, 7.3, 8.3, 9.3, 10.3, 11.3_
  - [ ]* 14.2 Test NotificationContext provider
    - Test notification fetching and state updates
    - Test mark as read and delete operations
    - Test invitation acceptance and rejection
    - Test unread count calculation
    - _Requirements: 12.3, 13.3, 14.1, 14.4, 15.2_
  - [ ]* 14.3 Test useTeamPermissions hook
    - Test permission calculations for owner role
    - Test permission calculations for administrator role
    - Test permission calculations for member role
    - Test edge cases (no team, no membership)
    - _Requirements: 5.5, 7.1, 8.1, 9.1, 11.1, 16.1_
  - [ ]* 14.4 Test API client modules
    - Test teams API client methods
    - Test invitations API client methods
    - Test notifications API client methods
    - Test error handling and response transformation
    - _Requirements: 3.3, 4.3, 5.3, 6.1, 7.3, 8.3, 9.3, 10.3, 11.3, 12.3, 13.3, 14.1, 15.2_

- [ ]* 15. Write integration tests for user flows
  - [ ]* 15.1 Test complete signup and onboarding flow
    - Test user registration
    - Test email verification
    - Test onboarding with pending invitations
    - Test team creation during onboarding
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 15.2 Test team creation and member invitation flow
    - Test creating a new team
    - Test inviting members
    - Test invitation email sending
    - Test invitation acceptance
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 7.1, 7.2, 7.3, 7.4, 7.5, 12.1, 12.2, 12.3, 12.4, 12.5_
  - [ ]* 15.3 Test member management flow
    - Test updating member roles
    - Test removing members
    - Test leaving team
    - Test canceling invitations
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 9.1, 9.2, 9.3, 9.4, 9.5, 10.1, 10.2, 10.3, 10.4, 10.5, 11.1, 11.2, 11.3, 11.4, 11.5_
  - [ ]* 15.4 Test team switching flow
    - Test switching between teams
    - Test switching to individual mode
    - Test data refresh after team switch
    - Test navigation state preservation
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 20.3, 20.4_

- [x] 16. Final polish and accessibility





  - [x] 16.1 Add keyboard navigation support


    - Ensure all interactive elements are keyboard accessible
    - Add focus indicators for keyboard navigation
    - Support Tab, Enter, Escape keys appropriately
    - Test with keyboard-only navigation
    - _Requirements: 19.5_

  - [x] 16.2 Add ARIA labels and roles

    - Add aria-label to icon buttons
    - Add role attributes to custom components
    - Add aria-live regions for dynamic content
    - Test with screen readers
    - _Requirements: 19.5_
  - [x] 16.3 Optimize performance


    - Add React.memo to pure components
    - Optimize re-renders in context providers
    - Add debouncing to search inputs
    - Lazy load route components
    - _Requirements: 18.4_
