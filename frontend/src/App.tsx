import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { UserProvider } from './contexts/UserContext'
import { TeamProvider } from './contexts/TeamContext'
import { ActivityProvider } from './contexts/ActivityContext'
import { UploadProvider } from './contexts/UploadContext'
import { SidebarProvider } from './contexts/SidebarContext'
import { ToastProvider } from './contexts/ToastContext'
import { NotificationProvider } from './contexts/NotificationContext'
import { AuthGuard } from './components/auth/AuthGuard'
import { ProfileGuard } from './components/auth/ProfileGuard'
import { TeamGuard } from './components/auth/TeamGuard'
import { PageLayout } from './components/layout'
import { EpisodeLayout } from './components/episodes/EpisodeLayout'
import { TeamLayout } from './components/teams/TeamLayout'
import { LoadingSpinner } from './components/common/LoadingSpinner'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { TeamSwitchingOverlay } from './components/common/TeamSwitchingOverlay'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const EmailVerificationPage = lazy(() => import('./pages/EmailVerificationPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const OnboardingPage = lazy(() => import('./pages/OnboardingPage'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const EpisodesListPage = lazy(() => import('./pages/EpisodesListPage'))
const EpisodeOverviewPage = lazy(() => import('./pages/EpisodeOverviewPage'))
const EpisodePlanPage = lazy(() => import('./pages/EpisodePlanPage'))
const EpisodeContentPage = lazy(() => import('./pages/EpisodeContentPage'))
const EpisodeClipsPage = lazy(() => import('./pages/EpisodeClipsPage'))
const EpisodeQuotesPage = lazy(() => import('./pages/EpisodeQuotesPage'))
const ClipDetailPage = lazy(() => import('./pages/ClipDetailPage'))
const BlogPage = lazy(() => import('./pages/BlogPage'))
const QuoteDetailPage = lazy(() => import('./pages/QuoteDetailPage'))
const TeamsListPage = lazy(() => import('./pages/TeamsListPage'))
const TeamDetailPage = lazy(() => import('./pages/TeamDetailPage'))
const TeamGeneralSettingsPage = lazy(() => import('./pages/TeamGeneralSettingsPage'))
const TeamBrandingSettingsPage = lazy(() => import('./pages/TeamBrandingSettingsPage'))
const TeamWritingSettingsPage = lazy(() => import('./pages/TeamWritingSettingsPage'))
const TeamMembersPage = lazy(() => import('./pages/TeamMembersPage'))
const ActivityPage = lazy(() => import('./pages/ActivityPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <UserProvider>
              <NotificationProvider>
                <TeamProvider>
                  <ActivityProvider>
                    <UploadProvider>
                      <SidebarProvider>
                    <TeamSwitchingOverlay />
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
                              <Route path="/episodes" element={<EpisodesListPage />} />
                              <Route path="/episodes/:id" element={<EpisodeLayout />}>
                                <Route path="overview" element={<EpisodeOverviewPage />} />
                                <Route path="plan" element={<EpisodePlanPage />} />
                                <Route path="uploads" element={<EpisodeContentPage />} />
                                <Route path="clips" element={<EpisodeClipsPage />} />
                                <Route path="blog" element={<BlogPage />} />
                                <Route path="quotes" element={<EpisodeQuotesPage />} />
                              </Route>
                              <Route path="/episodes/:episodeId/clips/:clipId" element={<ClipDetailPage />} />
                              <Route path="/episodes/:episodeId/quotes/:quoteId" element={<QuoteDetailPage />} />
                              <Route element={<TeamGuard />}>
                                <Route path="/teams/:teamId" element={<TeamDetailPage />} />
                                <Route path="/teams/:teamId/settings" element={<TeamLayout />}>
                                  <Route path="general" element={<TeamGeneralSettingsPage />} />
                                  <Route path="branding" element={<TeamBrandingSettingsPage />} />
                                  <Route path="writing" element={<TeamWritingSettingsPage />} />
                                </Route>
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
              </NotificationProvider>
            </UserProvider>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
