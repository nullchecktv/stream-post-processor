import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'
import { mapAuthError } from '../utils/authErrors'

function LoginPage() {
  usePageTitle('Sign In')
  const navigate = useNavigate()
  const { signIn: authSignIn, isAuthenticated } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setEmailError(null)
    setError(null)
  }

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value)
    setPasswordError(null)
    setError(null)
  }

  const validateEmail = (email: string): boolean => {
    if (!email) {
      setEmailError('Email is required')
      return false
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      setEmailError('Please enter a valid email address')
      return false
    }

    return true
  }

  const validatePassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required')
      return false
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setPasswordError(null)

    const isEmailValid = validateEmail(email)
    const isPasswordValid = validatePassword(password)

    if (!isEmailValid || !isPasswordValid) {
      return
    }

    setLoading(true)

    try {
      await authSignIn(email, password)
      navigate('/')
    } catch (err: any) {
      console.error('Authentication error:', err)
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-slideDown">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[var(--color-accent)] rounded-xl mb-4">
            <svg
              className="w-10 h-10 text-[var(--color-text-on-accent)]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Encore</h1>
          <p className="text-[var(--color-text-secondary)] mt-2">Transform your livestreams into engaging clips</p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl shadow-md p-8 animate-slideUp">
          <h2 className="text-2xl font-semibold text-[var(--color-text-primary)] mb-6">Sign In</h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                className={`w-full px-4 py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-background)] transition-colors ${
                  emailError
                    ? 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]'
                    : 'border-[var(--color-border)] focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)]'
                }`}
                placeholder="you@example.com"
                disabled={loading}
                aria-invalid={!!emailError}
                aria-describedby={emailError ? 'email-error' : undefined}
              />
              {emailError && (
                <p id="email-error" className="mt-2 text-sm text-[var(--color-error)]" role="alert">
                  {emailError}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={handlePasswordChange}
                className={`w-full px-4 py-3 bg-[var(--color-surface)] text-[var(--color-text-primary)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[var(--color-background)] transition-colors ${
                  passwordError
                    ? 'border-[var(--color-error)] focus:ring-[var(--color-error)] focus:border-[var(--color-error)]'
                    : 'border-[var(--color-border)] focus:ring-[var(--color-focus)] focus:border-[var(--color-focus)]'
                }`}
                placeholder="Enter your password"
                disabled={loading}
                aria-invalid={!!passwordError}
                aria-describedby={passwordError ? 'password-error' : undefined}
              />
              {passwordError && (
                <p id="password-error" className="mt-2 text-sm text-[var(--color-error)]" role="alert">
                  {passwordError}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm">
                <button
                  type="button"
                  onClick={() => navigate('/forgot-password')}
                  className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            </div>

            {error && (
              <div className="p-4 bg-[var(--color-error)] bg-opacity-10 border border-[var(--color-error)] rounded-lg animate-slideDown">
                <p className="text-sm text-[var(--color-error)]" role="alert">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)] font-semibold py-3 px-4 rounded-lg transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--color-text-on-accent)] border-t-transparent rounded-full animate-spin mr-2" />
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors cursor-pointer"
              >
                Sign up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage

