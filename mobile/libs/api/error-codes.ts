/**
 * Centralized registry for custom application error codes.
 */
export enum ErrorCode {
  // Generic Errors (gen)
  VALIDATION_ERROR = 'gen_val_001',
  UNIQUE_CONSTRAINT_VIOLATED = 'gen_val_002',

  // Auth Errors (auth)
  AUTH_INVALID_CREDENTIALS = 'auth_val_001',
  AUTH_TOKEN_EXPIRED = 'auth_val_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'auth_val_003',
  AUTH_USER_NOT_FOUND = 'auth_val_004',
  AUTH_USER_INACTIVE = 'auth_val_005',
}
