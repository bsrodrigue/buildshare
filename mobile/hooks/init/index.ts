import { useEffect, useRef } from 'react';

import { APIService } from '@/libs/api/client';
import { ErrorCode } from '@/libs/api/error-codes';
import { BackendApiError } from '@/libs/api/types';
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
        void logout();
        setIsVerifyingAuth(false);
        return;
      }

      try {
        const user = await authService.me();
        setUser(user);
        logger.debug(`User authenticated: ${JSONService.stringify(user)}`);
      } catch (error: unknown) {
        const isAuthError =
          error instanceof BackendApiError &&
          (error.code === ErrorCode.AUTH_TOKEN_INVALID ||
            error.code === ErrorCode.AUTH_TOKEN_EXPIRED ||
            error.code === ErrorCode.AUTH_SESSION_EXPIRED ||
            error.code === ErrorCode.AUTH_NOT_AUTHENTICATED ||
            error.code === ErrorCode.AUTH_AUTHENTICATION_FAILED);

        if (isAuthError) {
          logger.debug('Stored token is invalid or expired, wiping session');
          await SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN);
          void logout();
        } else {
          const message = error instanceof Error ? error.message : 'Unknown error';
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
