import * as z from 'zod';

import { APIService } from '@/libs/api/client';
import { env } from '@/libs/env';
import { LocalStorage } from '@/libs/local-storage';
import { LocalStorageKey } from '@/libs/local-storage/keys';
import { createLogger } from '@/libs/log';

/**
 * Application-wide configuration and constants.
 * Use this service to manage global settings like app name, contact info, etc.
 */

// ---------------------------------------------------------------------------

const logger = createLogger('AppConfig');

const urlSchema = z.url();

/**
 * Manages the runtime API base URL.
 *
 * Invariants:
 *  - The app always has a valid URL (falls back to `env.API_URL`).
 *  - Setting a URL re-initializes the HTTP client immediately.
 *  - The override is persisted in AsyncStorage across restarts.
 */
export const AppConfig = {
  appName: 'BuildShare',

  /**
   * Returns the effective API base URL.
   * Priority: persisted override > env.API_URL
   */
  async getApiUrl(): Promise<string> {
    const override = await LocalStorage.getItem(LocalStorageKey.API_URL_OVERRIDE);
    if (override) {
      logger.debug(`Using API URL override: ${override}`);
      return override;
    }
    return env.API_URL;
  },

  /**
   * Persists a new API base URL and re-initializes the HTTP client.
   * @throws if the URL is not a valid URL string.
   */
  async setApiUrl(url: string): Promise<void> {
    const parsed = urlSchema.safeParse(url);
    if (!parsed.success) {
      throw new Error(`Invalid URL: ${url}`);
    }
    const normalized = parsed.data;
    await LocalStorage.setItem(LocalStorageKey.API_URL_OVERRIDE, normalized);
    APIService.reinitialize(normalized);
    logger.debug(`API URL updated to: ${normalized}`);
  },

  /**
   * Removes the override and reverts to env.API_URL.
   */
  async clearApiUrl(): Promise<void> {
    await LocalStorage.removeItem(LocalStorageKey.API_URL_OVERRIDE);
    APIService.reinitialize(env.API_URL);
    logger.debug(`API URL reset to env default: ${env.API_URL}`);
  },
};
