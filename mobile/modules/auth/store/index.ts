import { router } from 'expo-router';
import { create } from 'zustand';

import { TokenService } from '@/libs/api/token-service';
import { HTTPClient } from '@/libs/http/client';
import { Logger } from '@/libs/log';
import { User } from '@/modules/auth/api/schemas';

const logger = new Logger('AuthStore');

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isVerifyingAuth: boolean;
}

interface AuthActions {
  setUser: (user: User) => void;
  clearUser: () => void;
  logout: () => Promise<void>;
  setIsVerifyingAuth: (isVerifyingAuth: boolean) => void;
}

export const useAuthStore = create<AuthState & AuthActions>((set) => ({
  // State
  user: null,
  isAuthenticated: false,
  isVerifyingAuth: true,

  // Actions
  setUser: (user) => {
    logger.debug(`Setting user: ${user.first_name} ${user.last_name} (${user.email})`);
    set({ user, isAuthenticated: true });
  },

  clearUser: () => {
    logger.debug('Clearing user');
    set({ user: null, isAuthenticated: false });
  },

  logout: async () => {
    logger.debug('Logging out');
    await TokenService.clearTokens();
    HTTPClient.resetRetryState();
    set({ user: null, isAuthenticated: false });
    router.replace('/(auth)/login');
  },

  setIsVerifyingAuth: (isVerifyingAuth: boolean) => {
    logger.debug(`Set isVerifyingAuth: ${isVerifyingAuth}`);
    set({ isVerifyingAuth });
  },
}));
