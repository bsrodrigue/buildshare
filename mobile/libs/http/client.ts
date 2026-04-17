import { router } from 'expo-router';
import ky, { HTTPError, Options } from 'ky';
import { Alert } from 'react-native';

import { ErrorCode } from '@/libs/api/error-codes';
import { ApiErrorSchema, BackendApiError } from '@/libs/api/types';

import { Logger } from '../log';
import { toast } from '../notification/toast';
import { PlatformService } from '../platform';
import { SecureStorage } from '../secure-storage';
import { SecureStorageKey } from '../secure-storage/keys';

const logger = new Logger('HTTPClient');

/** Legacy type for compatibility during transition */
export type APIError = {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
};

/** Legacy type for compatibility during transition */
export interface APIResponse<T> {
  data: T;
  status: number;
  statusText: string;
}

export class HTTPClient {
  /**
   * Parses a raw ky HTTPError into a structured CottonApiError.
   */
  public static async parseError(error: unknown): Promise<Error> {
    if (!(error instanceof HTTPError)) {
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }

    const { response } = error;
    let data: unknown;

    try {
      data = await response.json();
    } catch {
      data = null;
    }

    // Try to parse using our standard API Error Schema
    const apiResult = ApiErrorSchema.safeParse(data);
    if (apiResult.success) {
      return new BackendApiError(apiResult.data);
    }

    // Fallback for unknown error formats
    const fallbackMessage = (data && typeof data === 'object' && 'message' in data)
      ? (data as Record<string, any>).message
      : error.message || 'Server Error';

    return new Error(fallbackMessage);
  }

  private instance: typeof ky;

  constructor(baseURL: string, config?: Options) {
    this.instance = ky.create({
      prefix: baseURL,
      timeout: 15000,
      ...config,
      hooks: {
        beforeRequest: [
          async ({ request }) => {
            const token = await SecureStorage.getItem(SecureStorageKey.BEARER_TOKEN);
            if (token) request.headers.set('Authorization', `Bearer ${token}`);

            // Inject Platform & Version headers
            const platformHeaders = PlatformService.getHeaders();
            Object.entries(platformHeaders).forEach(([key, value]) => {
              request.headers.set(key, value);
            });

            logger.debug(`${request.method.toUpperCase()} ${request.url}`);
          },
        ],
        afterResponse: [
          ({ request, response }) => {
            if (response.ok) {
              logger.debug(`SUCCESS ${request.method.toUpperCase()} ${request.url}`);
            }
            return response;
          },
        ],
        beforeError: [
          async ({ error }) => {
            const cottonError = await HTTPClient.parseError(error);
            await this.handleResponseError(cottonError);
            return cottonError as unknown as HTTPError;
          },
        ],
      },
    });
  }

  private async handleResponseError(error: Error) {
    if (error instanceof BackendApiError) {
      // 401: Unauthorized (Clear session and redirect)
      if (
        error.code === ErrorCode.AUTH_TOKEN_EXPIRED ||
        error.code === ErrorCode.AUTH_INVALID_CREDENTIALS ||
        error.code === ErrorCode.AUTH_SESSION_EXPIRED
      ) {
        const { logout, isAuthenticated } = (
          await import('@/modules/auth/store')
        ).useAuthStore.getState();

        if (isAuthenticated) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          logout();
        }
      }
    }

    logger.error(`API Error: ${error.message}`);
  }

  // --- Public API Methods ---

  public get = <T>(url: string, config?: Options) => this.execute<T>('get', url, undefined, config);

  public post = <T>(url: string, data?: unknown, config?: Options) =>
    this.execute<T>('post', url, data, config);

  public put = <T>(url: string, data?: unknown, config?: Options) =>
    this.execute<T>('put', url, data, config);

  public patch = <T>(url: string, data?: unknown, config?: Options) =>
    this.execute<T>('patch', url, data, config);

  public delete = <T>(url: string, config?: Options) =>
    this.execute<T>('delete', url, undefined, config);

  private async execute<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: Options,
  ): Promise<T> {
    const options: Options = {
      ...config,
      method,
    };

    if (data) {
      if (data instanceof FormData) {
        options.body = data;
      } else {
        options.json = data;
      }
    }

    const response = await this.instance(url, options);
    return response.json<T>();
  }
}
