import { z } from 'zod';

import { createLogger } from '../log';

const logger = createLogger('Validation');

/**
 * Validates data against a Zod schema and logs detailed errors if it fails.
 * Use this in services to avoid "silent" parsing failures.
 */
export const validateModel = <T>(schema: z.ZodType<T>, data: unknown, context?: string): T => {
  try {
    return schema.parse(data);
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error(`❌ Validation failed ${context ? `for [${context}]` : ''}`, {
        issues: err.issues,
        receivedData: data,
      });
    }
    throw err;
  }
};
