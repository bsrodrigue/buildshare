/* eslint-disable deprecation/deprecation */
import { type Href, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { z } from 'zod';

import { Logger } from '../log';
import { Toaster } from '../notification/toast';

const logger = new Logger('RouterUtils');

/**
 * Hook that validates route parameters against a Zod schema.
 * If validation fails, it triggers a toast error and redirects to a fallback route.
 *
 * @param schema - The Zod schema to validate against
 * @param fallbackRoute - The route to redirect to on failure (defaults to '/')
 * @returns { params: T, isValid: boolean } - The validated parameters and validation status
 */
export function useValidatedParams<T extends z.ZodTypeAny>(schema: T, fallbackRoute: string = '/') {
  const params = useLocalSearchParams();
  const router = useRouter();
  const result = schema.safeParse(params);

  useEffect(() => {
    if (!result.success) {
      logger.error('Invalid route parameters', result.error.format());
      Toaster.error('Paramètres invalides', 'Redirection en cours...');
      router.replace(fallbackRoute as Href);
    }
  }, [result.success, result.error, router, fallbackRoute]);

  return {
    params: (result.success ? result.data : {}) as z.infer<T>,
    isValid: result.success,
  };
}
