import Constants from 'expo-constants';
import * as z from 'zod';

import { createLogger } from '../log';

const logger = createLogger('Env');

/**
 * Environment variable schema definition.
 * Add all required environment variables here.
 */
const envSchema = z.object({
  // Google Maps API Keys
  GOOGLE_MAPS_API_KEY: z.string().min(1, 'Google Maps API key is required'),
  GOOGLE_MAPS_DIRECTIONS_BASE_URL: z.string().min(1, 'Google Maps Directions Base URL is required'),
  GOOGLE_MAPS_API_KEY_IOS: z.string(),

  // OneSignal
  ONESIGNAL_APP_ID: z.string().min(1, 'OneSignal App ID is required'),

  // API Configuration
  API_URL: z.string().url('API URL must be a valid URL'),

  // Pusher
  PUSHER_KEY: z.string(),
  PUSHER_CLUSTER: z.string().optional(),
  PUSHER_HOST: z.string().min(1, 'Pusher host is required'),
  PUSHER_AUTH_ENDPOINT: z.string().url('Pusher auth endpoint must be a valid URL'),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and exports environment variables.
 * We resolve the config immediately to fail fast.
 */
function createEnv(): Env {
  const extra = Constants.expoConfig?.extra ?? {};

  const result = envSchema.safeParse(extra);

  if (!result.success) {
    const missingVars = result.error.issues
      .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    const errorMessage = `❌ Environment variable validation failed:\n${missingVars}\n\n` +
      `Please check your .env file and ensure all required variables are set.`;
    
    logger.error(errorMessage);
    // In development we want to see this clearly. In production it's a fatal error.
    throw new Error(errorMessage);
  }

  return result.data;
}

export const env = createEnv();

export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;
