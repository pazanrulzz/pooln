import { create } from 'zustand';
import type { AuthTokens } from '@pooln/shared';
import { secureStorage } from '../lib/secureStorage';

const ACCESS_TOKEN_KEY = 'pooln.accessToken';
const REFRESH_TOKEN_KEY = 'pooln.refreshToken';

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  isHydrated: boolean;
  hydrate: () => Promise<void>;
  setTokens: (tokens: AuthTokens) => void;
  clearTokens: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  accessToken: null,
  refreshToken: null,
  isHydrated: false,

  hydrate: async () => {
    const [accessToken, refreshToken] = await Promise.all([
      secureStorage.getItem(ACCESS_TOKEN_KEY),
      secureStorage.getItem(REFRESH_TOKEN_KEY),
    ]);
    set({ accessToken, refreshToken, isHydrated: true });
  },

  setTokens: (tokens) => {
    void secureStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
    void secureStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken });
  },

  clearTokens: () => {
    void secureStorage.deleteItem(ACCESS_TOKEN_KEY);
    void secureStorage.deleteItem(REFRESH_TOKEN_KEY);
    set({ accessToken: null, refreshToken: null });
  },
}));
