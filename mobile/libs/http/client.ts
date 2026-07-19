import ky, { HTTPError, Options } from 'ky';

import { ErrorCode } from '@/libs/api/error-codes';
import { ApiErrorSchema, AppError, BackendApiError, NetworkError } from '@/libs/api/types';

import { TokenService } from '../api/token-service';
import { JSONService } from '../json';
import { Logger } from '../log';
import { toast } from '../notification/toast';
import { PlatformService } from '../platform';

const logger = new Logger('HTTPClient');

export class HTTPClient {
  private instance: typeof ky;
  private static refreshPromise: Promise<string | null> | null = null;
  private baseURL: string;

  getBaseUrl(): string {
    return this.baseURL;
  }

  constructor(baseURL: string, config?: Options) {
    this.baseURL = baseURL;
    this.instance = ky.create({
      prefix: baseURL,
      timeout: 15000,
      ...config,

      // Hooks Configurations
      hooks: {
        beforeRequest: [
          ({ request }) => {
            const token = TokenService.getAccessToken();
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

    // FastAPI wraps HTTPException detail in {"detail": {...}}
    if (
      responseData &&
      typeof responseData === 'object' &&
      'detail' in responseData
    ) {
      const detail = (responseData as Record<string, unknown>).detail;
      const nestedResult = ApiErrorSchema.safeParse(detail);
      if (nestedResult.success) {
        return new BackendApiError(nestedResult.data);
      }
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

  private async handleResponseError(error: AppError) {
    if (error instanceof BackendApiError) {
      const fieldsLog =
        error.fields && Object.keys(error.fields).length > 0
          ? ` | Fields: ${JSONService.stringify(error.fields)}`
          : '';
      logger.error(`Backend Error [${error.code}]: ${error.message}${fieldsLog}`);

      // 401: Unauthorized (Clear session and redirect)
      // Note: AUTH_TOKEN_EXPIRED is handled in execute() for automatic refresh
      if (
  error.code === ErrorCode.AUTH_TOKEN_EXPIRED ||
  error.code === ErrorCode.AUTH_INVALID_CREDENTIALS ||
  error.code === ErrorCode.AUTH_SESSION_EXPIRED ||
  error.code === ErrorCode.AUTH_TOKEN_INVALID ||
  error.code === ErrorCode.AUTH_NOT_AUTHENTICATED ||
  error.code === ErrorCode.AUTH_AUTHENTICATION_FAILED ||
  error.code === ErrorCode.AUTH_USER_NOT_FOUND
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

  private async refreshToken(): Promise<string | null> {
    if (HTTPClient.refreshPromise) {
      return HTTPClient.refreshPromise;
    }

    HTTPClient.refreshPromise = (async () => {
      try {
        const refreshToken = TokenService.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        logger.debug('Attempting to refresh token...');

        // Call the refresh endpoint directly to avoid interceptors/recursion
        const response = await this.instance
          .post('auth/token/refresh/', {
            json: { refresh: refreshToken },
            // Important: don't use the standard execute flow to avoid 401 loops
          })
          .json<{ access: string }>();

        await TokenService.setAccessToken(response.access);
        logger.debug('Token refreshed successfully');
        return response.access;
      } catch (error) {
        logger.error('Token refresh failed', (error as Error).message);
        return null;
      } finally {
        HTTPClient.refreshPromise = null;
      }
    })();

    return HTTPClient.refreshPromise;
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
        const error = await HTTPClient.parseResponseError(response);

        // Handle automatic token refresh
        if (
          error instanceof BackendApiError &&
          error.code === ErrorCode.AUTH_TOKEN_EXPIRED &&
          !url.includes('auth/token/refresh/')
        ) {
          const newToken = await this.refreshToken();
          if (newToken) {
            // Retry the request with the new token
            // The beforeRequest hook will pick up the new token from TokenService
            return this.execute<T>(method, url, data, config);
          }
        }

        logger.error(`FAILURE ${response.status} ${method.toUpperCase()} ${url}`);
        await this.handleResponseError(error);
        throw error;
      }

      if (response.status === 204 || response.status === 205) {
        logger.debug(`SUCCESS (No Content) ${method.toUpperCase()} ${url}`);
        return {} as T;
      }

      const rawBody = await response.text();
      if (!rawBody || rawBody.trim() === '') {
        logger.debug(`SUCCESS (Empty Body) ${method.toUpperCase()} ${url}`);
        return {} as T;
      }

      const responseData = JSON.parse(rawBody) as T;
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
