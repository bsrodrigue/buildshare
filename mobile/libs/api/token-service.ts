import { Logger } from '@/libs/log';
import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';

const logger = new Logger('TokenService');

/**
 * TokenService provides a high-performance in-memory cache for authentication tokens.
 * It ensures that the HTTP client can access tokens synchronously while maintaining
 * persistence via SecureStorage.
 */
export class TokenService {
  private static accessToken: string | null = null;
  private static refreshToken: string | null = null;

  /**
   * Hydrates the in-memory cache from SecureStorage.
   * Should be called during application initialization.
   */
  static async loadTokens(): Promise<void> {
    try {
      const [access, refresh] = await Promise.all([
        SecureStorage.getItem(SecureStorageKey.BEARER_TOKEN),
        SecureStorage.getItem(SecureStorageKey.REFRESH_TOKEN),
      ]);

      this.accessToken = access;
      this.refreshToken = refresh;

      if (access) {
        logger.debug('Tokens hydrated from storage');
      } else {
        logger.debug('No tokens found in storage during hydration');
      }
    } catch (error) {
      logger.exception(error as Error, 'Failed to load tokens from SecureStorage');
      // Reset cache on error to ensure consistency
      this.accessToken = null;
      this.refreshToken = null;
    }
  }

  /**
   * Updates only the access token.
   */
  static async setAccessToken(token: string): Promise<void> {
    this.accessToken = token;
    try {
      await SecureStorage.setItem(SecureStorageKey.BEARER_TOKEN, token);
      logger.debug('Access token updated and persisted');
    } catch (error) {
      logger.exception(error as Error, 'Failed to persist access token');
    }
  }

  /**
   * Updates only the refresh token.
   */
  static async setRefreshToken(token: string): Promise<void> {
    this.refreshToken = token;
    try {
      await SecureStorage.setItem(SecureStorageKey.REFRESH_TOKEN, token);
      logger.debug('Refresh token updated and persisted');
    } catch (error) {
      logger.exception(error as Error, 'Failed to persist refresh token');
    }
  }

  /**
   * Updates both the in-memory cache and persistent storage.
   */
  static async setTokens(access: string, refresh: string): Promise<void> {
    // Run both updates in parallel for performance
    await Promise.all([this.setAccessToken(access), this.setRefreshToken(refresh)]);
  }

  /**
   * Wipes tokens from both memory and persistent storage.
   */
  static async clearTokens(): Promise<void> {
    this.accessToken = null;
    this.refreshToken = null;

    try {
      await Promise.all([
        SecureStorage.removeItem(SecureStorageKey.BEARER_TOKEN),
        SecureStorage.removeItem(SecureStorageKey.REFRESH_TOKEN),
      ]);
      logger.debug('Tokens cleared from memory and storage');
    } catch (error) {
      logger.exception(error as Error, 'Failed to clear tokens from storage');
    }
  }

  /**
   * Synchronously retrieves the current access token.
   */
  static getAccessToken(): string | null {
    return this.accessToken;
  }

  /**
   * Synchronously retrieves the current refresh token.
   */
  static getRefreshToken(): string | null {
    return this.refreshToken;
  }

  /**
   * Checks if the user has an access token.
   */
  static hasToken(): boolean {
    return !!this.accessToken;
  }
}
