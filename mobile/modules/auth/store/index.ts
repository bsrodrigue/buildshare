import { create } from 'zustand';

import { Logger } from '@/libs/log';
import { UserResource } from '@/modules/auth/api/schemas';

const logger = new Logger('AuthStore');

interface AuthState {
  user: UserResource | null;
  isAuthenticated: boolean;
  isVerifyingAuth: boolean;
}

interface AuthActions {
  setUser: (user: UserResource) => void;
  logout: () => void;
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
  logout: () => {
    logger.debug('Logging out');
    set({ user: null, isAuthenticated: false });
  },
  setIsVerifyingAuth: (isVerifyingAuth: boolean) => {
    logger.debug(`Set isVerifyingAuth: ${isVerifyingAuth}`);
    set({ isVerifyingAuth });
  },
}));
