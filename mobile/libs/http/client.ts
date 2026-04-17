import ky, { HTTPError, Options } from 'ky';

import { ErrorCode } from '@/libs/api/error-codes';
import { ApiErrorSchema, BackendApiError } from '@/libs/api/types';

import { Logger } from '../log';
import { toast } from '../notification/toast';
import { PlatformService } from '../platform';
import { SecureStorage } from '../secure-storage';
import { SecureStorageKey } from '../secure-storage/keys';
import { JSONService } from '../json';

const logger = new Logger('HTTPClient');

export class HTTPClient {
  /**
   * Transforms a raw Response into a structured BackendApiError or Error.
   * This is used when throwHttpErrors: false is set.
   */
  private static async parseResponseError(response: Response): Promise<Error> {
    let data: unknown;

    try {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    } catch (e) {
      data = null;
    }

    // Try to parse using our standard API Error Schema
    const apiResult = ApiErrorSchema.safeParse(data);
    if (apiResult.success) {
      return new BackendApiError(apiResult.data);
    }

    // Fallback for unknown error formats
    const fallbackMessage =
      data && typeof data === 'object' && 'message' in data
        ? (data as Record<string, any>).message
        : `Request failed with status ${response.status}`;

    return new Error(fallbackMessage);
  }

  /**
   * Parses a raw ky HTTPError (fallback for hooks or unexpected errors).
   */
  public static async parseError(error: unknown): Promise<Error> {
    if (!(error instanceof HTTPError)) {
      return error instanceof Error ? error : new Error('An unexpected error occurred');
    }

    if (error.response.bodyUsed) {
      return new Error(error.message || 'Server Error (Body consumed)');
    }

    return HTTPClient.parseResponseError(error.response);
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
      },
    });
  }

  private async handleResponseError(error: Error) {
    if (error instanceof BackendApiError) {
      logger.error(JSONService.stringify(error));

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

    try {
      // Use throwHttpErrors: false to prevent ky from consuming the body on 4xx/5xx.
      // This is the most reliable way to ensure we can parse error details in React Native.
      const response = await this.instance(url, { ...options, throwHttpErrors: false });

      if (!response.ok) {
        logger.error(`FAILURE ${response.status} ${method.toUpperCase()} ${url}`);

        const error = await HTTPClient.parseResponseError(response);
        await this.handleResponseError(error);
        throw error;
      }

      const data = await response.json<T>();
      logger.debug(`SUCCESS ${method.toUpperCase()} ${url}`);
      return data;
    } catch (error) {
      // Wrap non-BackendApiErrors (like network failures)
      if (error instanceof BackendApiError) throw error;

      if (error && typeof error === 'object' && 'response' in error) {
        const parsedError = await HTTPClient.parseError(error);
        await this.handleResponseError(parsedError);
        throw parsedError;
      }

      throw error;
    }
  }
}
