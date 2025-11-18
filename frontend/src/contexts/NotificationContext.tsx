import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { TopicSubscribe, type TopicClient, type TopicItem } from '@gomomento/sdk-web';
import { useAuth } from '../hooks/useAuth';
import { useUser } from '../hooks/useUser';
import { useToast } from './ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiRequest } from '../api/client';
import { refreshMomentoToken } from '../api/tokens';
import { refreshCognitoToken } from '../api/auth';
import { tokenStorage } from '../utils/tokenStorage';

let momentoModule: typeof import('@gomomento/sdk-web') | null = null;

async function getMomentoSDK() {
  if (!momentoModule) {
    momentoModule = await import('@gomomento/sdk-web');
  }
  return momentoModule;
}

export interface MomentoMessage {
  type: string;
  title: string;
  message: string;
  url: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

interface NotificationContextValue {
  unreadCount: number;
  subscribe: (tenantId: string, token: string) => Promise<void>;
  unsubscribe: () => Promise<void>;
  refreshToken: () => Promise<void>;
  handleTeamSwitch: (newTenantId: string) => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

interface NotificationProviderProps {
  children: ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  const { isAuthenticated, momentoToken, updateMomentoToken } = useAuth();
  const { profile } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [topicClient, setTopicClient] = useState<TopicClient | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);
  const [proactiveRefreshTimer, setProactiveRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const tenantSubscriptionRef = useRef<any>(null);
  const tasksSubscriptionRef = useRef<any>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_REFRESH_ATTEMPTS = 3;

  const isValidMessage = (msg: unknown): msg is MomentoMessage => {
    if (typeof msg !== 'object' || msg === null) return false;
    const m = msg as Record<string, unknown>;
    return (
      typeof m.type === 'string' &&
      typeof m.title === 'string' &&
      typeof m.message === 'string' &&
      typeof m.url === 'string' &&
      typeof m.timestamp === 'string'
    );
  };

  const initializeClient = useCallback(async (token: string) => {
    try {
      const { TopicClient, CredentialProvider, Configurations } = await getMomentoSDK();
      const client = new TopicClient({
        configuration: Configurations.Browser.latest(),
        credentialProvider: CredentialProvider.fromString(token)
      });
      setTopicClient(client);
      return client;
    } catch (error) {
      console.error('Failed to initialize Momento client:', error);
      return null;
    }
  }, []);

  const handleTenantMessage = useCallback(async () => {
    try {
      const response = await apiRequest<{ unreadCount: number; }>('/activities');
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to refresh activities:', error);
    }
  }, []);

  const handleTaskMessage = useCallback((message: MomentoMessage) => {

    const currentPath = location.pathname;
    const messageUrl = message.url;
    console.log(currentPath, messageUrl);
    if (currentPath === messageUrl) {
      window.dispatchEvent(new CustomEvent('refreshPageContent', {
        detail: { url: messageUrl, message }
      }));
    } else {
      showToast(
        message.title,
        'info',
        () => navigate(messageUrl)
      );
    }
  }, [location.pathname, navigate, showToast]);

  const handleAuthErrorRef = useRef<((error: unknown) => Promise<void>) | null>(null);

  const subscribeTenant = useCallback(async (tenantId: string, client: TopicClient, token: string) => {
    try {
      const cacheName = import.meta.env.VITE_CACHE_NAME;
      const tenantTopic = tenantId;
      const tasksTopic = `${tenantId}_tasks`;

      console.log(`Subscribing to topics for tenant: ${tenantId}`);

      tokenStorage.save(token);

      const tenantSubscriptionResponse = await client.subscribe(cacheName, tenantTopic, {
        onItem: (item: TopicItem) => {
          try {
            const message = JSON.parse(item.value().toString());
            if (isValidMessage(message)) {
              handleTenantMessage();
            }
          } catch (error) {
            console.error('Failed to parse tenant message:', error);
          }
        },
        onError: async (error) => {
          console.error('Tenant subscription error:', error);
          if (handleAuthErrorRef.current) {
            await handleAuthErrorRef.current(error);
          }
        }
      });

      if (tenantSubscriptionResponse instanceof TopicSubscribe.Error) {
        console.error('Failed to subscribe to tenant topic:', tenantSubscriptionResponse);
        if (handleAuthErrorRef.current) {
          await handleAuthErrorRef.current(tenantSubscriptionResponse);
        }
        throw tenantSubscriptionResponse;
      }

      const tenantSubscription = tenantSubscriptionResponse as TopicSubscribe.Subscription;

      const tasksSubscriptionResponse = await client.subscribe(cacheName, tasksTopic, {
        onItem: (item: TopicItem) => {
          try {
            const message = JSON.parse(item.value().toString());
            if (isValidMessage(message)) {
              handleTaskMessage(message);
            }
          } catch (error) {
            console.error('Failed to parse task message:', error);
          }
        },
        onError: async (error) => {
          console.error('Tasks subscription error:', error);
          if (handleAuthErrorRef.current) {
            await handleAuthErrorRef.current(error);
          }
        }
      });

      if (tasksSubscriptionResponse instanceof TopicSubscribe.Error) {
        console.error('Failed to subscribe to tasks topic:', tasksSubscriptionResponse);
        tenantSubscription.unsubscribe();
        if (handleAuthErrorRef.current) {
          await handleAuthErrorRef.current(tasksSubscriptionResponse);
        }
        throw tasksSubscriptionResponse;
      }

      const tasksSubscription = tasksSubscriptionResponse as TopicSubscribe.Subscription;

      tenantSubscriptionRef.current = tenantSubscription;
      tasksSubscriptionRef.current = tasksSubscription;
      setCurrentTenantId(tenantId);
      setIsSubscribed(true);
      console.log(`Successfully subscribed to topics for tenant: ${tenantId}`);
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);
      if (handleAuthErrorRef.current) {
        await handleAuthErrorRef.current(error);
      }
      throw error;
    }
  }, [handleTenantMessage, handleTaskMessage]);

  const setupProactiveRefreshRef = useRef<(() => void) | null>(null);

  const unsubscribeFromTopics = useCallback(() => {
    if (tenantSubscriptionRef.current) {
      tenantSubscriptionRef.current.unsubscribe();
      tenantSubscriptionRef.current = null;
    }
    if (tasksSubscriptionRef.current) {
      tasksSubscriptionRef.current.unsubscribe();
      tasksSubscriptionRef.current = null;
    }
    setCurrentTenantId(null);
    setIsSubscribed(false);
  }, []);

  const reestablishSubscriptions = useCallback(async (newToken: string) => {
    if (!isSubscribed || !currentTenantId) {
      return;
    }

    unsubscribeFromTopics();

    const newClient = await initializeClient(newToken);
    if (!newClient) {
      throw new Error('Failed to initialize client with new token');
    }

    await subscribeTenant(currentTenantId, newClient, newToken);
  }, [isSubscribed, currentTenantId, unsubscribeFromTopics, initializeClient, subscribeTenant]);

  const setupProactiveRefresh = useCallback(() => {
    if (proactiveRefreshTimer) {
      clearTimeout(proactiveRefreshTimer);
    }

    const timer = setTimeout(async () => {
      try {
        console.log('Proactive token refresh triggered');
        const response = await refreshMomentoToken();
        tokenStorage.save(response.momentoToken);
        await reestablishSubscriptions(response.momentoToken);
        if (setupProactiveRefreshRef.current) {
          setupProactiveRefreshRef.current();
        }
      } catch (error) {
        console.error('Proactive refresh failed:', error);
      }
    }, 13 * 60 * 1000);

    setProactiveRefreshTimer(timer);
  }, [proactiveRefreshTimer, reestablishSubscriptions]);

  setupProactiveRefreshRef.current = setupProactiveRefresh;

  const subscribe = useCallback(async (tenantId: string, token: string) => {
    if (currentTenantId === tenantId && topicClient) {
      return;
    }

    unsubscribeFromTopics();

    const client = topicClient || await initializeClient(token);
    if (!client) {
      throw new Error('Failed to initialize Momento client');
    }

    await subscribeTenant(tenantId, client, token);

    if (setupProactiveRefreshRef.current) {
      setupProactiveRefreshRef.current();
    }
  }, [currentTenantId, topicClient, initializeClient, subscribeTenant, unsubscribeFromTopics]);

  const unsubscribe = useCallback(async () => {
    unsubscribeFromTopics();
    setTopicClient(null);
    setRefreshAttempts(0);
    tokenStorage.clear();

    if (proactiveRefreshTimer) {
      clearTimeout(proactiveRefreshTimer);
      setProactiveRefreshTimer(null);
    }
  }, [unsubscribeFromTopics, proactiveRefreshTimer]);

  const refreshToken = useCallback(async () => {
    try {
      console.log('Refreshing Momento token...');

      const response = await refreshMomentoToken();
      console.log('Received new Momento token, expires at:', response.expiresAt);

      updateMomentoToken(response.momentoToken);
      tokenStorage.save(response.momentoToken);

      await reestablishSubscriptions(response.momentoToken);

      console.log('Token refresh and resubscription complete');
    } catch (error) {
      console.error('Failed to refresh Momento token:', error);
      throw error;
    }
  }, [updateMomentoToken, reestablishSubscriptions]);

  const handleTeamSwitch = useCallback(async (newTenantId: string) => {
    const previousTenantId = currentTenantId;

    try {
      console.log(`Switching team from ${previousTenantId} to ${newTenantId}`);

      await refreshCognitoToken();

      const response = await refreshMomentoToken();
      const newMomentoToken = response.momentoToken;

      tokenStorage.save(newMomentoToken);

      if (previousTenantId) {
        unsubscribeFromTopics();
      }

      const client = topicClient || await initializeClient(newMomentoToken);
      if (!client) {
        throw new Error('Failed to initialize Momento client');
      }

      await subscribeTenant(newTenantId, client, newMomentoToken);

      if (setupProactiveRefreshRef.current) {
        setupProactiveRefreshRef.current();
      }

      setCurrentTenantId(newTenantId);
      setRefreshAttempts(0);

      console.log(`Successfully switched to team ${newTenantId}`);
    } catch (error) {
      console.error('Team switch failed:', error);
      showToast('Failed to switch teams. Please try again.', 'error');

      if (previousTenantId) {
        setCurrentTenantId(previousTenantId);
      }

      throw error;
    }
  }, [currentTenantId, topicClient, unsubscribeFromTopics, initializeClient, subscribeTenant, showToast]);

  handleAuthErrorRef.current = useCallback(async (error: unknown) => {
    console.error('Momento subscription error:', error);

    const errorObj = error as {
      statusCode?: number;
      errorCode?: string;
      message?: string;
    };

    const isAuthError =
      errorObj.statusCode === 401 ||
      errorObj.statusCode === 403 ||
      errorObj.errorCode === 'AUTHENTICATION_ERROR' ||
      errorObj.errorCode === 'PERMISSION_ERROR' ||
      (typeof errorObj.message === 'string' && (
        errorObj.message.includes('authentication') ||
        errorObj.message.includes('unauthorized') ||
        errorObj.message.includes('permission') ||
        errorObj.message.includes('token')
      ));

    if (!isAuthError) {
      return;
    }

    setRefreshAttempts(prev => prev + 1);

    if (refreshAttempts + 1 > MAX_REFRESH_ATTEMPTS) {
      console.error('Max refresh attempts reached, redirecting to login');
      showToast('Session expired. Please log in again.', 'error');
      navigate('/login');
      return;
    }

    try {
      console.log(`Attempting token refresh (attempt ${refreshAttempts + 1}/${MAX_REFRESH_ATTEMPTS})`);

      if (tokenStorage.isValid()) {
        const stored = tokenStorage.get();
        if (stored) {
          console.log('Using valid token from localStorage');
          await reestablishSubscriptions(stored.token);
          setRefreshAttempts(0);
          return;
        }
      }

      console.log('Calling refreshMomentoToken endpoint');
      const response = await refreshMomentoToken();
      tokenStorage.save(response.momentoToken);
      await reestablishSubscriptions(response.momentoToken);
      setRefreshAttempts(0);
      console.log('Token refresh successful');
    } catch (refreshError) {
      console.error('Token refresh failed:', refreshError);
    }
  }, [refreshAttempts, navigate, showToast, reestablishSubscriptions]);

  const reconnect = useCallback(async (attempt = 1) => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentTenantId && topicClient && momentoToken) {
          await subscribeTenant(currentTenantId, topicClient, momentoToken);
        }
      } catch (error) {
        if (attempt < 5) {
          reconnect(attempt + 1);
        } else {
          showToast('Connection lost. Please refresh the page.', 'error');
        }
      }
    }, delay);
  }, [currentTenantId, topicClient, momentoToken, subscribeTenant, showToast]);

  useEffect(() => {
    const handleOnline = () => {
      if (currentTenantId && topicClient) {
        reconnect();
      }
    };

    const handleOffline = () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };

    const handleTokenRefreshed = async () => {
      console.log('Momento token refreshed via API call, resubscribing...');
      try {
        await refreshToken();
      } catch (error) {
        console.error('Failed to resubscribe after token refresh:', error);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('momento-token-refreshed', handleTokenRefreshed);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('momento-token-refreshed', handleTokenRefreshed);
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [currentTenantId, topicClient, reconnect, refreshToken]);

  useEffect(() => {
    const initializeSubscriptions = async () => {
      if (!isAuthenticated || !profile?.activeTeamId || !momentoToken) {
        unsubscribe();
        return;
      }

      try {
        await subscribe(profile.activeTeamId, momentoToken);
      } catch (error) {
        console.error('Failed to initialize subscriptions:', error);
      }
    };

    initializeSubscriptions();
  }, [isAuthenticated, profile?.activeTeamId, momentoToken]);

  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        subscribe,
        unsubscribe,
        refreshToken,
        handleTeamSwitch
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
