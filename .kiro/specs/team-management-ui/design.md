# Design Document

## Overview

This design implements a comprehensive team management user interface for the livestream post-production platform. The solution provides intuitive workflows for user registration, team collaboration, member managemefications. The design follows React best practices with TypeScript, leveraging existing patterns from the codebase including Context API for state management, custom hooks for reusable logic, and a simple API client layer.

## Architecture

### High-Level Component Structure

```
App
├── AuthProvider (existing)
├── UserProvider (existing - enhanced)
├── TeamProvider (new)
├── NotificationProvider (new)
├── SidebarProvider (existing)
└── ToastProvider (existing)
    └── Routes
        ├── Public Routes
        │   ├── /login (existing - enhanced)
        │   ├── /signup (new)
        │   ├── /verify-email (new)
        │   └── /forgot-password (existing)
        └── Protected Routes
            ├── /onboarding (existing - enhanced)
            ├── / (Dashboard - existing)
            ├── /episodes/:id (existing)
            ├── /teams (new)
            │   ├── /teams/new (new)
            │   ├── /teams/:teamId (new)
            │   ├── /teams/:teamId/settings (new)
            │   └── /teams/:teamId/members (new)
            ├── /profile (new)
            └── /notifications (new)
```

### Data Flow

```
User Action → Component → API Client → Backend REST API
                ↓                           ↓
            Context Update ← Response ← Backend
                ↓
            UI Re-render
```

## Components and Interfaces

### 1. Context Providers

#### TeamContext (New)
Manages team-related state and operations across the application.

```typescript
interface Team {
  id: string
  name: string
  description?: string
  ownerId: string
  status: 'active' | 'archived'
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
  createdAt: string
  updatedAt: string
}

interface TeamMember {
  userId: string
  email: string
  name?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  invitedBy?: string
  inviterName?: string
}

interface PendingInvitation {
  email: string
  role: 'administrator' | 'member'
  invitedBy: string
  inviterName: string
  invitedAt: string
  expiresAt: string
}

interface TeamContextType {
  activeTeam: Team | null
  teams: Team[]
  loading: boolean
  error: string | null

  // Team operations
  fetchTeams: () => Promise<void>
  createTeam: (data: CreateTeamData) => Promise<Team>
  updateTeam: (teamId: string, data: UpdateTeamData) => Promise<Team>
  deleteTeam: (teamId: string) => Promise<void>
  setActiveTeam: (teamId: string | null) => Promise<void>

  // Member operations
  fetchMembers: (teamId: string) => Promise<{ members: TeamMember[], pendingInvitations: PendingInvitation[] }>
  inviteMember: (teamId: string, email: string, role: string) => Promise<void>
  updateMemberRole: (teamId: string, userId: string, role: string) => Promise<void>
  removeMember: (teamId: string, userId: string, confirmDelete?: boolean) => Promise<void>
  leaveTeam: (teamId: string) => Promise<void>
  cancelInvitation: (teamId: string, email: string) => Promise<void>
}
```

**Implementation Notes:**
- Fetches teams on mount when user is authenticated
- Caches team data to minimize API calls
- Automatically refreshes when active team changes
- Integrates with UserContext to sync active team state

#### NotificationContext (New)
Manages user notifications and invitation decisions.

```typescript
interface Notification {
  id: string
  type: 'team_invitation' | 'member_added' | 'member_removed' | 'role_changed' | 'clip_processed'
  title: string
  message: string
  data?: {
    teamId?: string
    teamName?: string
    inviterName?: string
    invitationId?: string
    [key: string]: unknown
  }
  isRead: boolean
  createdAt: string
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null

  fetchNotifications: () => Promise<void>
  markAsRead: (notificationId: string) => Promise<void>
  deleteNotification: (notificationId: string) => Promise<void>
  acceptInvitation: (invitationId: string) => Promise<void>
  rejectInvitation: (invitationId: string) => Promise<void>
}
```

**Implementation Notes:**
- Polls for new notifications every 30 seconds when user is active
- Updates unread count badge in real-time
- Handles invitation actions and updates notification list
- Integrates with TeamContext to refresh teams after accepting invitations

#### Enhanced UserContext
Extend existing UserContext to include team-related profile data.

```typescript
interface UserProfile {
  email: string
  name: string
  activeTeamId: string | null
  preferences?: {
    timezone?: string
    notifications?: boolean
  }
  teams: UserTeamMembership[]
  ownedTeams: UserTeamMembership[]
  memberTeams: UserTeamMembership[]
  createdAt: string
  updatedAt: string
}

interface UserTeamMembership {
  teamId: string
  name: string
  description?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  teamStatus: string
}
```

### 2. API Client Layer

#### teams.ts (New)
API client for team-related endpoints.

```typescript
export const teamsApi = {
  // Team CRUD
  listTeams: () => apiRequest<{ items: Team[], count: number }>('/teams'),
  createTeam: (data: CreateTeamData) => apiRequest<{ id: string }>('/teams', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  getTeam: (teamId: string) => apiRequest<Team>(`/teams/${teamId}`),
  updateTeam: (teamId: string, data: UpdateTeamData) => apiRequest<Team>(`/teams/${teamId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deleteTeam: (teamId: string) => apiRequest<void>(`/teams/${teamId}`, {
    method: 'DELETE',
  }),

  // Member management
  listMembers: (teamId: string, cursor?: string, limit?: number) =>
    apiRequest<{ members: TeamMember[], pendingInvitations: PendingInvitation[], nextCursor?: string, hasMore: boolean }>(
      `/teams/${teamId}/members?${new URLSearchParams({ ...(cursor && { cursor }), ...(limit && { limit: limit.toString() }) })}`
    ),
  inviteMember: (teamId: string, email: string, role: string) =>
    apiRequest<{ email: string, role: string, status: string, invitationSent: boolean, message: string }>(
      `/teams/${teamId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({ email, role }),
      }
    ),
  updateMemberRole: (teamId: string, userId: string, role: string) =>
    apiRequest<{ userId: string, role: string, updatedAt: string, message: string }>(
      `/teams/${teamId}/members/${userId}/role`,
      {
        method: 'PUT',
        body: JSON.stringify({ role }),
      }
    ),
  removeMember: (teamId: string, userId: string, confirmDelete?: boolean) =>
    apiRequest<void>(
      `/teams/${teamId}/members/${userId}${confirmDelete ? '?confirmDelete=true' : ''}`,
      { method: 'DELETE' }
    ),
  leaveTeam: (teamId: string) =>
    apiRequest<void>(`/teams/${teamId}/members/me`, { method: 'DELETE' }),
  cancelInvitation: (teamId: string, email: string) =>
    apiRequest<void>(`/teams/${teamId}/invitations/${encodeURIComponent(email)}`, { method: 'DELETE' }),
}
```

#### invitations.ts (New)
API client for invitation decisions.

```typescript
export const invitationsApi = {
  makeDecision: (invitationId: string, action: 'accept' | 'reject') =>
    apiRequest<{ message: string, teamId?: string, teamName?: string, role?: string }>(
      `/invitations/${invitationId}/decisions`,
      {
        method: 'POST',
        body: JSON.stringify({ action }),
      }
    ),
}
```

#### notifications.ts (New)
API client for notifications.

```typescript
export const notificationsApi = {
  listNotifications: (limit?: number, nextToken?: string, isRead?: boolean) =>
    apiRequest<{ items: Notification[], nextToken?: string }>(
      `/notifications?${new URLSearchParams({
        ...(limit && { limit: limit.toString() }),
        ...(nextToken && { nextToken }),
        ...(isRead !== undefined && { isRead: isRead.toString() })
      })}`
    ),
  markAsRead: (notificationId: string) =>
    apiRequest<void>(`/notifications/${notificationId}?isRead=true`, { method: 'DELETE' }),
  deleteNotification: (notificationId: string) =>
    apiRequest<void>(`/notifications/${notificationId}`, { method: 'DELETE' }),
}
```

#### Enhanced users.ts
Add active team management to existing users API.

```typescript
export const usersApi = {
  // Existing methods...
  getProfile: () => apiRequest<UserProfile>('/me'),
  updateProfile: (data: Partial<UserProfile>) => apiRequest<UserProfile>('/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  // New method
  setActiveTeam: (teamId: string | null) =>
    apiRequest<{ activeTeamId: string | null, message: string, requiresTokenRefresh: boolean }>(
      '/me/teams',
      {
        method: 'POST',
        body: JSON.stringify({ teamId }),
      }
    ),
}
```

### 3. Page Components

#### SignupPage (New)
User registration page with email, password, and name fields.

**Location:** `frontend/src/pages/SignupPage.tsx`

**Features:**
- Email and password validation
- Name field for display name
- Password strength indicator
- Link to login page for existing users
- Error handling for duplicate emails
- Redirects to email verification after successful signup

**Form Fields:**
- Email (required, email format)
- Password (required, min 8 characters, complexity requirements)
- Confirm Password (required, must match)
- Name (required, max 100 characters)

#### EmailVerificationPage (New)
Email verification confirmation page.

**Location:** `frontend/src/pages/EmailVerificationPage.tsx`

**Features:**
- Displays verification code input
- Resend verification code option
- Auto-redirect to onboarding after successful verification
- Error handling for invalid codes

#### Enhanced OnboardingPage
Extend existing onboarding to handle team invitations.

**Location:** `frontend/src/pages/OnboardingPage.tsx` (existing - enhance)

**New Features:**
- Display pending team invitations
- Accept/reject invitation cards
- Option to create first team
- Option to skip and use individual mode
- Multi-step wizard:
  1. Welcome and name confirmation
  2. Team invitations (if any)
  3. Create team or continue individually

#### TeamsListPage (New)
Overview of all user's teams.

**Location:** `frontend/src/pages/TeamsListPage.tsx`

**Features:**
- Grid/list view of all teams
- Team cards showing name, description, role, member count
- Create new team button
- Quick team switching
- Search and filter teams
- Active team indicator

#### TeamDetailPage (New)
Detailed view of a single team.

**Location:** `frontend/src/pages/TeamDetailPage.tsx`

**Features:**
- Team information display
- Recent activity feed
- Quick stats (members, episodes, clips)
- Navigation to settings and members
- Leave team button (for non-owners)

#### TeamSettingsPage (New)
Team configuration and management.

**Location:** `frontend/src/pages/TeamSettingsPage.tsx`

**Features:**
- Edit team name and description
- Configure default platforms
- Set team timezone
- Delete team button (owner only)
- Tabs for different settings sections

#### TeamMembersPage (New)
Team member management interface.

**Location:** `frontend/src/pages/TeamMembersPage.tsx`

**Features:**
- Member list with roles and join dates
- Pending invitations section (owner/admin only)
- Invite member button (owner/admin only)
- Role change dropdown (owner only)
- Remove member button (owner/admin only)
- Cancel invitation button (owner/admin only)
- Pagination for large teams
- Search members

#### ProfilePage (New)
User profile management.

**Location:** `frontend/src/pages/ProfilePage.tsx`

**Features:**
- Edit display name
- Update timezone preference
- Toggle notification preferences
- View account creation date
- Sign out button

#### NotificationsPage (New)
Notification center.

**Location:** `frontend/src/pages/NotificationsPage.tsx`

**Features:**
- List of all notifications
- Unread/read filter
- Mark as read action
- Delete notification action
- Invitation action buttons (accept/reject)
- Pagination
- Empty state for no notifications

### 4. Reusable Components

#### TeamSelector (New)
Dropdown component for switching teams.

**Location:** `frontend/src/components/teams/TeamSelector.tsx`

**Features:**
- Displays current active team
- Dropdown list of all teams
- Individual mode option
- Create new team option
- Visual indication of active team
- Integrates with TopHeader

#### InvitationCard (New)
Card component for displaying team invitations.

**Location:** `frontend/src/components/teams/InvitationCard.tsx`

**Props:**
```typescript
interface InvitationCardProps {
  invitation: {
    invitationId: string
    teamName: string
    teamId: string
    inviterName: string
    role: string
    invitedAt: string
  }
  onAccept: (invitationId: string) => Promise<void>
  onReject: (invitationId: string) => Promise<void>
}
```

**Features:**
- Team name and description
- Inviter information
- Role badge
- Accept/Reject buttons
- Loading states

#### MemberListItem (New)
List item component for team members.

**Location:** `frontend/src/components/teams/MemberListItem.tsx`

**Props:**
```typescript
interface MemberListItemProps {
  member: TeamMember
  currentUserId: string
  currentUserRole: 'owner' | 'administrator' | 'member'
  onRoleChange?: (userId: string, newRole: string) => Promise<void>
  onRemove?: (userId: string) => Promise<void>
}
```

**Features:**
- Member avatar (initials)
- Name and email
- Role badge
- Join date
- Role change dropdown (conditional)
- Remove button (conditional)
- Owner badge

#### InviteMemberModal (New)
Modal for inviting new team members.

**Location:** `frontend/src/components/teams/InviteMemberModal.tsx`

**Props:**
```typescript
interface InviteMemberModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  onSuccess: () => void
}
```

**Features:**
- Email input with validation
- Role selector (administrator/member)
- Submit button
- Error display
- Success feedback

#### NotificationBadge (New)
Badge component showing unread notification count.

**Location:** `frontend/src/components/notifications/NotificationBadge.tsx`

**Props:**
```typescript
interface NotificationBadgeProps {
  count: number
  onClick: () => void
}
```

**Features:**
- Red badge with count
- Hides when count is 0
- Animated appearance
- Click handler

#### NotificationItem (New)
Individual notification display component.

**Location:** `frontend/src/components/notifications/NotificationItem.tsx`

**Props:**
```typescript
interface NotificationItemProps {
  notification: Notification
  onMarkAsRead: (id: string) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAcceptInvitation?: (invitationId: string) => Promise<void>
  onRejectInvitation?: (invitationId: string) => Promise<void>
}
```

**Features:**
- Notification icon based on type
- Title and message
- Timestamp
- Read/unread indicator
- Action buttons (for invitations)
- Delete button

#### ConfirmDialog (New)
Reusable confirmation dialog component.

**Location:** `frontend/src/components/common/ConfirmDialog.tsx`

**Props:**
```typescript
interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info'
}
```

**Features:**
- Modal overlay
- Title and message
- Confirm/Cancel buttons
- Color variants for different actions
- Keyboard support (Enter/Escape)

### 5. Custom Hooks

#### useTeams (New)
Hook for accessing team context.

**Location:** `frontend/src/hooks/useTeams.ts`

```typescript
export function useTeams() {
  const context = useContext(TeamContext)
  if (!context) {
    throw new Error('useTeams must be used within TeamProvider')
  }
  return context
}
```

#### useNotifications (New)
Hook for accessing notification context.

**Location:** `frontend/src/hooks/useNotifications.ts`

```typescript
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}
```

#### useTeamPermissions (New)
Hook for checking team permissions.

**Location:** `frontend/src/hooks/useTeamPermissions.ts`

```typescript
interface TeamPermissions {
  canInviteMembers: boolean
  canRemoveMembers: boolean
  canUpdateRoles: boolean
  canUpdateTeam: boolean
  canDeleteTeam: boolean
  canCancelInvitations: boolean
}

export function useTeamPermissions(teamId: string): TeamPermissions {
  const { profile } = useUser()
  const { teams } = useTeams()

  const team = teams.find(t => t.id === teamId)
  const membership = profile?.teams.find(m => m.teamId === teamId)

  const role = membership?.role
  const isOwner = role === 'owner'
  const isAdmin = role === 'administrator'

  return {
    canInviteMembers: isOwner || isAdmin,
    canRemoveMembers: isOwner || isAdmin,
    canUpdateRoles: isOwner,
    canUpdateTeam: isOwner,
    canDeleteTeam: isOwner,
    canCancelInvitations: isOwner || isAdmin,
  }
}
```

## Data Models

### TypeScript Interfaces

**Location:** `frontend/src/types/index.ts` (extend existing)

```typescript
// Team types
export interface Team {
  id: string
  name: string
  description?: string
  ownerId: string
  status: 'active' | 'archived'
  settings?: {
    defaultPlatforms?: ('linkedin live' | 'X' | 'twitch' | 'youtube')[]
    timezone?: string
  }
  createdAt: string
  updatedAt: string
}

export interface CreateTeamData {
  name: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
}

export interface UpdateTeamData {
  name?: string
  description?: string
  settings?: {
    defaultPlatforms?: string[]
    timezone?: string
  }
}

export interface TeamMember {
  userId: string
  email: string
  name?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  invitedBy?: string
  inviterName?: string
}

export interface PendingInvitation {
  email: string
  role: 'administrator' | 'member'
  invitedBy: string
  inviterName: string
  invitedAt: string
  expiresAt: string
}

// Notification types
export interface Notification {
  id: string
  type: 'team_invitation' | 'member_added' | 'member_removed' | 'role_changed' | 'clip_processed'
  title: string
  message: string
  data?: {
    teamId?: string
    teamName?: string
    inviterName?: string
    invitationId?: string
    [key: string]: unknown
  }
  isRead: boolean
  createdAt: string
}

// User types (extend existing)
export interface UserProfile {
  email: string
  name: string
  activeTeamId: string | null
  preferences?: {
    timezone?: string
    notifications?: boolean
  }
  teams: UserTeamMembership[]
  ownedTeams: UserTeamMembership[]
  memberTeams: UserTeamMembership[]
  createdAt: string
  updatedAt: string
}

export interface UserTeamMembership {
  teamId: string
  name: string
  description?: string
  role: 'owner' | 'administrator' | 'member'
  status: 'active' | 'pending'
  joinedAt: string
  teamStatus: string
}
```

## Error Handling

### Error Types

```typescript
interface ApiError {
  status: number
  message: string
  error?: string
}
```

### Error Handling Strategy

1. **API Client Level:**
   - Catch network errors and transform to user-friendly messages
   - Handle 401 (redirect to login)
   - Handle 403 (permission denied message)
   - Handle 404 (resource not found)
   - Handle 409 (conflict - duplicate, already member, etc.)
   - Handle 422 (validation errors)

2. **Context Level:**
   - Set error state in context
   - Provide error to consuming components
   - Clear error on successful operations

3. **Component Level:**
   - Display error messages using toast notifications
   - Show inline errors for form validation
   - Provide retry options for failed operations
   - Graceful degradation for non-critical errors

4. **User Feedback:**
   - Success toasts for completed actions
   - Error toasts for failures
   - Loading states during operations
   - Confirmation dialogs for destructive actions

## Testing Strategy

### Unit Tests

1. **Context Providers:**
   - Test state management logic
   - Test API integration
   - Test error handling
   - Mock API responses

2. **Custom Hooks:**
   - Test permission calculations
   - Test state derivation
   - Test side effects

3. **Components:**
   - Test rendering with different props
   - Test user interactions
   - Test conditional rendering
   - Test form validation

### Integration Tests

1. **User Flows:**
   - Complete signup and onboarding flow
   - Team creation and member invitation flow
   - Invitation acceptance flow
   - Team switching flow
   - Member management flow

2. **API Integration:**
   - Test API client methods
   - Test error handling
   - Test response transformation

### Manual Testing Checklist

1. **Signup Flow:**
   - Register new user
   - Verify email
   - Complete onboarding
   - Accept invitation during onboarding

2. **Team Management:**
   - Create team
   - Invite members
   - Update member roles
   - Remove members
   - Leave team
   - Delete team

3. **Notifications:**
   - Receive invitation notification
   - Accept invitation
   - Reject invitation
   - Mark as read
   - Delete notification

4. **Permissions:**
   - Verify owner permissions
   - Verify administrator permissions
   - Verify member permissions
   - Verify permission denied messages

## UI/UX Considerations

### Design Principles

1. **Simplicity:** Keep interfaces clean and focused
2. **Consistency:** Use existing design patterns from the codebase
3. **Feedback:** Provide immediate feedback for all actions
4. **Clarity:** Use clear labels and helpful error messages
5. **Accessibility:** Ensure keyboard navigation and screen reader support

### Visual Design

1. **Color Scheme:**
   - Use existing Tailwind color palette
   - Primary actions: Blue
   - Destructive actions: Red
   - Success feedback: Green
   - Warning feedback: Yellow

2. **Typography:**
   - Use existing font stack
   - Clear hierarchy with heading sizes
   - Readable body text (16px minimum)

3. **Spacing:**
   - Consistent padding and margins
   - Adequate white space
   - Clear visual grouping

4. **Interactive Elements:**
   - Clear hover states
   - Disabled states for unavailable actions
   - Loading states for async operations
   - Focus indicators for keyboard navigation

### Responsive Behavior

1. **Desktop (1024px+):**
   - Multi-column layouts
   - Side-by-side forms and lists
   - Expanded navigation

2. **Tablet (768px-1023px):**
   - Adapted layouts
   - Collapsible sections
   - Touch-friendly targets

3. **Mobile (<768px):**
   - Single-column layouts
   - Hamburger menu
   - Bottom navigation
   - Full-width forms

## Security Considerations

1. **Authentication:**
   - All team operations require authentication
   - JWT tokens in Authorization header
   - Automatic redirect to login on 401

2. **Authorization:**
   - Role-based permission checks
   - Server-side validation of permissions
   - UI hides unavailable actions

3. **Data Validation:**
   - Client-side validation for UX
   - Server-side validation for security
   - Sanitize user inputs

4. **Sensitive Data:**
   - Don't log sensitive information
   - Mask email addresses where appropriate
   - Secure token storage

## Performance Optimization

1. **API Calls:**
   - Cache GET requests
   - Debounce search inputs
   - Batch operations where possible
   - Pagination for large lists

2. **React Optimization:**
   - Lazy load route components
   - Memoize expensive computations
   - Use React.memo for pure components
   - Avoid unnecessary re-renders

3. **Bundle Size:**
   - Code splitting by route
   - Tree shaking unused code
   - Minimize dependencies

4. **Loading States:**
   - Skeleton screens for content
   - Optimistic UI updates
   - Progressive loading

## Migration Strategy

### Phase 1: Core Infrastructure
1. Create new context providers (TeamContext, NotificationContext)
2. Add new API client modules (teams.ts, invitations.ts, notifications.ts)
3. Extend existing types
4. Create custom hooks

### Phase 2: Authentication Flow
1. Create SignupPage
2. Create EmailVerificationPage
3. Enhance OnboardingPage with team invitations
4. Update routing

### Phase 3: Team Management
1. Create TeamsListPage
2. Create TeamDetailPage
3. Create TeamSettingsPage
4. Create TeamMembersPage
5. Create TeamSelector component

### Phase 4: Notifications
1. Create NotificationsPage
2. Create NotificationBadge component
3. Create NotificationItem component
4. Integrate with TopHeader

### Phase 5: Profile Management
1. Create ProfilePage
2. Update user profile API integration

### Phase 6: Polish and Testing
1. Add loading states
2. Add error handling
3. Add confirmation dialogs
4. Responsive design refinements
5. Accessibility improvements
6. Integration testing

## Dependencies

### New Dependencies
None required - all functionality can be implemented with existing dependencies:
- React 19
- React Router v7
- TypeScript
- Tailwind CSS v4
- AWS Amplify (existing)

### Existing Dependencies to Leverage
- `aws-amplify/auth` for Cognito integration
- `react-router-dom` for routing
- Tailwind CSS for styling
- Existing context patterns
- Existing API client pattern

