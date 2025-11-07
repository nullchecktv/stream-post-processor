import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { ProfileGuard } from './components/auth/ProfileGuard'
import { PageLayout } from './components/layout'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EpisodeDetailPage = lazy(() => import('./pages/EpisodeDetailPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <UserProvider>
            <SidebarProvider>
              <ToastProvider>
                <Suspense fallback={<LoadingSpinner variant="page" />}>
                  <Routes>
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                    <Route element={<AuthGuard />}>
                      <Route path="/onboarding" element={<OnboardingPage />} />
                      <Route element={<ProfileGuard />}>
                        <Route element={<PageLayout />}>
                          <Route path="/" element={<Dashboard />} />
                          <Route path="/episodes/:id" element={<EpisodeDetailPage />} />
                          <Route path="*" element={<NotFoundPage />} />
                        </Route>
                      </Route>
                    </Route>
                  </Routes>
                </Suspense>
              </ToastProvider>
            </SidebarProvider>
          </UserProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
