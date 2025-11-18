interface StoredToken {
  token: string;
  expiresAt: number;
  issuedAt: number;
}

const STORAGE_KEY = 'momento_token';
const TOKEN_LIFETIME_SECONDS = 900;

export const tokenStorage = {
  save(token: string, expiresInSeconds: number = TOKEN_LIFETIME_SECONDS): void {
    const now = Date.now();
    const stored: StoredToken = {
      token,
      expiresAt: now + (expiresInSeconds * 1000),
      issuedAt: now
    };

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.error('Failed to save token to localStorage:', error);
    }
  },

  get(): StoredToken | null {
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (!item) return null;

      const parsed = JSON.parse(item) as StoredToken;

      if (!parsed.token || !parsed.expiresAt || !parsed.issuedAt) {
        this.clear();
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse token from localStorage:', error);
      this.clear();
      return null;
    }
  },

  isValid(): boolean {
    const stored = this.get();
    if (!stored) return false;

    return Date.now() < stored.expiresAt;
  },

  isExpiringSoon(thresholdSeconds: number = 120): boolean {
    const stored = this.get();
    if (!stored) return true;

    const timeUntilExpiry = stored.expiresAt - Date.now();
    return timeUntilExpiry < (thresholdSeconds * 1000);
  },

  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear token from localStorage:', error);
    }
  },

  getValidToken(): string | null {
    try {
      const stored = this.get();

      if (!stored) {
        return null;
      }

      if (!stored.token || typeof stored.token !== 'string' || stored.token.trim() === '') {
        console.error('Invalid token format in localStorage');
        this.clear();
        return null;
      }

      if (Date.now() >= stored.expiresAt) {
        this.clear();
        return null;
      }

      const oneMinuteInMs = 60 * 1000;
      if (stored.expiresAt - Date.now() < oneMinuteInMs) {
        this.clear();
        return null;
      }

      return stored.token;
    } catch (error) {
      console.error('Error validating token:', error);
      this.clear();
      return null;
    }
  }
};
