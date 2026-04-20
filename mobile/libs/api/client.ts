import { Options } from 'ky';

import { HTTPClient } from '@/libs/http/client';

import { createLogger } from '../log';

const logger = createLogger('APIService');

export class APIService {
  private static defaultClient: HTTPClient | null = null;

  /**
   * Initialize (or re-initialize) the default HTTP client with a new base URL.
   * Safe to call multiple times — each call replaces the current client.
   */
  public static initializeDefaultClient(baseURL: string): void {
    APIService.defaultClient = new HTTPClient(baseURL, {});
    logger.debug(`APIService initialized with baseURL: ${baseURL}`);
  }

  /**
   * Replace the base URL of the HTTP client at runtime.
   * Identical to initializeDefaultClient — provided for semantic clarity at call sites.
   */
  public static reinitialize(baseURL: string): void {
    APIService.initializeDefaultClient(baseURL);
  }

  public static getClient(): HTTPClient {
    if (!APIService.defaultClient) {
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
