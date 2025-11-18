import { fetchAuthSession } from 'aws-amplify/auth'

export const refreshCognitoToken = async (): Promise<string> => {
  try {
    const session = await fetchAuthSession({ forceRefresh: true })

    if (!session.tokens?.idToken) {
      throw new Error('No ID token available after refresh')
    }

    return session.tokens.idToken.toString()
  } catch (error) {
    console.error('Cognito token refresh failed:', error)
    throw new Error('Failed to refresh authentication')
  }
}
