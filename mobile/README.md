<p align="center">
  <img src="./assets/images/logos/buildshare_logo.png" width="200" alt="BuildShare Logo" />
</p>

# BuildShare

The BuildShare mobile client allows testers to browse projects, view release histories, and download artifacts directly to their Android devices.

## Overview

The app is organized around role-based navigation with separate experiences for:

- client
- seller
- delivery man
- influencer
- job publisher
- admin

Core product areas currently implemented in the codebase include:

- shop browsing, cart, checkout, and order tracking
- seller product and order management
- delivery course assignment, tracking, and history
- jobs listing, saved jobs, and applications
- pharmacy discovery and map/location-based search
- subscriptions and account management
- push notifications and realtime updates

## Tech Stack

- Expo SDK 54
- React 19
- React Native 0.81
- Expo Router 6
- TypeScript 5.9
- Zustand for app/module state
- React Hook Form + Zod for forms and validation
- TanStack React Query for imperative mutation/fetch orchestration via shared hooks
- Axios-based API client abstraction
- OneSignal for push notifications
- Pusher for realtime events

## Project Structure

The codebase is organized by app routes, domain modules, and shared libraries.

```text
app/
  (auth)/
  (protected)/
    (client)/
    (delivery_man)/
    (influencer)/
    (job_publisher)/
    (seller)/
    order-details/
    seller-order-details/

modules/
  auth/
  cart/
  companies/
  courses/
  deliveries/
  delivery-addresses/
  delivery-man/
  influencer/
  jobs/
  notifications/
  orders/
  pharmacies/
  product-categories/
  products/
  profile/
  seller-orders/
  shared/
  shops/
  subscriptions/

hooks/
  api/
  geolocation/
  init/
  realtime/

libs/
  api/
  app-config/
  assets/
  datetime/
  env/
  fmt/
  fs/
  geolocation/
  http/
  json/
  local-storage/
  log/
  maps/
  notification/
  push-notification/
  realtime/
  secure-storage/
```

## Architecture Notes

The repository follows the modular conventions documented in [GEMINI.md](./GEMINI.md):

- `modules/<domain>/api.ts`: validated API calls
- `modules/<domain>/hooks.ts`: React hooks wrapping API operations
- `modules/<domain>/types.ts`: Zod schemas and inferred TypeScript types
- `modules/<domain>/store/`: Zustand stores when cross-screen state is needed
- `modules/shared/`: reusable UI, layout, theme, and shared views
- `libs/`: infrastructure and service abstractions

Common patterns used throughout the app:

- all network access goes through `APIService`
- request/response validation is done with Zod
- imperative async work uses the shared `useCall` hook in [hooks/api/index.ts](./hooks/api/index.ts)
- styling is theme-first via `useTheme` and `useThemedStyles`
- Expo Router provides file-based navigation

## Environment

The app reads build/runtime configuration from environment variables referenced in [app.config.ts](./app.config.ts).

Expected variables:

- `EXPO_PUBLIC_API_URL`
- `EXPO_PUBLIC_ONESIGNAL_APP_ID`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY`
- `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_IOS`
- `EXPO_PUBLIC_GOOGLE_MAPS_DIRECTIONS_BASE_URL`
- `EXPO_PUBLIC_PUSHER_KEY`
- `EXPO_PUBLIC_PUSHER_CLUSTER`
- `EXPO_PUBLIC_PUSHER_HOST`
- `EXPO_PUBLIC_PUSHER_AUTH_ENDPOINT`
- `APP_VARIANT`

Example setup:

```bash
cp .env.example .env
```

Then fill the required keys before running native features that depend on maps, push, or realtime.

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Xcode for iOS builds
- Android Studio for Android builds
- Expo / EAS tooling as needed

### Install

```bash
npm install
```

### Run Locally

```bash
npm start
npm run android
npm run ios
npm run web
```

## Quality Checks

Current project scripts:

```bash
npm run lint
npm run lint:fix
npm run lint:expo
npm run typecheck
npm run test
npm run test:coverage
npm run format
```

What they do:

- `npm run lint`: full-repo ESLint over `app`, `modules`, `libs`, and `hooks`
- `npm run lint:fix`: auto-fix supported ESLint issues across the same directories
- `npm run lint:expo`: Expo’s built-in lint entry point
- `npm run typecheck`: TypeScript compile check with `tsc --noEmit`

## Git Hooks

Husky is configured locally:

- `pre-commit`: runs `lint-staged`
- `pre-push`: runs full `npm run lint` and `npm run typecheck`

`lint-staged` currently:

- fixes staged `js/jsx/ts/tsx` files with ESLint
- formats staged source, JSON, Markdown, and CSS files with Prettier

## Testing

Jest is configured with `jest-expo`.

Run:

```bash
npm run test
npm run test:coverage
```

There is also a `maestro/` directory for mobile flow testing assets.

## Build and Release

EAS profiles are defined in [eas.json](./eas.json):

- `development`: internal dev client build
- `preview`: internal APK build
- `production`: store distribution
- `production-apk`: production config but exported as APK

Examples:

```bash
eas build --platform android --profile preview
eas build --platform android --profile production
eas build --platform ios --profile production
```

Android release optimization is already enabled in native config:

- Hermes enabled
- minification enabled
- resource shrinking enabled

## Assets and Native Configuration

Key app metadata lives in [app.config.ts](./app.config.ts):

- app name / slug / version
- bundle identifiers and package name
- splash screen and icons
- OneSignal plugin setup
- location permissions
- build properties and Android architecture selection

Static assets live in `assets/`, while asset references used by the app are centralized in [libs/assets/index.ts](./libs/assets/index.ts).

## Documentation References

Additional project documentation is available in:

- [GEMINI.md](./GEMINI.md): coding standards and architectural conventions
- `docs/`: feature notes, UX research, and implementation references
- [document.json](./document.json): API/OpenAPI reference used to align modules with backend contracts

## Troubleshooting

Useful recovery commands:

```bash
npx expo start -c
rm -rf node_modules && npm install
cd ios && pod install && cd ..
cd android && ./gradlew clean && cd ..
```

For day-to-day development, run lint and typecheck before pushing:

```bash
npm run lint
npm run typecheck
```
