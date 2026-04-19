/**
 * Defines the available log levels, ordered by severity (lowest to highest).
 */
export enum LogLevel {
  DEBUG = 0, // Most verbose (e.g., component render cycles, state changes)
  INFO = 1, // General information (e.g., service calls, successful actions)
  WARN = 2, // Potential problems (e.g., deprecated usage, fallback logic)
  ERROR = 3, // Actual errors (e.g., failed network calls, exceptions)
  SILENT = 4, // Turns off all logging
}

// ------------------------------------------------------------------
// ANSI COLOR CODES
// ------------------------------------------------------------------
const Colors = {
  reset: '\x1b[0m',
  // Level colors
  debug: '\x1b[36m', // Cyan
  info: '\x1b[32m', // Green
  warn: '\x1b[33m', // Yellow
  error: '\x1b[31m', // Red
  // Structural colors
  timestamp: '\x1b[90m', // Gray
  module: '\x1b[35m', // Magenta
} as const;

/**
 * A custom, lightweight Logger class without third-party dependencies.
 * It provides structured, level-based, colored logging for clear diagnostics.
 *
 * Usage:
 * ```ts
 * const logger = new Logger('MyModule');
 * logger.debug('Hello world');
 * // Output: [14:30:05] [MyModule:DEBUG] Hello world
 * ```
 */
export class Logger {
  // ------------------------------------------------------------------
  // STATIC CONFIGURATION (shared across all instances)
  // ------------------------------------------------------------------

  /** Global minimum log level. Logs below this level are suppressed across all instances. */
  private static minLevel: LogLevel = __DEV__ ? LogLevel.DEBUG : LogLevel.ERROR;

  /**
   * Sets the minimum log level that will be displayed for all Logger instances.
   * Logs with a severity less than this level will be suppressed.
   * @param level - The new minimum LogLevel.
   */
  public static setMinLevel(level: LogLevel): void {
    Logger.minLevel = level;
  }

  // ------------------------------------------------------------------
  // INSTANCE CONFIGURATION
  // ------------------------------------------------------------------

  /** The module name prefix for this logger instance's messages. */
  private readonly moduleName: string;

  /**
   * Creates a new Logger instance scoped to a specific module.
   * @param moduleName - The name of the module, service, or component using this logger.
   */
  constructor(moduleName: string) {
    this.moduleName = moduleName;
  }

  // ------------------------------------------------------------------
  // CORE LOGGING MECHANISM
  // ------------------------------------------------------------------

  /**
   * Formats the current time as HH:MM:SS.
   */
  private getTimestamp(): string {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  }

  /**
   * Returns the ANSI color code for a given log level.
   */
  private getLevelColor(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return Colors.debug;
      case LogLevel.INFO:
        return Colors.info;
      case LogLevel.WARN:
        return Colors.warn;
      case LogLevel.ERROR:
        return Colors.error;
      default:
        return Colors.reset;
    }
  }

  /**
   * Returns an icon representing the log level.
   */
  private getLevelIcon(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '🔍';
      case LogLevel.INFO:
        return '✨';
      case LogLevel.WARN:
        return '⚠️';
      case LogLevel.ERROR:
        return '🚨';
      default:
        return '📝';
    }
  }

  /**
   * Pretty prints optional parameters if they are objects.
   */
  private formatParams(params: unknown[]): unknown[] {
    return params.map((param) => {
      if (typeof param === 'object' && param !== null) {
        // Special handling for Error objects (stringifying them returns {})
        if (param instanceof Error) {
          return param;
        }

        try {
          // Pretty print objects with 2-space indentation
          return JSON.stringify(param, null, 2);
        } catch {
          // Fallback if circular reference or other stringify error
          return param;
        }
      }
      return param;
    });
  }

  /**
   * Central function that handles formatting and conditional output.
   * @param level - The severity level of the current log call.
   * @param message - The main log message (string).
   * @param optionalParams - Additional data (objects, arrays, errors) to log.
   */
  private log(level: LogLevel, message: string, ...optionalParams: unknown[]): void {
    // 1. Level Check (Conditional Logging)
    if (level < Logger.minLevel) {
      return; // Suppress logs below the configured minimum level
    }

    // 2. Formatting with colors and icon
    const timestamp = this.getTimestamp();
    const levelName = LogLevel[level]; // e.g., 'DEBUG', 'INFO'
    const levelColor = this.getLevelColor(level);
    const icon = this.getLevelIcon(level);

    const prefix =
      `${Colors.timestamp}[${timestamp}]${Colors.reset} ` +
      `${icon} ${Colors.module}[${this.moduleName}${Colors.reset}:${levelColor}${levelName}${Colors.reset}]`;

    // 3. Pretty print objects in optionalParams
    const formattedParams = this.formatParams(optionalParams);

    // 4. Output to Console
    const output = [prefix, message, ...formattedParams];

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(...output);
        break;
      case LogLevel.INFO:
        console.debug(...output);
        break;
      case LogLevel.WARN:
        console.warn(...output);
        break;
      case LogLevel.ERROR:
        console.error(...output);
        break;
      default:
        console.debug(...output);
    }
  }

  // ------------------------------------------------------------------
  // PUBLIC API METHODS
  // ------------------------------------------------------------------

  /** Logs detailed information, typically suppressed in production. */
  public debug(message: string, ...optionalParams: unknown[]): void {
    this.log(LogLevel.DEBUG, message, ...optionalParams);
  }

  /** Logs general application flow information. */
  public info(message: string, ...optionalParams: unknown[]): void {
    this.log(LogLevel.INFO, message, ...optionalParams);
  }

  /** Logs potential issues that do not immediately stop execution. */
  public warn(message: string, ...optionalParams: unknown[]): void {
    this.log(LogLevel.WARN, message, ...optionalParams);
  }

  /** Logs critical errors that prevent normal operation. */
  public error(message: string, ...optionalParams: unknown[]): void {
    this.log(LogLevel.ERROR, message, ...optionalParams);
  }

  /** Logs critical errors, including a full stack trace for exceptions. */
  public exception(error: Error, message?: string, ...optionalParams: unknown[]): void {
    const msg = message || error.message;
    this.log(LogLevel.ERROR, `EXCEPTION: ${msg}`, error, ...optionalParams);
  }
}

/**
 * Factory function to create a new Logger instance.
 */
export const createLogger = (moduleName: string) => new Logger(moduleName);
