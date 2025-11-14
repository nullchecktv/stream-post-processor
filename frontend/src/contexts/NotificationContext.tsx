import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react'
import type { TopicClient, TopicItem } from '@gomomento/sdk-web'
import { useAuth } from '../hooks/useAuth'
import { useUser } from '../hooks/useUser'
import { useToast } from './ToastContext'
import { useNavigate, useLocation } from 'react-router-dom'
import { apiRequest } from '../api/client'
import { refreshMomentoToken } from '../api/tokens'

let momentoModule: typeof import('@gomomento/sdk-web') | null = null

async function getMomentoSDK() {
  if (!momentoModule) {
    momentoModule = await import('@gomomento/sdk-web')
  }
  return momentoModule
}

export interface MomentoMessage {
  type: string
  title: string
  message: string
  url: string
  timestamp: string
  metadata?: Record<string, unknown>
}

interface NotificationContextValue {
  unreadCount: number
  subscribe: (tenantId: string, token: string) => Promise<void>
  unsubscribe: () => Promise<void>
  refreshToken: () => Promise<void>
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined)

interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, momentoToken, updateMomentoToken } = useAuth()
  const { profile } = useUser()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const location = useLocation()

  const [unreadCount, setUnreadCount] = useState(0)
  const [topicClient, setTopicClient] = useState<TopicClient | null>(null)
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null)
  const [refreshAttempts, setRefreshAttempts] = useState(0)

  const tenantSubscriptionRef = useRef<any>(null)
  const tasksSubscriptionRef = useRef<any>(null)
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  const MAX_REFRESH_ATTEMPTS = 3

  const isValidMessage = (msg: unknown): msg is MomentoMessage => {
    if (typeof msg !== 'object' || msg === null) return false
    const m = msg as Record<string, unknown>
    return (
      typeof m.type === 'string' &&
      typeof m.title === 'string' &&
      typeof m.message === 'string' &&
      typeof m.url === 'string' &&
      typeof m.timestamp === 'string'
    )
  }

  const initializeClient = useCallback(async (token: string) => {
    try {
      const { TopicClient, CredentialProvider, Configurations } = await getMomentoSDK()
      const client = new TopicClient({
        configuration: Configurations.Browser.latest(),
        credentialProvider: CredentialProvider.fromString(token)
      })
      setTopicClient(client)
      return client
    } catch (error) {
      console.error('Failed to initialize Momento client:', error)
      return null
    }
  }, [])

  const handleTenantMessage = useCallback(async () => {
    try {
      const response = await apiRequest<{ unreadCount: number }>('/activities')
      setUnreadCount(response.unreadCount || 0)
    } catch (error) {
      console.error('Failed to refresh activities:', error)
    }
  }, [])

  const handleTaskMessage = useCallback((message: MomentoMessage) => {
    const currentPath = location.pathname
    const messageUrl = message.url

    if (currentPath === messageUrl) {
      window.dispatchEvent(new CustomEvent('refreshPageContent', {
        detail: { url: messageUrl, message }
      }))
    } else {
      showToast(
        message.title,
        'info',
        () => navigate(messageUrl)
      )
    }
  }, [location.pathname, navigate, showToast])

  const handleAuthError = useCallback(async (error: unknown) => {
    const errorObj = error as { statusCode?: number }
    if (errorObj.statusCode === 401 || errorObj.statusCode === 403) {
      if (refreshAttempts >= MAX_REFRESH_ATTEMPTS) {
        showToast('Session expired. Please log in again.', 'error')
        navigate('/login')
        return
      }

      try {
        setRefreshAttempts(prev => prev + 1)
        await refreshToken()
        setRefreshAttempts(0)
      } catch (refreshError) {
        if (refreshAttempts + 1 >= MAX_REFRESH_ATTEMPTS) {
          showToast('Session expired. Please log in again.', 'error')
          navigate('/login')
        }
      }
    }
  }, [refreshAttempts, navigate, showToast])

  const subscribeTenant = useCallback(async (tenantId: string, client: TopicClient) => {
    try {
      const tenantTopic = tenantId
      const tasksTopic = `${tenantId}_tasks`

      const tenantSubscription = await client.subscribe('notifications', tenantTopic, {
        onItem: (item: TopicItem) => {
          try {
            const message = JSON.parse(item.value().toString())
            if (isValidMessage(message)) {
              handleTenantMessage()
            }
          } catch (error) {
            console.error('Failed to parse tenant message:', error)
          }
        },
        onError: (error) => {
          console.error('Tenant subscription error:', error)
          handleAuthError(error)
        }
      })

      const tasksSubscription = await client.subscribe('notifications', tasksTopic, {
        onItem: (item: TopicItem) => {
          try {
            const message = JSON.parse(item.value().toString())
            if (isValidMessage(message)) {
              handleTaskMessage(message)
            }
          } catch (error) {
            console.error('Failed to parse task message:', error)
          }
        },
        onError: (error) => {
          console.error('Tasks subscription error:', error)
          handleAuthError(error)
        }
      })

      tenantSubscriptionRef.current = tenantSubscription
      tasksSubscriptionRef.current = tasksSubscription
      setCurrentTenantId(tenantId)
    } catch (error) {
      console.error('Failed to subscribe to topics:', error)
      handleAuthError(error)
    }
  }, [handleTenantMessage, handleTaskMessage, handleAuthError])

  const unsubscribeFromTopics = useCallback(() => {
    if (tenantSubscriptionRef.current) {
      tenantSubscriptionRef.current.unsubscribe()
      tenantSubscriptionRef.current = null
    }
    if (tasksSubscriptionRef.current) {
      tasksSubscriptionRef.current.unsubscribe()
      tasksSubscriptionRef.current = null
    }
    setCurrentTenantId(null)
  }, [])

  const subscribe = useCallback(async (tenantId: string, token: string) => {
    if (currentTenantId === tenantId && topicClient) {
      return
    }

    unsubscribeFromTopics()

    const client = topicClient || await initializeClient(token)
    if (!client) {
      throw new Error('Failed to initialize Momento client')
    }

    await subscribeTenant(tenantId, client)
  }, [currentTenantId, topicClient, initializeClient, subscribeTenant, unsubscribeFromTopics])

  const unsubscribe = useCallback(async () => {
    unsubscribeFromTopics()
    setTopicClient(null)
    setRefreshAttempts(0)
  }, [unsubscribeFromTopics])

  const refreshToken = useCallback(async () => {
    try {
      const response = await refreshMomentoToken()

      updateMomentoToken(response.momentoToken)

      const newClient = await initializeClient(response.momentoToken)
      if (!newClient) {
        throw new Error('Failed to initialize client with new token')
      }

      if (currentTenantId) {
        await subscribeTenant(currentTenantId, newClient)
      }
    } catch (error) {
      console.error('Failed to refresh Momento token:', error)
      throw error
    }
  }, [currentTenantId, initializeClient, subscribeTenant, updateMomentoToken])

  const reconnect = useCallback(async (attempt = 1) => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000)

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentTenantId && topicClient) {
          await subscribeTenant(currentTenantId, topicClient)
        }
      } catch (error) {
        if (attempt < 5) {
          reconnect(attempt + 1)
        } else {
          showToast('Connection lost. Please refresh the page.', 'error')
        }
      }
    }, delay)
  }, [currentTenantId, topicClient, subscribeTenant, showToast])

  useEffect(() => {
    const handleOnline = () => {
      if (currentTenantId && topicClient) {
        reconnect()
      }
    }

    const handleOffline = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current)
      }
    }
  }, [currentTenantId, topicClient, reconnect])

  useEffect(() => {
    const initializeSubscriptions = async () => {
      if (!isAuthenticated || !profile?.activeTeamId || !momentoToken) {
        unsubscribe()
        return
      }

      try {
        await subscribe(profile.activeTeamId, momentoToken)
      } catch (error) {
        console.error('Failed to initialize subscriptions:', error)
      }
    }

    initializeSubscriptions()
  }, [isAuthenticated, profile?.activeTeamId, momentoToken])

  useEffect(() => {
    return () => {
      unsubscribe()
    }
  }, [])

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        subscribe,
        unsubscribe,
        refreshToken
      }}
    >
      {children}
    </NotificationContext.Provider>
  )
}
