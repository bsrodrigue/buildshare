import { SecureStorage } from '@/libs/secure-storage';
import { SecureStorageKey } from '@/libs/secure-storage/keys';

import { TokenService } from './token-service';

jest.mock('@/libs/secure-storage');
jest.mock('@/libs/log');

describe('TokenService', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await TokenService.clearTokens();
  });

  describe('loadTokens', () => {
    it('should hydrate tokens from SecureStorage', async () => {
      (SecureStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key === SecureStorageKey.BEARER_TOKEN) return Promise.resolve('access-123');
        if (key === SecureStorageKey.REFRESH_TOKEN) return Promise.resolve('refresh-456');
        return Promise.resolve(null);
      });

      await TokenService.loadTokens();

      expect(TokenService.getAccessToken()).toBe('access-123');
      expect(TokenService.getRefreshToken()).toBe('refresh-456');
      expect(TokenService.hasToken()).toBe(true);
    });

    it('should handle missing tokens in SecureStorage', async () => {
      (SecureStorage.getItem as jest.Mock).mockResolvedValue(null);

      await TokenService.loadTokens();

      expect(TokenService.getAccessToken()).toBe(null);
      expect(TokenService.getRefreshToken()).toBe(null);
      expect(TokenService.hasToken()).toBe(false);
    });

    it('should reset cache on storage error', async () => {
      // First set some tokens
      await TokenService.setTokens('old-access', 'old-refresh');

      (SecureStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage failure'));

      await TokenService.loadTokens();

      expect(TokenService.getAccessToken()).toBe(null);
      expect(TokenService.getRefreshToken()).toBe(null);
    });
  });

  describe('setTokens', () => {
    it('should update cache and persist tokens', async () => {
      await TokenService.setTokens('new-access', 'new-refresh');

      expect(TokenService.getAccessToken()).toBe('new-access');
      expect(TokenService.getRefreshToken()).toBe('new-refresh');

      expect(SecureStorage.setItem).toHaveBeenCalledWith(
        SecureStorageKey.BEARER_TOKEN,
        'new-access',
      );
      expect(SecureStorage.setItem).toHaveBeenCalledWith(
        SecureStorageKey.REFRESH_TOKEN,
        'new-refresh',
      );
    });
  });

  describe('individual setters', () => {
    it('should update only access token', async () => {
      await TokenService.setTokens('old-access', 'old-refresh');
      await TokenService.setAccessToken('new-access');

      expect(TokenService.getAccessToken()).toBe('new-access');
      expect(TokenService.getRefreshToken()).toBe('old-refresh');
      expect(SecureStorage.setItem).toHaveBeenCalledWith(
        SecureStorageKey.BEARER_TOKEN,
        'new-access',
      );
    });

    it('should update only refresh token', async () => {
      await TokenService.setTokens('old-access', 'old-refresh');
      await TokenService.setRefreshToken('new-refresh');

      expect(TokenService.getAccessToken()).toBe('old-access');
      expect(TokenService.getRefreshToken()).toBe('new-refresh');
      expect(SecureStorage.setItem).toHaveBeenCalledWith(
        SecureStorageKey.REFRESH_TOKEN,
        'new-refresh',
      );
    });
  });

  describe('clearTokens', () => {
    it('should wipe cache and persistent storage', async () => {
      await TokenService.setTokens('access', 'refresh');
      await TokenService.clearTokens();

      expect(TokenService.getAccessToken()).toBe(null);
      expect(TokenService.getRefreshToken()).toBe(null);

      expect(SecureStorage.removeItem).toHaveBeenCalledWith(SecureStorageKey.BEARER_TOKEN);
      expect(SecureStorage.removeItem).toHaveBeenCalledWith(SecureStorageKey.REFRESH_TOKEN);
    });
  });
});
