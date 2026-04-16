import { LocalStorage } from '@/libs/local-storage';
import { LocalStorageKey } from '@/libs/local-storage/keys';
import { Logger } from '@/libs/log';

const logger = new Logger('FlagService');

/**
 * FlagService provides utility methods to manage application state flags,
 * like onboarding completion, rationale visibility, etc.
 */
export class FlagService {
  /**
   * Resets the geolocation rationale flag specifically.
   * Useful for testing the location permission flow.
   */
  static async resetLocationRationale(): Promise<void> {
    try {
      await LocalStorage.removeItem(LocalStorageKey.HAS_SEEN_LOCATION_RATIONALE);
      logger.info('Geolocation rationale flag has been reset successfully.');
    } catch (error) {
      logger.exception(error as Error, 'Failed to reset geolocation rationale flag');
      throw error;
    }
  }

  /**
   * Marks the geolocation rationale as seen.
   */
  static async markLocationRationaleAsSeen(): Promise<void> {
    try {
      await LocalStorage.setItem(LocalStorageKey.HAS_SEEN_LOCATION_RATIONALE, 'true');
      logger.debug('Geolocation rationale marked as seen.');
    } catch (error) {
      logger.exception(error as Error, 'Failed to mark location rationale as seen');
      throw error;
    }
  }

  /**
   * Checks if a specific flag is set.
   * @param key Flag key from LocalStorageKey
   */
  static async isFlagSet(key: LocalStorageKey): Promise<boolean> {
    try {
      const value = await LocalStorage.getItem(key);
      return value === 'true';
    } catch (error) {
      logger.exception(error as Error, `Failed to check flag: ${key}`);
      return false;
    }
  }

  /**
   * Resets all known onboarding and UI-related flags.
   */
  static async resetAllOnboardingFlags(): Promise<void> {
    const onboardingKeys = [LocalStorageKey.HAS_SEEN_LOCATION_RATIONALE];

    try {
      logger.debug(`Resetting ${onboardingKeys.length} onboarding flags...`);
      await Promise.all(onboardingKeys.map((key) => LocalStorage.removeItem(key)));
      logger.info('All onboarding flags have been cleared.');
    } catch (error) {
      logger.exception(error as Error, 'Failed to reset all onboarding flags');
      throw error;
    }
  }
}
