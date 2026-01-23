import { createContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { TopicSubscribe, TopicSubscribeResponse, type TopicClient, type TopicItem } from '@gomomento/sdk-web';
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
  const { isAuthenticated, momentoToken, updateMomentoToken, user } = useAuth();
  const { profile } = useUser();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [unreadCount, setUnreadCount] = useState(0);
  const [topicClient, setTopicClient] = useState<TopicClient | null>(null);
  const [currentTenantId, setCurrentTenantId] = useState<string | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [proactiveRefreshTimer, setProactiveRefreshTimer] = useState<NodeJS.Timeout | null>(null);

  const subscriptionRef = useRef<TopicSubscribe.Subscription | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  const handleMessage = useCallback(async (message: MomentoMessage) => {
    const currentPath = location.pathname;
    const messageUrl = message.url;

    if (message.type === 'workflow_step_updated') {
      window.dispatchEvent(new CustomEvent('workflowStepUpdated', {
        detail: { message }
      }));
      window.dispatchEvent(new CustomEvent('activityUpdated'));
      return;
    }

    if (message.type === 'plan_generated') {
      window.dispatchEvent(new CustomEvent('refreshPageContent', {
        detail: { url: messageUrl, message }
      }));
      window.dispatchEvent(new CustomEvent('activityUpdated'));
      return;
    }

    if (message.type === 'clip_status_updated' || message.type === 'quote_status_updated' || message.type === 'blog_status_updated') {
      window.dispatchEvent(new CustomEvent('contentItemStatusUpdated', {
        detail: { message }
      }));
      window.dispatchEvent(new CustomEvent('activityUpdated'));

      if (message.metadata?.status === 'Created' || message.metadata?.status === 'Failed') {
        window.dispatchEvent(new CustomEvent('refreshPageContent', {
          detail: { url: messageUrl, message }
        }));

        if (currentPath !== messageUrl) {
          showToast(
            message.title,
            message.metadata?.status === 'Failed' ? 'error' : 'success',
            () => navigate(messageUrl)
          );
        }
      }
      return;
    }

    try {
      const response = await apiRequest<{ unreadCount: number; }>('/notifications');
      setUnreadCount(response.unreadCount || 0);
    } catch (error) {
      console.error('Failed to refresh notifications:', error);
    }

    if (currentPath === messageUrl) {
      window.dispatchEvent(new CustomEvent('refreshPageContent', {
        detail: { url: messageUrl, message }
      }));
      window.dispatchEvent(new CustomEvent('activityUpdated'));
    } else {
      showToast(
        message.title,
        'info',
        () => navigate(messageUrl)
      );
      window.dispatchEvent(new CustomEvent('activityUpdated'));
    }
  }, [location.pathname, navigate, showToast]);

  const subscribeTenant = useCallback(async (tenantId: string, client: TopicClient, token: string, retryCount = 0) => {
    const MAX_RETRIES = 1;

    try {
      const cacheName = import.meta.env.VITE_CACHE_NAME;
      const tenantTopic = tenantId;

      console.log(`Subscribing to tenant topic: ${tenantId}`, {
        cacheName,
        tenantTopic,
        hasClient: !!client,
        retryCount
      });

      tokenStorage.save(token);

      const subscriptionResponse = await client.subscribe(cacheName, tenantTopic, {
        onItem: (item: TopicItem) => {
          console.log('Received message:', item.value().toString());
          try {
            const message = JSON.parse(item.value().toString());
            if (isValidMessage(message)) {
              handleMessage(message);
            }
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        },
        onError: async (error) => {
          console.error('Subscription error:', error);
        }
      });

      if (subscriptionResponse.type === TopicSubscribeResponse.Error) {
        console.error('Failed to subscribe to tenant topic:', subscriptionResponse);
        throw subscriptionResponse;
      }

      const subscription = subscriptionResponse as TopicSubscribe.Subscription;

      subscriptionRef.current = subscription;
      setCurrentTenantId(tenantId);
      setIsSubscribed(true);
      console.log(`Successfully subscribed to tenant topic: ${tenantId}`);
    } catch (error) {
      console.error('Failed to subscribe to topics:', error);

      const subscribeError = error as TopicSubscribe.Error;

      let isAuthError = false;
      try {
        const errorCode = subscribeError.errorCode?.();
        isAuthError = errorCode === 'PERMISSION_ERROR' || errorCode === 'AUTHENTICATION_ERROR';
      } catch {
        isAuthError = false;
      }

      if (isAuthError && retryCount < MAX_RETRIES) {
        console.log(`Auth error detected, refreshing token and retrying (attempt ${retryCount + 1}/${MAX_RETRIES})`);

        try {
          const response = await refreshMomentoToken();
          const newToken = response.momentoToken;
          tokenStorage.save(newToken);

          const newClient = await initializeClient(newToken);
          if (!newClient) {
            throw new Error('Failed to initialize client with new token');
          }

          return await subscribeTenant(tenantId, newClient, newToken, retryCount + 1);
        } catch (refreshError) {
          console.error('Token refresh failed:', refreshError);
          throw refreshError;
        }
      }

      throw error;
    }
  }, [handleMessage, initializeClient]);

  const setupProactiveRefreshRef = useRef<(() => void) | null>(null);

  const unsubscribeFromTopics = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
      subscriptionRef.current = null;
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
    console.log('subscribe() called', {
      tenantId,
      currentTenantId,
      hasTopicClient: !!topicClient,
      tokenLength: token?.length
    });

    if (currentTenantId === tenantId && topicClient) {
      console.log('Already subscribed to this tenant, skipping');
      return;
    }

    unsubscribeFromTopics();

    console.log('Initializing Momento client...');
    const client = topicClient || await initializeClient(token);
    if (!client) {
      throw new Error('Failed to initialize Momento client');
    }
    console.log('Momento client initialized successfully');

    await subscribeTenant(tenantId, client, token);

    if (setupProactiveRefreshRef.current) {
      setupProactiveRefreshRef.current();
    }
  }, [currentTenantId, topicClient, initializeClient, subscribeTenant, unsubscribeFromTopics]);

  const unsubscribe = useCallback(async () => {
    unsubscribeFromTopics();
    setTopicClient(null);
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

  const reconnect = useCallback(async (attempt = 1) => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);

    reconnectTimeoutRef.current = setTimeout(async () => {
      try {
        if (currentTenantId && topicClient && momentoToken) {
          await subscribeTenant(currentTenantId, topicClient, momentoToken);
        }
      } catch (_error) {
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
      const tenantId = user?.tenantId;

      console.log('NotificationContext: Checking subscription initialization', {
        isAuthenticated,
        userTenantId: user?.tenantId,
        effectiveTenantId: tenantId,
        hasMomentoToken: !!momentoToken,
        momentoTokenLength: momentoToken?.length,
        currentTenantId,
        isSubscribed
      });

      if (!isAuthenticated || !tenantId) {
        console.log('NotificationContext: Skipping subscription - missing requirements', {
          isAuthenticated,
          hasTenantId: !!tenantId
        });
        if (isSubscribed) {
          await unsubscribe();
        }
        setUnreadCount(0);
        return;
      }

      if (currentTenantId === tenantId && isSubscribed) {
        console.log('NotificationContext: Already subscribed to this tenant, skipping');
        return;
      }

      try {
        const response = await apiRequest<{ unreadCount: number; }>('/notifications');
        setUnreadCount(response.unreadCount || 0);
      } catch (error) {
        console.error('Failed to fetch initial unread count:', error);
      }

      try {
        let tokenToUse = momentoToken;

        if (!tokenToUse || !tokenStorage.isValid()) {
          console.log('NotificationContext: Token missing or expired, fetching fresh token...');
          const response = await refreshMomentoToken();
          tokenToUse = response.momentoToken;
          updateMomentoToken(tokenToUse);
          tokenStorage.save(tokenToUse);
          console.log('NotificationContext: Fresh token obtained');
        }

        console.log('NotificationContext: Attempting to subscribe...');
        await subscribe(tenantId, tokenToUse);
        console.log('NotificationContext: Subscription successful');
      } catch (error) {
        console.error('Failed to initialize subscriptions:', error);
      }
    };

    initializeSubscriptions();
  }, [isAuthenticated, user?.tenantId, profile?.activeTeamId]);

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
