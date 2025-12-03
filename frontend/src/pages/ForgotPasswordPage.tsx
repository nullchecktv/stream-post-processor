import { useState, type FormEvent, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { resetPassword, confirmResetPassword } from 'aws-amplify/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { mapAuthError, getPasswordRequirements } from '../utils/authErrors'

type Step = 'request' | 'reset'

function ForgotPasswordPage() {
  usePageTitle('Reset Password')
  const navigate = useNavigate()

  const [step, setStep] = useState<Step>('request')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | null>(null)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value)
    setEmailError(null)
    setError(null)
  }

  const handleCodeChange = (e: ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value)
    setCodeError(null)
    setError(null)
  }

  const handleNewPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setNewPassword(e.target.value)
    setPasswordError(null)
    setError(null)
  }

  const handleConfirmPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value)
    setConfirmPasswordError(null)
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

  const validateCode = (code: string): boolean => {
    if (!code) {
      setCodeError('Verification code is required')
      return false
    }

    return true
  }

  const validateNewPassword = (password: string): boolean => {
    if (!password) {
      setPasswordError('Password is required')
      return false
    }

    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters')
      return false
    }

    const hasUppercase = /[A-Z]/.test(password)
    const hasLowercase = /[a-z]/.test(password)
    const hasNumber = /[0-9]/.test(password)
    const hasSpecial = /[^A-Za-z0-9]/.test(password)

    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      setPasswordError(getPasswordRequirements())
      return false
    }

    return true
  }

  const validateConfirmPassword = (password: string, confirmPassword: string): boolean => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password')
      return false
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match')
      return false
    }

    return true
  }

  const handleRequestCode = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setEmailError(null)
    setSuccessMessage(null)

    if (!validateEmail(email)) {
      return
    }

    setLoading(true)

    try {
      await resetPassword({ username: email })
      setSuccessMessage('Verification code sent to your email')
      setStep('reset')
    } catch (err: any) {
      console.error('Reset password error:', err)
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    setCodeError(null)
    setPasswordError(null)
    setConfirmPasswordError(null)
    setSuccessMessage(null)

    const isCodeValid = validateCode(code)
    const isPasswordValid = validateNewPassword(newPassword)
    const isConfirmPasswordValid = validateConfirmPassword(newPassword, confirmPassword)

    if (!isCodeValid || !isPasswordValid || !isConfirmPasswordValid) {
      return
    }

    setLoading(true)

    try {
      await confirmResetPassword({
        username: email,
        confirmationCode: code,
        newPassword,
      })
      setSuccessMessage('Password reset successful! Redirecting to login...')
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (err: any) {
      console.error('Confirm reset password error:', err)
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  const handleResendCode = async () => {
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    try {
      await resetPassword({ username: email })
      setSuccessMessage('Verification code resent to your email')
    } catch (err: any) {
      console.error('Resend code error:', err)
      setError(mapAuthError(err))
    } finally {
      setLoading(false)
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
                d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Encore</h1>
          <p className="text-gray-600 mt-2">Transform your livestreams into engaging clips</p>
        </div>

        <div className="bg-white rounded-xl shadow-md p-8 animate-slideUp">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Reset Password</h2>

          {step === 'request' ? (
            <form onSubmit={handleRequestCode} className="space-y-6">
              <p className="text-sm text-gray-600">
                Enter your email address and we'll send you a verification code to reset your
                password.
              </p>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={handleEmailChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    emailError
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-gray-300 focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="you@example.com"
                  disabled={loading}
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? 'email-error' : undefined}
                />
                {emailError && (
                  <p id="email-error" className="mt-2 text-sm text-error" role="alert">
                    {emailError}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-error bg-opacity-10 border border-error rounded-lg animate-slideDown">
                  <p className="text-sm text-error" role="alert">
                    {error}
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-success bg-opacity-10 border border-success rounded-lg animate-slideDown">
                  <p className="text-sm text-success" role="status">
                    {successMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Sending code...
                  </>
                ) : (
                  'Send verification code'
                )}
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="text-sm text-primary hover:text-primary-dark font-medium transition-colors"
                >
                  Back to sign in
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-6">
              <p className="text-sm text-gray-600">
                Enter the verification code sent to <strong>{email}</strong> and your new password.
              </p>

              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={handleCodeChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    codeError
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-gray-300 focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="Enter verification code"
                  disabled={loading}
                  aria-invalid={!!codeError}
                  aria-describedby={codeError ? 'code-error' : undefined}
                />
                {codeError && (
                  <p id="code-error" className="mt-2 text-sm text-error" role="alert">
                    {codeError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Password
                </label>
                <input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    passwordError
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-gray-300 focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="Enter new password"
                  disabled={loading}
                  aria-invalid={!!passwordError}
                  aria-describedby={passwordError ? 'password-error' : undefined}
                />
                {passwordError && (
                  <p id="password-error" className="mt-2 text-sm text-error" role="alert">
                    {passwordError}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={handleConfirmPasswordChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                    confirmPasswordError
                      ? 'border-error focus:ring-error focus:border-error'
                      : 'border-gray-300 focus:ring-primary focus:border-primary'
                  }`}
                  placeholder="Confirm new password"
                  disabled={loading}
                  aria-invalid={!!confirmPasswordError}
                  aria-describedby={confirmPasswordError ? 'confirm-password-error' : undefined}
                />
                {confirmPasswordError && (
                  <p id="confirm-password-error" className="mt-2 text-sm text-error" role="alert">
                    {confirmPasswordError}
                  </p>
                )}
              </div>

              {error && (
                <div className="p-4 bg-error bg-opacity-10 border border-error rounded-lg animate-slideDown">
                  <p className="text-sm text-error" role="alert">
                    {error}
                  </p>
                </div>
              )}

              {successMessage && (
                <div className="p-4 bg-success bg-opacity-10 border border-success rounded-lg animate-slideDown">
                  <p className="text-sm text-success" role="status">
                    {successMessage}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Resetting password...
                  </>
                ) : (
                  'Reset password'
                )}
              </button>

              <div className="text-center space-y-2">
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={loading}
                  className="text-sm text-primary hover:text-primary-dark font-medium transition-colors disabled:opacity-50"
                >
                  Resend verification code
                </button>
                <div>
                  <button
                    type="button"
                    onClick={() => navigate('/login')}
                    className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
                  >
                    Back to sign in
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ForgotPasswordPage


