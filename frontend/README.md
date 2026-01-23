# Livestream Post-Production Platform - Frontend

Modern React-based web application for managing livestream episodes and post-production workflows.

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for styling
- **AWS Amplify** for Cognito authentication
- **React Router v6** for routing
- **React Hook Form** for form management
- **Zod** for validation

## Project Structure

```
src/
├── api/              # API client and service modules
├── components/       # React components
│   ├── auth/        # Authentication components
│   ├── common/      # Reusable UI components
│   ├── dashboard/   # Dashboard components
│   ├── episodes/    # Episode management components
│   ├── onboarding/  # Onboarding flow components
│   └── layout/      # Layout components
├── contexts/        # React Context providers
├── hooks/           # Custom React hooks
├── pages/           # Page components
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── aws-exports.ts   # AWS Amplify configuration
├── App.tsx          # Main App component
└── main.tsx         # Application entry point
```

## Getting Started

### Prerequisites

- Node.js 20.19+ or 22.12+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy the environment variables template:
```bash
cp .env.example .env
```

3. Update `.env` with your configuration:
```env
VITE_API_URL=https://your-api-url.com/api
VITE_USER_POOL_ID=your-user-pool-id
VITE_USER_POOL_CLIENT_ID=your-client-id
VITE_USER_POOL_DOMAIN=your-cognito-domain
VITE_REDIRECT_SIGN_IN=http://localhost:5173
VITE_REDIRECT_SIGN_OUT=http://localhost:5173
VITE_REGION=us-east-1
```

### Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

### Build

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```

### Linting

Run ESLint:
```bash
npm run lint
```

#### Color Usage Rules

The project enforces strict rules against hardcoded colors to maintain theme consistency and enable future theme toggling. ESLint will fail if you use:

1. **Tailwind color utilities** (e.g., `text-gray-500`, `bg-blue-600`, `border-red-400`)
   - ❌ Bad: `className="text-gray-500 bg-blue-600"`
   - ✅ Good: `className="text-[var(--color-text-primary)] bg-[var(--color-surface)]"`

2. **Absolute colors** (e.g., `text-white`, `bg-black`)
   - ❌ Bad: `className="text-white bg-black"`
   - ✅ Good: `className="text-[var(--color-text-on-accent)] bg-[var(--color-background)]"`

3. **Arbitrary color values** (e.g., `bg-[#3B82F6]`, `text-[rgb(59,130,246)]`)
   - ❌ Bad: `className="bg-[#3B82F6] text-[rgb(59,130,246)]"`
   - ✅ Good: `className="bg-[var(--color-accent)] text-[var(--color-text-primary)]"`

4. **Inline style colors** (e.g., `style={{ color: '#000', backgroundColor: '#fff' }}`)
   - ❌ Bad: `style={{ color: '#000', backgroundColor: '#fff' }}`
   - ✅ Good: `style={{ color: 'var(--color-text-primary)', backgroundColor: 'var(--color-surface)' }}`

**Available CSS Variables:**
- Surface: `--color-background`, `--color-surface`, `--color-surface-raised`, `--color-border`
- Text: `--color-text-primary`, `--color-text-secondary`, `--color-text-muted`, `--color-text-disabled`
- Accent: `--color-accent`, `--color-accent-hover`, `--color-accent-subtle`
- Semantic: `--color-success`, `--color-warning`, `--color-error`, `--color-info`

See `src/index.css` for the complete list of available CSS variables.

**CI Integration:**
The lint check runs automatically in the CI pipeline on all pull requests. Any hardcoded colors will cause the build to fail, ensuring theme consistency across the codebase.

## Design System

### Colors

- **Primary**: `#5B8C5A` (sage green)
- **Primary Light**: `#7BA879`
- **Primary Dark**: `#4A7349`
- **Accent**: `#E6F3D4` (light sage)

### Tailwind Classes

Use the custom color classes in your components:
- `bg-primary` - Primary background color
- `text-primary` - Primary text color
- `bg-accent` - Accent background color
- `border-primary` - Primary border color

## Authentication

The application uses AWS Cognito for authentication via AWS Amplify. All routes except the login page are protected and require authentication.

## API Integration

API calls are made through service modules in the `src/api/` directory:
- `episodesApi` - Episode management
- `usersApi` - User profile management
- `teamsApi` - Team management

All API calls automatically include authentication tokens and handle common error scenarios.

## Contributing

1. Follow the existing code structure and patterns
2. Use TypeScript for type safety
3. Follow the Tailwind CSS utility-first approach
4. Ensure all components are responsive
5. Test authentication flows thoroughly

## License

Proprietary - All rights reserved
