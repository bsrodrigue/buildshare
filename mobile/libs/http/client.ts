import {
  AxiosError,
  AxiosRequestConfig,
  AxiosResponse,
  create,
  InternalAxiosRequestConfig,
  isAxiosError,
} from 'axios';

import { ErrorCode } from '@/libs/api/error-codes';
import { ApiErrorSchema, AppError, BackendApiError, NetworkError } from '@/libs/api/types';
import { useAuthStore } from '@/modules/auth/store';

import { TokenService } from '../api/token-service';
import { JSONService } from '../json';
import { Logger } from '../log';
import { toast } from '../notification/toast';
import { PlatformService } from '../platform';

const logger = new Logger('HTTPClient');

type AnyRecord = Record<string, unknown>;

export class HTTPClient {
  private static retriedUrls = new Set<string>();
  private readonly baseURL: string;
  private readonly instance;
  private refreshPromise: Promise<string | null> | null = null;

  getBaseUrl(): string {
    return this.baseURL;
  }

  constructor(baseURL: string, config?: AxiosRequestConfig) {
    this.baseURL = baseURL;

    this.instance = create({
      baseURL,
      timeout: 15000,
      ...config,
    });

    this.instance.interceptors.request.use((request: InternalAxiosRequestConfig) => {
      const token = TokenService.getAccessToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);

      const platformHeaders = PlatformService.getHeaders();
      Object.entries(platformHeaders).forEach(([key, value]) => request.headers.set(key, value));

      logger.debug(`${request.method?.toUpperCase()} ${baseURL}${request.url}`);
      return request;
    });

    this.instance.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          logger.error(
            `FAILURE ${error.response.status} ${error.config?.method?.toUpperCase()} ${error.config?.url}`,
          );
        }
        throw HTTPClient.parseError(error);
      },
    );
  }

  /**
   * Transforms an axios error into a typed AppError.
   */
  private static parseError(error: unknown): AppError {
    if (isAxiosError(error)) {
      if (error.response) {
        return HTTPClient.parseResponseError(error.response);
      }
      const isTimeout =
        error.code === 'ECONNABORTED' || error.message.toLowerCase().includes('timeout');
      if (isTimeout || error.request) {
        return new NetworkError();
      }
    }
    return error instanceof Error ? error : new Error('An unexpected error occurred');
  }

  /**
   * Parses a non-2xx response body into a BackendApiError or Error.
   */
  private static parseResponseError(response: AxiosResponse): AppError {
    const data = response.data as unknown;
    let responseData: unknown = data;
    let rawText = '';

    if (typeof data === 'string') {
      rawText = data;
      try {
        responseData = JSON.parse(data);
      } catch {
        responseData = data;
      }
    } else {
      try {
        rawText = JSON.stringify(data);
      } catch {
        rawText = '';
      }
    }

    if (rawText) {
      logger.error(`[Response Body]: ${rawText}`);
    }

    // Standard API error format: { code, message, fields }
    const apiResult = ApiErrorSchema.safeParse(responseData);
    if (apiResult.success) {
      return new BackendApiError(apiResult.data);
    }

    // FastAPI wraps HTTPException detail in {"detail": {...}}
    if (isRecord(responseData) && isRecord(responseData.detail)) {
      const nestedResult = ApiErrorSchema.safeParse(responseData.detail);
      if (nestedResult.success) {
        return new BackendApiError(nestedResult.data);
      }
    }

    const message =
      isRecord(responseData) && typeof responseData.message === 'string'
        ? responseData.message
        : `Request failed with status ${response.status}`;
    return new Error(message);
  }

  private async handleResponseError(error: AppError) {
    if (!(error instanceof BackendApiError)) {
      logger.error(`API Error: ${error.message}`);
      return;
    }

    const fieldsLog =
      error.fields && Object.keys(error.fields).length > 0
        ? ` | Fields: ${JSONService.stringify(error.fields)}`
        : '';
    logger.error(`Backend Error [${error.code}]: ${error.message}${fieldsLog}`);

    // 401: Clear session and redirect. AUTH_TOKEN_EXPIRED is retried in execute().
    if (HTTPClient.isAuthError(error.code)) {
      const { logout, isAuthenticated } = useAuthStore.getState();
      if (isAuthenticated) {
        toast.error('Session expirée. Veuillez vous reconnecter.');
        void logout();
      }
    }
  }

  private static isAuthError(code: string): boolean {
    return [
      ErrorCode.AUTH_TOKEN_EXPIRED,
      ErrorCode.AUTH_INVALID_CREDENTIALS,
      ErrorCode.AUTH_SESSION_EXPIRED,
      ErrorCode.AUTH_TOKEN_INVALID,
      ErrorCode.AUTH_NOT_AUTHENTICATED,
      ErrorCode.AUTH_AUTHENTICATION_FAILED,
      ErrorCode.AUTH_USER_NOT_FOUND,
    ].includes(code as ErrorCode);
  }

  /**
   * Resets the retry tracking state. Useful after a successful logout or login.
   */
  public static resetRetryState(): void {
    HTTPClient.retriedUrls.clear();
  }

  private async refreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const refreshToken = TokenService.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        logger.debug('Attempting to refresh token...');

        const response = await this.instance.post<{ access: string }>('auth/token/refresh/', {
          refresh: refreshToken,
        });

        await TokenService.setAccessToken(response.data.access);
        HTTPClient.retriedUrls.clear();
        logger.debug('Token refreshed successfully');
        return response.data.access;
      } catch (error) {
        logger.error(
          'Token refresh failed',
          error instanceof Error ? error.message : String(error),
        );
        return null;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  // --- Public API Methods ---

  public get = <T>(url: string, config?: AxiosRequestConfig) =>
    this.execute<T>('get', url, undefined, config);

  public post = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    this.execute<T>('post', url, data, config);

  public put = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    this.execute<T>('put', url, data, config);

  public patch = <T>(url: string, data?: unknown, config?: AxiosRequestConfig) =>
    this.execute<T>('patch', url, data, config);

  public delete = <T>(url: string, config?: AxiosRequestConfig) =>
    this.execute<T>('delete', url, undefined, config);

  private async execute<T>(
    method: string,
    url: string,
    data?: unknown,
    config?: AxiosRequestConfig,
  ): Promise<T> {
    if (data !== undefined) {
      logger.debug(
        `[Payload]: ${data instanceof FormData ? 'FormData' : JSONService.stringify(data)}`,
      );
    }

    try {
      const response = await this.instance.request<T>({ method, url, data, ...config });

      if (
        response.status === 204 ||
        response.status === 205 ||
        response.data === undefined ||
        response.data === null ||
        response.data === ''
      ) {
        logger.debug(`SUCCESS (No Content) ${method.toUpperCase()} ${url}`);
        return {} as T;
      }

      logger.debug(`SUCCESS ${method.toUpperCase()} ${url}`);
      return response.data;
    } catch (error) {
      if (error instanceof BackendApiError || error instanceof NetworkError) {
        // Retry once on token expiry with a refreshed token
        const retryKey = `${method}:${url}`;
        if (
          error instanceof BackendApiError &&
          error.code === ErrorCode.AUTH_TOKEN_EXPIRED &&
          !url.includes('auth/token/refresh/') &&
          !HTTPClient.retriedUrls.has(retryKey)
        ) {
          HTTPClient.retriedUrls.add(retryKey);
          const newToken = await this.refreshToken();
          if (newToken) {
            return this.execute<T>(method, url, data, config);
          }
        }

        if (error instanceof BackendApiError) {
          await this.handleResponseError(error);
        }
        throw error;
      }

      const parsedError = HTTPClient.parseError(error);
      await this.handleResponseError(parsedError);
      throw parsedError;
    }
  }
}

function isRecord(value: unknown): value is AnyRecord {
  return typeof value === 'object' && value !== null;
}
