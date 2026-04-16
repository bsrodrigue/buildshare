import { useEffect, useRef } from 'react';

import { APIService } from '@/libs/api/client';
import { env } from '@/libs/env';
import { JSONService } from '@/libs/json';
import { Logger } from '@/libs/log';
import PushNotificationService from '@/libs/push-notification/init';
import { GetPusher } from '@/libs/realtime/pusher';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';
import { useMe } from '@/modules/auth/api/hooks';
import { useAuthStore } from '@/modules/auth/store';

const logger = new Logger('ApplicationStartup');

export default function useInitApp() {
  const { isAuthenticated, setUser, logout, isVerifyingAuth, setIsVerifyingAuth } = useAuthStore();
  const { callMe, isLoading: isCallMeLoading, error: meError } = useMe({});
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    async function initApplication() {
      logger.debug('Initializing application');

      // Environment variables are automatically validated on import

      // Initialize other services
      APIService.initializeDefaultClient(env.API_URL);
      await PushNotificationService.init();

      const token = await SecureStorage.getItem(SecureStorageKey.BEARER_TOKEN);

      if (!token) {
        logger.debug('No bearer token found, skipping authenticated bootstrap');
        logout();
        setIsVerifyingAuth(false);
        return;
      }

      const response = await callMe();

      if (response === null) {
        // Only wipe the token if it's a clear authentication failure (401/Unauthorized)
        // We know it's an auth failure if the error object exists and isn't a network error
        const isAuthError =
          meError?.message?.toLowerCase().includes('unauthorized') ||
          meError?.message?.toLowerCase().includes('authentifié');

        if (isAuthError) {
          logger.debug('Stored token is invalid or expired, wiping session');
          await SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN);
          logout();
        } else {
          logger.warn('Failed to fetch profile (likely network error). Keeping token for retry.');
        }

        setIsVerifyingAuth(false);
        return;
      }

      const { user } = response.data;

      setUser(user);
      await GetPusher();
      setIsVerifyingAuth(false);
      logger.debug(`User authenticated: ${JSONService.stringify(user)}`);

      // try {
      //   // const deviceInfo = await PushNotificationService.getDeviceInfo();
      //   // await registerDeviceToken(deviceInfo);
      //   logger.debug('Device token registered successfully');
      // } catch (error) {
      //   logger.error(`Failed to register device token: ${error}`);
      // }
    }

    initApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = isCallMeLoading || isVerifyingAuth;

  return {
    isLoading,
    isAuthenticated,
  };
}
