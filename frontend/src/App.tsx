import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
import { TeamProvider } from './contexts/TeamContext'
import { ActivityProvider } from './contexts/ActivityContext'
import { UploadProvider } from './contexts/UploadContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ToastProvider } from './contexts/ToastContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { ProfileGuard } from './components/auth/ProfileGuard'
import { TeamGuard } from './components/auth/TeamGuard'
import { PageLayout } from './components/layout'
import { EpisodeLayout } from './components/episodes/EpisodeLayout'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { ErrorBoundary } from './components/common/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EpisodesListPage = lazy(() => import('./pages/EpisodesListPage'))
const EpisodeOverviewPage = lazy(() => import('./pages/EpisodeOverviewPage'))
const EpisodeDetailsPage = lazy(() => import('./pages/EpisodeDetailsPage'))
const EpisodeContentPage = lazy(() => import('./pages/EpisodeContentPage'))
const EpisodeClipsPage = lazy(() => import('./pages/EpisodeClipsPage'))
const TeamsListPage = lazy(() => import('./pages/TeamsListPage'))
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'))
const TeamSettingsPage = lazy(() => import('./pages/TeamSettingsPage'))
const TeamMembersPage = lazy(() => import('./pages/TeamMembersPage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage').then(m => ({ default: m.ActivityPage })))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <UserProvider>
              <TeamProvider>
                <ActivityProvider>
                  <UploadProvider>
                    <SidebarProvider>
                    <Suspense fallback={<LoadingSpinner variant="page" />}>
                      <Routes>
                        <Route path="/login" element={<LoginPage />} />
                        <Route path="/signup" element={<SignupPage />} />
                        <Route path="/verify-email" element={<EmailVerificationPage />} />
                        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                        <Route element={<AuthGuard />}>
                          <Route path="/onboarding" element={<OnboardingPage />} />
                          <Route element={<ProfileGuard />}>
                            <Route element={<PageLayout />}>
                              <Route path="/" element={<Dashboard />} />
                              <Route path="/teams" element={<TeamsListPage />} />
                              <Route path="/activity" element={<ActivityPage />} />
                              <Route path="/profile" element={<ProfilePage />} />
                              <Route element={<TeamGuard />}>
                                <Route path="/episodes" element={<EpisodesListPage />} />
                                <Route path="/episodes/:id" element={<EpisodeLayout />}>
                                  <Route path="overview" element={<EpisodeOverviewPage />} />
                                  <Route path="details" element={<EpisodeDetailsPage />} />
                                  <Route path="uploads" element={<EpisodeContentPage />} />
                                  <Route path="clips" element={<EpisodeClipsPage />} />
                                </Route>
                                <Route path="/teams/:teamId" element={<TeamDetailPage />} />
                                <Route path="/teams/:teamId/settings" element={<TeamSettingsPage />} />
                                <Route path="/teams/:teamId/members" element={<TeamMembersPage />} />
                              </Route>
                              <Route path="*" element={<NotFoundPage />} />
                            </Route>
                          </Route>
                        </Route>
                      </Routes>
                    </Suspense>
                    </SidebarProvider>
                  </UploadProvider>
                </ActivityProvider>
              </TeamProvider>
            </UserProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
