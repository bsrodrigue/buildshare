import { createLogger } from '../log';

const logger = createLogger('Assert');

/**
 * Standard assertion utility for runtime and type-safe checks.
 * Informs TypeScript that the condition must be true for subsequent code.
 */
export function assert(condition: unknown, message?: string): asserts condition {
  if (!condition) {
    logger.error(message || 'Assertion failed');
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Asserts that a value is not null or undefined.
 */
export function assertExists<T>(value: T | null | undefined, message?: string): asserts value is T {
  if (value === null || value === undefined) {
    throw new Error(message || 'Value must exist');
  }
}
