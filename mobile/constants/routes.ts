export const ROUTES = {
  AUTH: {
    LOGIN: '/(auth)/login',
    REGISTER: '/(auth)/register',
    FORGOT_PASSWORD: '/(auth)/forgot-password',
    RESET_PASSWORD: '/(auth)/reset-password',
  },
  PROTECTED: {
    HOME: '/(protected)',
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
