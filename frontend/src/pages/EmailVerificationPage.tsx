import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { confirmSignUp, resendSignUpCode } from 'aws-amplify/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuth } from '../hooks/useAuth'
import { mapAuthError } from '../utils/authErrors'

function EmailVerificationPage() {
  usePageTitle('Verify Email')
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()

  const emailFromState = (location.state as { email?: string })?.email || ''

  const [email] = useState(emailFromState)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resendSuccess, setResendSuccess] = useState(false)

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/')
    }
  }, [isAuthenticated, navigate])

  useEffect(() => {
    if (!email) {
      navigate('/signup')
    }
  }, [email, navigate])

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6)
    setCode(value)
    setCodeError(null)
    setError(null)
    setResendSuccess(false)
  }

  const validateCode = (code: string): boolean => {
    if (!code) {
      setCodeError('Verification code is required')
      return false
    }

    if (code.length !== 6) {
      setCodeError('Verification code must be 6 digits')
      return false
    }

    return true
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setCodeError(null)
    setResendSuccess(false)

    if (!validateCode(code)) {
      return
    }

    setLoading(true)

    try {
      await confirmSignUp({
        username: email,
        confirmationCode: code,
      })
      navigate('/onboarding')
    } catch (err: any) {
      console.error('Verification error:', err)
      const errorMessage = mapAuthError(err)

      if (err.name === 'CodeMismatchException') {
        setCodeError('Invalid verification code. Please try again.')
      } else if (err.name === 'ExpiredCodeException') {
        setError('Verification code has expired. Please request a new code.')
      } else {
        setError(errorMessage)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError(null)
    setCodeError(null)
    setResendSuccess(false)
    setResending(true)

    try {
      await resendSignUpCode({
        username: email,
      })
      setResendSuccess(true)
      setCode('')
    } catch (err: any) {
      console.error('Resend code error:', err)
      setError(mapAuthError(err))
    } finally {
      setResending(false)
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
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-[var(--color-text-primary)]">Verify Your Email</h1>
          <p className="text-[var(--color-text-secondary)] mt-2">
            We sent a verification code to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="bg-[var(--color-surface)] rounded-xl shadow-md p-8 animate-slideUp border border-[var(--color-border)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={handleCodeChange}
                className={`w-full px-4 py-3 bg-[var(--color-surface)] border rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] transition-colors duration-[var(--duration-fast)] text-center text-2xl tracking-widest text-[var(--color-text-primary)] ${
                  codeError
                    ? 'border-[var(--color-error)]'
                    : 'border-[var(--color-border)]'
                }`}
                placeholder="000000"
                maxLength={6}
                disabled={loading || resending}
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'code-error' : undefined}
                autoComplete="one-time-code"
              />
              {codeError && (
                <p id="code-error" className="mt-2 text-sm text-[var(--color-error)]" role="alert">
                  {codeError}
                </p>
              )}
              <p className="mt-2 text-sm text-[var(--color-text-muted)]">
                Enter the 6-digit code from your email
              </p>
            </div>

            {resendSuccess && (
              <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-success)] rounded-lg animate-slideDown">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--color-success)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--color-text-primary)]" role="status">
                    Verification code sent! Please check your email.
                  </p>
                </div>
              </div>
            )}

            {error && (
              <div className="p-4 bg-[var(--color-surface-raised)] border border-[var(--color-error)] rounded-lg animate-slideDown">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-[var(--color-error)] flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-[var(--color-text-primary)]" role="alert">
                    {error}
                  </p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resending}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-[var(--color-text-on-accent)] font-semibold py-3 px-4 rounded-lg transition-colors duration-[var(--duration-fast)] focus:outline-none focus:ring-2 focus:ring-[var(--color-focus)] focus:ring-offset-2 focus:ring-offset-[var(--color-background)] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-[var(--color-text-on-accent)] border-t-transparent rounded-full animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                'Verify Email'
              )}
            </button>
          </form>

          <div className="mt-6 text-center space-y-3">
            <button
              type="button"
              onClick={handleResendCode}
              disabled={loading || resending}
              className="text-sm text-[var(--color-accent)] hover:text-[var(--color-accent-hover)] font-medium transition-colors duration-[var(--duration-fast)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-[var(--color-accent)] border-t-transparent rounded-full animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                "Didn't receive the code? Resend"
              )}
            </button>

            <div>
              <Link
                to="/signup"
                className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors duration-[var(--duration-fast)]"
              >
                Back to sign up
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmailVerificationPage
