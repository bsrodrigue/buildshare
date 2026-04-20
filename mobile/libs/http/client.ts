import ky, { HTTPError, Options } from 'ky';

import { ErrorCode } from '@/libs/api/error-codes';
import { ApiErrorSchema, AppError, BackendApiError, NetworkError } from '@/libs/api/types';

import { JSONService } from '../json';
import { Logger } from '../log';
import { toast } from '../notification/toast';
import { PlatformService } from '../platform';
import { SecureStorage } from '../secure-storage';
import { SecureStorageKey } from '../secure-storage/keys';

const logger = new Logger('HTTPClient');

export class HTTPClient {
  /**
   * Transforms a raw Response into a structured BackendApiError or Error.
   * This is used when throwHttpErrors: false is set.
   */
  private static async parseResponseError(response: Response): Promise<AppError> {
    let responseData: unknown;
    let rawText = '';

    try {
      rawText = await response.text();
      try {
        responseData = JSON.parse(rawText);
      } catch {
        responseData = rawText;
      }
    } catch {
      responseData = null;
    }

    if (rawText) {
      logger.error(`[Response Body]: ${rawText}`);
    }

    // Try to parse using our standard API Error Schema
    const apiResult = ApiErrorSchema.safeParse(responseData);
    if (apiResult.success) {
      return new BackendApiError(apiResult.data);
    }

    // Fallback for unknown error formats
    const fallbackMessage =
      responseData && typeof responseData === 'object' && 'message' in responseData
        ? ((responseData as Record<string, unknown>).message as string)
        : `Request failed with status ${response.status}`;

    return new Error(fallbackMessage);
  }

  /**
   * Parses a raw ky HTTPError (fallback for hooks or unexpected errors).
   */
  public static async parseError(error: unknown): Promise<AppError> {
    if (error instanceof HTTPError) {
      if (error.response.bodyUsed) {
        return new Error(error.message || 'Server Error (Body consumed)');
      }
      return HTTPClient.parseResponseError(error.response);
    }

    if (error instanceof Error) {
      // Handle ky timeouts or network errors
      if (error.name === 'TimeoutError' || error.message.includes('network')) {
        return new NetworkError();
      }
      return error;
    }

    return new Error('An unexpected error occurred');
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

  private async handleResponseError(error: AppError) {
    if (error instanceof BackendApiError) {
      const fieldsLog =
        error.fields && Object.keys(error.fields).length > 0
          ? ` | Fields: ${JSONService.stringify(error.fields)}`
          : '';
      logger.error(`Backend Error [${error.code}]: ${error.message}${fieldsLog}`);

      // 401: Unauthorized (Clear session and redirect)
      if (
        error.code === ErrorCode.AUTH_TOKEN_EXPIRED ||
        error.code === ErrorCode.AUTH_INVALID_CREDENTIALS ||
        error.code === ErrorCode.AUTH_SESSION_EXPIRED ||
        error.code === ErrorCode.AUTH_TOKEN_INVALID ||
        error.code === ErrorCode.AUTH_NOT_AUTHENTICATED ||
        error.code === ErrorCode.AUTH_AUTHENTICATION_FAILED
      ) {
        const { logout, isAuthenticated } = (
          await import('@/modules/auth/store')
        ).useAuthStore.getState();

        if (isAuthenticated) {
          toast.error('Session expirée. Veuillez vous reconnecter.');
          void logout();
        }
      }
    } else {
      logger.error(`API Error: ${error.message}`);
    }
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
        logger.debug('[Payload]: FormData (not serializable via JSON)');
      } else {
        options.json = data;
        logger.debug(`[Payload]: ${JSONService.stringify(data)}`);
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

      if (response.status === 204 || response.status === 205) {
        logger.debug(`SUCCESS (No Content) ${method.toUpperCase()} ${url}`);
        return {} as T;
      }

      const responseData = await response.json<T>();
      logger.debug(`SUCCESS ${method.toUpperCase()} ${url}`);
      return responseData;
    } catch (error) {
      // Wrap non-AppErrors (like network failures)
      if (error instanceof BackendApiError || error instanceof NetworkError) throw error;

      const parsedError = await HTTPClient.parseError(error);
      await this.handleResponseError(parsedError);
      throw parsedError;
    }
  }
}
