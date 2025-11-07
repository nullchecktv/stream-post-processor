export interface AuthError {
  name?: string
  code?: string
  message?: string
}

const cognitoErrorMessages: Record<string, string> = {
  UserNotFoundException: 'Invalid email or password',
  NotAuthorizedException: 'Invalid email or password',
  UserNotConfirmedException: 'Please verify your email address',
  PasswordResetRequiredException: 'Password reset required',
  TooManyRequestsException: 'Too many attempts. Please try again later',
  LimitExceededException: 'Too many attempts. Please try again later',
  InvalidParameterException: 'Please check your input and try again',
  CodeMismatchException: 'Invalid verification code',
  ExpiredCodeException: 'Verification code has expired',
  InvalidPasswordException: 'Password does not meet requirements',
  UsernameExistsException: 'An account with this email already exists',
  InvalidLambdaResponseException: 'Authentication service error. Please try again',
  UnexpectedLambdaException: 'Authentication service error. Please try again',
  UserLambdaValidationException: 'Authentication validation failed',
}

const isNetworkError = (error: AuthError): boolean => {
  const errorMessage = error.message?.toLowerCase() || ''
  const errorName = error.name?.toLowerCase() || ''

  return (
    errorMessage.includes('network') ||
    errorMessage.includes('fetch') ||
    errorMessage.includes('connection') ||
    errorMessage.includes('timeout') ||
    errorName === 'networkerror' ||
    errorName === 'typeerror'
  )
}

export const mapAuthError = (error: AuthError): string => {
  if (isNetworkError(error)) {
    return 'Unable to connect. Please check your internet connection'
  }

  const errorCode = error.name || error.code || ''

  if (errorCode && cognitoErrorMessages[errorCode]) {
    return cognitoErrorMessages[errorCode]
  }

  return 'An error occurred. Please try again'
}

export const getPasswordRequirements = (): string => {
  return 'Password must be at least 8 characters and include uppercase, lowercase, number, and special character'
}
