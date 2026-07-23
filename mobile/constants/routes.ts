export const ROUTES = {
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    VERIFY_OTP: '/(auth)/verify-otp',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    RESET_PASSWORD: '/(auth)/reset-password',
  },
  PROTECTED: {
    HOME: '/(protected)',
    SETTINGS: '/(protected)/settings',
    CHANGE_PASSWORD: '/(protected)/settings/change-password',
    CHANGE_EMAIL: '/(protected)/settings/change-email',
    DELETE_ACCOUNT: '/(protected)/settings/delete-account',
  },
} as const;

/**
 * Utility type to extract all leaf values (routes) from the ROUTES object recursively.
 */
type RouteValues<T> = T extends string
  ? T
  : T extends object
    ? { [K in keyof T]: RouteValues<T[K]> }[keyof T]
    : never;

export type AppRoute = RouteValues<typeof ROUTES>;
