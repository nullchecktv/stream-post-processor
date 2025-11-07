# Design Document

## Overview

This design implements a custom branded login page that replaces the Cognito hosted UI, using AWS Amplify's direct authentication APIs. The solution eliminates redirect loops by using username/password authentication directly instead of OAuth redirects, while providing a polished, branded user experience.

## Architecture

### Authentication Flow

```
User → Login Page → Amplify signIn() → Cognito → Auth Tokens → AuthContext → Dashboard
                         ↓
                    Error Handling → Display Error Message
```

### Component Structure

```
LoginPage
├── LoginForm
│   ├── EmailInput
│   ├── PasswordInput
│   ├── SignInButton
│   └── ForgotPasswordLink
└── BrandingElements
    ├── Logo
    ├── AppName
    └── Tagline

ForgotPasswordPage
├── RequestCodeForm
│   ├── EmailInput
│   └── SendCodeButton
└── ResetPasswordForm
    ├── CodeInput
    ├── NewPasswordInput
    ├── ConfirmPasswordInput
    └── ResetButton
```

## Components and Interfaces

### LoginPage Component

**Location**: `frontend/src/pages/LoginPage.tsx`

**Purpose**: Main login page that handles user authentication

**Props**: None (uses routing)

**State**:
```typescript
interface LoginState {
  email: string
  password: string
  loading: boolean
  error: string | null
}
```

**Key Functions**:
- `handleSubmit()`: Processes login form submission
- `handleEmailChange()`: Updates email state with validation
- `handlePasswordChange()`: Updates password state
- `navigateToForgotPassword()`: Redirects to password reset flow

### ForgotPasswordPage Component

**Location**: `frontend/src/pages/ForgotPasswordPage.tsx`

**Purpose**: Handles password reset flow

**State**:
```typescript
interface ForgotPasswordState {
  step: 'request' | 'reset'
  email: string
  code: string
  newPassword: string
  confirmPassword: string
  loading: boolean
  error: string | null
}
```

**Key Functions**:
- `handleRequestCode()`: Sends password reset code to email
- `handleResetPassword()`: Completes password reset with code
- `handleResendCode()`: Resends verification code

### Authentication Service Updates

**Location**: `frontend/src/contexts/AuthContext.tsx`

**Changes**:
- Remove OAuth redirect configuration
- Add direct signIn support
- Improve error handling for authentication failures

**New Functions**:
```typescript
signIn(email: string, password: string): Promise<void>
resetPassword(email: string): Promise<void>
confirmResetPassword(email: string, code: string, newPassword: string): Promise<void>
```

### Route Configuration Updates

**Location**: `frontend/src/App.tsx`

**Changes**:
- Add `/login` route (public)
- Add `/forgot-password` route (public)
- Update AuthGuard to redirect to `/login` instead of using signInWithRedirect
- Ensure authenticated users bypass login page

## Data Models

### Login Form Data

```typescript
interface LoginFormData {
  email: string
  password: string
}
```

### Password Reset Request

```typescript
interface PasswordResetRequest {
  email: string
}
```

### Password Reset Confirmation

```typescript
interface PasswordResetConfirmation {
  email: string
  code: string
  newPassword: string
}
```

### Authentication Error

```typescript
interface AuthError {
  code: string
  message: string
  name: string
}
```

## Error Handling

### Authentic Errors

**Error Mapping**:
```typescript
const errorMessages: Record<string, string> = {
  'UserNotFoundException': 'Invalid email or password',
  'NotAuthorizedException': 'Invalid email or password',
  'UserNotConfirmedException': 'Please verify your email address',
  'PasswordResetRequiredException': 'Password reset required',
  'TooManyRequestsException': 'Too many attempts. Please try again later',
  'NetworkError': 'Unable to connect. Please check your internet connection',
  'InvalidParameterException': 'Please check your input and try again',
  'CodeMismatchException': 'Invalid verification code',
  'ExpiredCodeException': 'Verification code has expired',
  'LimitExceededException': 'Too many attempts. Please try again later'
}
```

### Error Display Strategy

- Display errors inline below the relevant form field
- Use red color (#EF4444) for error text
- Clear errors when user starts typing
- Provide actionable error messages
- Log detailed errors to console for debugging

## Testing Strategy

### Unit Tests

**Login Form Validation**:
- Test email format validation
- Test password requirements
- Test form submission with valid data
- Test form submission with invalid data
- Test error message display

**Authentication Flow**:
- Mock Amplify signIn success
- Mock Amplify signIn failure scenarios
- Test AuthContext state updates
- Test navigation after successful login
- Test error handling for network failures

**Password Reset Flow**:
- Test code request with valid email
- Test code request with invalid email
- Test password reset with valid code
- Test password reset with invalid code
- Test password validation

### Integration Tests

**End-to-End Login Flow**:
- Navigate to login page
- Enter valid credentials
- Verify redirect to dashboard
- Verify AuthContext is updated

**End-to-End Password Reset**:
- Navigate to forgot password page
- Request reset code
- Enter code and new password
- Verify redirect to login page
- Verify ability to login with new password

### Manual Testing Checklist

- [ ] Login with valid credentials succeeds
- [ ] Login with invalid credentials shows error
- [ ] Forgot password sends code to email
- [ ] Password reset with valid code succeeds
- [ ] Form validation works correctly
- [ ] Loading states display properly
- [ ] Error messages are clear and helpful
- [ ] Responsive design works on mobile
- [ ] Keyboard navigation works
- [ ] Screen reader accessibility works

## UI/UX Design

### Visual Design

**Color Palette**:
- Primary: #3B82F6 (Blue)
- Primary Hover: #2563EB
- Error: #EF4444
- Success: #10B981
- Background: #FFFFFF
- Text: #1F2937
- Text Secondary: #6B7280
- Border: #E5E7EB

**Typography**:
- Headings: Inter, sans-serif, 600 weight
- Body: Inter, sans-serif, 400 weight
- Input: Inter, sans-serif, 400 weight

**Spacing**:
- Form fields: 1rem (16px) vertical spacing
- Sections: 2rem (32px) vertical spacing
- Page padding: 1.5rem (24px) on mobile, 2rem (32px) on desktop

### Layout Structure

**Login Page Layout**:
```
┌─────────────────────────────────────┐
│                                     │
│            [Logo]                   │
│         App Name                    │
│         Tagline                     │
│                                     │
│  ┌───────────────────────────────┐ │
│  │  Email                        │ │
│  │  [___________________]        │ │
│  │                               │ │
│  │  Password                     │ │
│  │  [___________________]        │ │
│  │                               │ │
│  │  [Forgot Password?]           │ │
│  │                               │ │
│  │  [    Sign In Button    ]    │ │
│  └───────────────────────────────┘ │
│                                     │
└─────────────────────────────────────┘
```

**Responsive Behavior**:
- Mobile (< 768px): Full-width form with 1.5rem padding
- Tablet (768px - 1024px): Centered form with max-width 400px
- Desktop (> 1024px): Centered form with max-width 400px

### Interaction Design

**Form Interactions**:
- Focus states: Blue border (#3B82F6) with subtle shadow
- Hover states: Slightly darker button color
- Disabled states: Gray background with reduced opacity
- Loading states: Spinner icon in button with disabled state

**Transitions**:
- Button hover: 150ms ease
- Input focus: 150ms ease
- Error message fade-in: 200ms ease

**Accessibility**:
- All inputs have associated labels
- Error messages linked to inputs via aria-describedby
- Loading states announced to screen readers
- Keyboard focus visible with outline
- Tab order follows logical flow

## Implementation Notes

### Amplify Configuration Changes

**Remove OAuth Configuration**:
```typescript
// Remove from aws-exports.ts
loginWith: {
  oauth: {
    // Remove this entire section
  }
}
```

**Keep Basic Configuration**:
```typescript
const awsconfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID,
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID,
    },
  },
};
```

### AuthGuard Changes

**Current Behavior** (causes redirect loop):
```typescript
useEffect(() => {
  if (!loading && !isAuthenticated) {
    signInWithRedirect() // This causes the loop
  }
}, [isAuthenticated, loading])
```

**New Behavior**:
```typescript
useEffect(() => {
  if (!loading && !isAuthenticated) {
    navigate('/login') // Simple navigation to custom login page
  }
}, [isAuthenticated, loading, navigate])
```

### Form Validation Rules

**Email Validation**:
- Required field
- Must match email format regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Display error: "Please enter a valid email address"

**Password Validation** (Login):
- Required field
- Minimum 8 characters
- Display error: "Password is required"

**Password Validation** (Reset):
- Required field
- Minimum 8 characters
- Must contain uppercase letter
- Must contain lowercase letter
- Must contain number
- Must contain special character
- Display error: "Password must be at least 8 characters and include uppercase, lowercase, number, and special character"

**Confirm Password Validation**:
- Must match new password
- Display error: "Passwords do not match"

### Security Considerations

**Password Handling**:
- Never log passwords
- Clear password fields after failed attempts
- Use type="password" for password inputs
- Implement rate limiting through Cognito

**Token Management**:
- Amplify handles token storage securely
- Tokens stored in browser's secure storage
- Automatic token refresh handled by Amplify
- Tokens cleared on sign out

**HTTPS Requirement**:
- All authentication must occur over HTTPS in production
- Local development can use HTTP

## Performance Considerations

**Code Splitting**:
- Login page loaded separately from main application bundle
- Reduces initial bundle size for authenticated users

**Lazy Loading**:
- ForgotPasswordPage loaded only when needed
- Reduces initial page load time

**Form Optimization**:
- Debounce validation to avoid excessive re-renders
- Memoize error messages to prevent unnecessary updates
- Use controlled inputs efficiently

## Migration Strategy

**Phase 1: Implement Custom Login**
1. Create LoginPage component
2. Create ForgotPasswordPage component
3. Update AuthContext with signIn methods
4. Add routes for login and forgot password

**Phase 2: Update AuthGuard**
1. Change redirect behavior from signInWithRedirect to navigate('/login')
2. Test authentication flow
3. Verify no redirect loops occur

**Phase 3: Remove OAuth Configuration**
1. Remove OAuth config from aws-exports.ts
2. Update Cognito app client settings if needed
3. Test authentication still works

**Phase 4: Testing and Deployment**
1. Run unit tests
2. Run integration tests
3. Manual testing on all devices
4. Deploy to production

## Rollback Plan

If issues occur after deployment:
1. Revert AuthGuard to use signInWithRedirect
2. Restore OAuth configuration in aws-exports.ts
3. Hide custom login routes
4. Investigate and fix issues
5. Redeploy when ready

## Future Enhancements

**Potential Additions** (not in current scope):
- Social login (Google, GitHub)
- Remember me functionality
- Biometric authentication
- Multi-factor authentication UI
- Account registration flow
- Email verification flow

