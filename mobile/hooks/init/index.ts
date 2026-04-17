import { useEffect, useRef } from 'react';

import { APIService } from '@/libs/api/client';
import { env } from '@/libs/env';
import { JSONService } from '@/libs/json';
import { createLogger } from '@/libs/log';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { authService } from '@/modules/auth/api/services';
import { useAuthStore } from '@/modules/auth/store';

const logger = createLogger('ApplicationStartup');

export default function useInitApp() {
  const { isAuthenticated, setUser, logout, isVerifyingAuth, setIsVerifyingAuth } = useAuthStore();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initApplication() {
      logger.debug('Initializing application');

      APIService.initializeDefaultClient(env.API_URL);

      const token = await SecureStorage.getItem(SecureStorageKey.BEARER_TOKEN);

      if (!token) {
        logger.debug('No bearer token found, skipping authenticated bootstrap');
        logout();
        setIsVerifyingAuth(false);
        return;
      }

      try {
        const user = await authService.me();
        setUser(user);
        logger.debug(`User authenticated: ${JSONService.stringify(user)}`);
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message.toLowerCase() : '';
        const isAuthError = message.includes('unauthorized') || message.includes('authentifié');

        if (isAuthError) {
          logger.debug('Stored token is invalid or expired, wiping session');
          await SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN);
          logout();
        } else {
          logger.warn(`Failed to fetch profile: ${message}. Keeping token for retry.`);
        }
      } finally {
        setIsVerifyingAuth(false);
      }
    }

    void initApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = isVerifyingAuth;

  return {
    isLoading,
    isAuthenticated,
  };
}
