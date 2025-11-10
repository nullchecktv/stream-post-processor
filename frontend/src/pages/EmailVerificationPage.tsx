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
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-6 py-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-slideDown">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-xl mb-4">
            <svg
              className="w-10 h-10 text-white"
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
          <h1 className="text-3xl font-bold text-gray-900">Verify Your Email</h1>
          <p className="text-gray-600 mt-2">
            We sent a verification code to <span className="font-medium">{email}</span>
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 animate-slideUp">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={code}
                onChange={handleCodeChange}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors text-center text-2xl tracking-widest ${
                  codeError
                    ? 'border-error focus:ring-error focus:border-error'
                    : 'border-gray-300 focus:ring-primary focus:border-primary'
                }`}
                placeholder="000000"
                maxLength={6}
                disabled={loading || resending}
                aria-invalid={!!codeError}
                aria-describedby={codeError ? 'code-error' : undefined}
                autoComplete="one-time-code"
              />
              {codeError && (
                <p id="code-error" className="mt-2 text-sm text-error" role="alert">
                  {codeError}
                </p>
              )}
              <p className="mt-2 text-sm text-gray-500">
                Enter the 6-digit code from your email
              </p>
            </div>

            {resendSuccess && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg animate-slideDown">
                <p className="text-sm text-green-700" role="status">
                  Verification code sent! Please check your email.
                </p>
              </div>
            )}

            {error && (
              <div className="p-4 bg-error bg-opacity-10 border border-error rounded-lg animate-slideDown">
                <p className="text-sm text-error" role="alert">
                  {error}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || resending}
              className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px]"
              style={{ backgroundColor: '#5B8C5A', color: '#ffffff' }}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
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
              className="text-sm text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {resending ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mr-1" />
                  Sending...
                </>
              ) : (
                "Didn't receive the code? Resend"
              )}
            </button>

            <div>
              <Link
                to="/signup"
                className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
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
