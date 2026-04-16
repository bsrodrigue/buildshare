import AsyncStorage from '@react-native-async-storage/async-storage';

import { Logger } from '../log';
import { LocalStorageKey } from './keys';

const logger = new Logger('LocalStorage');

export class LocalStorage {
  /**
   * Saves a key-value pair to local storage.
   * @param key The key to store.
   * @param value The value to store.
   */
  static async setItem(key: LocalStorageKey, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(key, value);
      logger.debug(`Set item for key "${key}"`);
    } catch (error) {
      logger.exception(error as Error, `Failed to set item for key "${key}"`);
      throw error;
    }
  }

  /**
   * Retrieves a value from local storage.
   * @param key The key to retrieve.
   * @returns The value, or null if not found.
   */
  static async getItem(key: LocalStorageKey): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(key);
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
   * Removes an item from local storage.
   * @param key The key to remove.
   */
  static async removeItem(key: LocalStorageKey): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
      logger.debug(`Removed item for key "${key}"`);
    } catch (error) {
      logger.exception(error as Error, `Failed to remove item for key "${key}"`);
      throw error;
    }
  }

  /**
   * Saves an object to local storage as JSON.
   * @param key The key to store.
   * @param value The object to store.
   */
  static async setObject<T>(key: LocalStorageKey, value: T): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
      logger.debug(`Set object for key "${key}"`);
    } catch (error) {
      logger.exception(error as Error, `Failed to set object for key "${key}"`);
      throw error;
    }
  }

  /**
   * Retrieves an object from local storage.
   * @param key The key to retrieve.
   * @returns The parsed object, or null if not found.
   */
  static async getObject<T>(key: LocalStorageKey): Promise<T | null> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      if (jsonValue) {
        logger.debug(`Retrieved object for key "${key}"`);
        return JSON.parse(jsonValue) as T;
      } else {
        logger.debug(`No object found for key "${key}"`);
        return null;
      }
    } catch (error) {
      logger.exception(error as Error, `Failed to get object for key "${key}"`);
      throw error;
    }
  }
}
