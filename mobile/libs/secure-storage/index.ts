import * as SecureStore from 'expo-secure-store';

import { Logger } from '../log';
import { SecureStorageKey } from './keys';

const logger = new Logger('SecureStorage');

export class SecureStorage {
  /**
   * Saves a key-value pair to secure storage.
   * @param key The key to store.
   * @param value The value to store.
   */
  static async setItem(key: SecureStorageKey, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
      logger.debug(`Set item for key "${key}"`);
    } catch (error) {
      logger.exception(error as Error, `Failed to set item for key "${key}"`);
      throw error;
    }
  }

  /**
   * Retrieves a value from secure storage.
   * @param key The key to retrieve.
   * @returns The value, or null if not found.
   */
  static async getItem(key: SecureStorageKey): Promise<string | null> {
    try {
      const value = await SecureStore.getItemAsync(key);
      if (value) {
        logger.debug(`Retrieved item for key "${key}"`);
      } else {
        logger.debug(`No item found for key "${key}"`);
      }
      return value;
    } catch (error) {
      logger.exception(error as Error, `Failed to get item for key "${key}"`);
      throw error;
    }
  }

  /**
   * Removes an item from secure storage.
   * @param key The key to remove.
   */
  static async removeItem(key: SecureStorageKey): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
      logger.debug(`Removed item for key "${key}"`);
    } catch (error) {
      logger.exception(error as Error, `Failed to remove item for key "${key}"`);
      throw error;
    }
  }
}
