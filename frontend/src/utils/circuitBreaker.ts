export const CircuitState = {
  CLOSED: 'closed',
  OPEN: 'open',
  HALF_OPEN: 'half-open'
} as const;

export type CircuitState = typeof CircuitState[keyof typeof CircuitState];

export interface CircuitBreakerConfig {
  failureThreshold: number;
  cooldownMs: number;
  maxAutoRecoveryAttempts: number;
}

export interface CircuitBreakerStatus {
  state: CircuitState;
  failureCount: number;
  lastFailureTime: number | null;
  autoRecoveryAttempts: number;
  canRetry: boolean;
}

interface ApiError {
  status?: number;
}

interface MomentoError {
  errorCode?: () => string;
}

export function isAuthenticationError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'status' in error) {
    const apiError = error as ApiError;
    return apiError.status === 401;
  }

  if (error && typeof error === 'object' && 'errorCode' in error) {
    const momentoError = error as MomentoError;
    if (typeof momentoError.errorCode === 'function') {
      const code = momentoError.errorCode();
      return code === 'PERMISSION_ERROR' || code === 'AUTHENTICATION_ERROR';
    }
  }

  return false;
}

export class MomentoCircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number | null = null;
  private autoRecoveryAttempts: number = 0;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = config;
  }

  recordSuccess(): void {
    const previousFailureCount = this.failureCount;
    this.failureCount = 0;
    this.lastFailureTime = null;

    console.log('[CircuitBreaker] Success recorded', {
      state: this.state,
      previousFailureCount,
      resetFailureCount: true
    });

    if (this.state === CircuitState.HALF_OPEN) {
      this.transitionToClosed();
    }
  }

  recordFailure(error: unknown): boolean {
    if (!isAuthenticationError(error)) {
      console.log('[CircuitBreaker] Non-auth error ignored', {
        state: this.state,
        failureCount: this.failureCount,
        errorType: error?.constructor?.name || 'unknown'
      });
      return false;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    console.log('[CircuitBreaker] Auth failure recorded', {
      state: this.state,
      failureCount: this.failureCount,
      threshold: this.config.failureThreshold,
      willOpen: this.failureCount >= this.config.failureThreshold,
      lastFailureTime: new Date(this.lastFailureTime).toISOString()
    });

    if (this.failureCount >= this.config.failureThreshold) {
      const shouldNotify = this.state !== CircuitState.OPEN;
      this.transitionToOpen();
      return shouldNotify;
    }

    return false;
  }

  shouldAttempt(): boolean {
    const canAttempt = this.state === CircuitState.CLOSED || this.state === CircuitState.HALF_OPEN;

    console.log('[CircuitBreaker] Attempt check', {
      state: this.state,
      canAttempt,
      failureCount: this.failureCount,
      autoRecoveryAttempts: this.autoRecoveryAttempts
    });

    return canAttempt;
  }

  getStatus(): CircuitBreakerStatus {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      autoRecoveryAttempts: this.autoRecoveryAttempts,
      canRetry: this.state === CircuitState.OPEN || this.autoRecoveryAttempts < this.config.maxAutoRecoveryAttempts
    };
  }

  manualReset(): void {
    const previousState = this.state;

    console.log('[CircuitBreaker] Manual reset triggered', {
      previousState,
      failureCount: this.failureCount,
      autoRecoveryAttempts: this.autoRecoveryAttempts,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
    });

    this.clearRecoveryTimer();
    this.transitionToHalfOpen();
  }

  private transitionToOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.OPEN;

    console.log('[CircuitBreaker] State transition:', {
      from: previousState,
      to: this.state,
      failureCount: this.failureCount,
      autoRecoveryAttempts: this.autoRecoveryAttempts
    });

    this.scheduleRecovery();
  }

  private transitionToHalfOpen(): void {
    const previousState = this.state;
    this.state = CircuitState.HALF_OPEN;

    console.log('[CircuitBreaker] State transition:', {
      from: previousState,
      to: this.state,
      failureCount: this.failureCount,
      autoRecoveryAttempts: this.autoRecoveryAttempts
    });

    this.clearRecoveryTimer();
  }

  private transitionToClosed(): void {
    const previousState = this.state;
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.autoRecoveryAttempts = 0;

    console.log('[CircuitBreaker] State transition:', {
      from: previousState,
      to: this.state,
      failureCount: this.failureCount,
      autoRecoveryAttempts: this.autoRecoveryAttempts
    });

    this.clearRecoveryTimer();
  }

  private scheduleRecovery(): void {
    this.clearRecoveryTimer();

    if (this.autoRecoveryAttempts >= this.config.maxAutoRecoveryAttempts) {
      console.log('[CircuitBreaker] Max auto-recovery attempts reached', {
        autoRecoveryAttempts: this.autoRecoveryAttempts,
        maxAttempts: this.config.maxAutoRecoveryAttempts,
        requiresManualReset: true
      });
      return;
    }

    const cooldownSeconds = Math.floor(this.config.cooldownMs / 1000);
    console.log('[CircuitBreaker] Scheduling auto-recovery', {
      nextAttempt: this.autoRecoveryAttempts + 1,
      maxAttempts: this.config.maxAutoRecoveryAttempts,
      cooldownMs: this.config.cooldownMs,
      cooldownSeconds,
      scheduledFor: new Date(Date.now() + this.config.cooldownMs).toISOString()
    });

    this.recoveryTimer = setTimeout(() => {
      this.autoRecoveryAttempts++;
      console.log('[CircuitBreaker] Auto-recovery attempt initiated', {
        attempt: this.autoRecoveryAttempts,
        maxAttempts: this.config.maxAutoRecoveryAttempts,
        remainingAttempts: this.config.maxAutoRecoveryAttempts - this.autoRecoveryAttempts
      });
      this.transitionToHalfOpen();
    }, this.config.cooldownMs);
  }

  private clearRecoveryTimer(): void {
    if (this.recoveryTimer) {
      console.log('[CircuitBreaker] Clearing recovery timer', {
        state: this.state,
        autoRecoveryAttempts: this.autoRecoveryAttempts
      });
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
  }
}
