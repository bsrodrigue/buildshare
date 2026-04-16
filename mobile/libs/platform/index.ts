import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { assert } from '../assert';
import { Logger } from '../log';

const logger = new Logger('PlatformService');

export class PlatformService {
  /**
   * Get the current operating system (ios, android, web, etc.).
   */
  public static getPlatform(): string {
    const os = Platform.OS;
    logger.debug(`Detected platform: ${os}`);
    return os;
  }

  /**
   * Get the application version in canonical format (e.g., 1.0.0).
   * Fallback to '1.0.0' if not defined.
   */
  public static getAppVersion(): string {
    const version =
      Constants.expoConfig?.version || Constants.manifest2?.extra?.expoClient?.version;

    assert(
      version,
      '[PlatformService] Critical Error: Application version is not defined in app.json.',
    );

    logger.debug(`Detected app version: ${version}`);
    return version;
  }

  /**
   * Get the platform headers to be injected in HTTP requests.
   */
  public static getHeaders(): Record<string, string> {
    return {
      'X-App-Platform': this.getPlatform(),
      'X-App-Version': this.getAppVersion(),
    };
  }
}
