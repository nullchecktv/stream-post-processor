import { useContext } from 'react';
import { NotificationContext } from '../contexts/NotificationContext';
import { CircuitState } from '../utils/circuitBreaker';

export function useCircuitBreaker() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useCircuitBreaker must be used within NotificationProvider');
  }

  const { circuitStatus, retryConnection } = context;

  return {
    circuitStatus,
    isCircuitOpen: circuitStatus.state === CircuitState.OPEN,
    canRetry: circuitStatus.canRetry,
    retryConnection
  };
}
