import { Options } from 'ky';

import { HTTPClient } from '@/libs/http/client';

import { createLogger } from '../log';

const logger = createLogger('APIService');

export class APIService {
  private static defaultClient: HTTPClient;

  private static isInitialized: boolean = false;

  public static initializeDefaultClient(baseURL: string): void {
    if (APIService.isInitialized) {
      logger.debug('APIService has already been initialized. Skipping re-initialization.');
      return;
    }

    APIService.defaultClient = new HTTPClient(baseURL, {});

    APIService.isInitialized = true;
    logger.debug(`APIService initialized with baseURL: ${baseURL}`);
  }

  public static getClient(): HTTPClient {
    if (!APIService.isInitialized) {
      throw new Error(
        'APIService not initialized. Call APIService.initializeDefaultClient() first.',
      );
    }
    return APIService.defaultClient;
  }
}

/**
 * Global HTTP client instance for service calls.
 */
export const http = {
  get: <T>(url: string, config?: Options) => APIService.getClient().get<T>(url, config),
  post: <T>(url: string, data?: unknown, config?: Options) =>
    APIService.getClient().post<T>(url, data, config),
  put: <T>(url: string, data?: unknown, config?: Options) =>
    APIService.getClient().put<T>(url, data, config),
  patch: <T>(url: string, data?: unknown, config?: Options) =>
    APIService.getClient().patch<T>(url, data, config),
  delete: <T>(url: string, config?: Options) => APIService.getClient().delete<T>(url, config),
};
