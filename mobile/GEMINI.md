# Songre - Coding Practices & Guidelines

This document serves as the "Source of Truth" for coding standards and best practices used in Songre development.

## 1. Project Architecture

### 1.1 Modular Structure

Features are organized by domain in the `modules/` directory (e.g., `auth/`, `jobs/`, `cart/`). Each module should follow this consistent structure:

- `api.ts`: Pure functions for network requests using `APIService`.
- `hooks.ts`: React hooks orchestrating data fetching (using `useCall`) and local state.
- `types.ts`: Zod schemas for validation and their inferred TypeScript types.
- `store/`: Zustand stores for cross-component state (`index.ts`).
- `screens/`: Top-level screen components (using Expo Router).
- `components/`: UI components private to the module.

### 1.2 Service Abstractions (`libs/`)

Core functionality is abstracted in `libs/` to ensure consistency and easier maintenance (e.g., `api/`, `log/`, `notification/`, `storage/`). **Always prefer using these abstractions over raw third-party libraries.**

---

## 2. API & Data Fetching

### 2.1 The `useCall` Pattern

All mutations and imperative API calls should use the `useCall` hook (shared in `hooks/api/index.ts`).

- **Feature**: Automatic error vibration (haptics) on failure.
- **Feature**: Integrated logging via the `Logger` service.
- **Feature**: Standardized `onSuccess`/`onError` callbacks.

### 2.2 Zod Everywhere (The "Contract" Principle)

- **Input Validation**: Always parse API function parameters with `Schema.parse(params)`.
- **Output Validation**: Always parse API responses with `Schema.parse(response.data)` before returning. This prevents "broken" data from entering the app state if the backend schema changes.
- **Implementation Check**: **ALWAYS** check the `document.json` (OpenAPI spec) to ensure all available endpoints and their specific data structures are correctly implemented in the `api.ts` of the corresponding module.

```typescript
export async function myAction(params: MyParams): Promise<MyResponse> {
  const validatedInput = MyParamsSchema.parse(params); // Step 1: Validate request
  const response = await apiClient.post('endpoint', validatedInput);
  return MyResponseSchema.parse(response.data); // Step 2: Validate response
}
```

---

## 3. State Management

### 3.1 Global State (Zustand)

- Use Zustand for data that must persist across screens or modules (e.g., Auth state, Cart).
- Define stores in `modules/*/store/index.ts`.
- **Naming**: Export the hook as `use[ModuleName]Store` (e.g., `useAuthStore`).

### 3.2 Form State (React Hook Form)

- Use `react-hook-form` along with `@hookform/resolvers/zod` for all forms.
- This ensures UI validation is 100% consistent with API schemas in `types.ts`.

---

## 4. UI & Styling

### 4.1 Theme-First Development

- **NEVER** hardcode hex colors, font sizes, or spacing values.
- **Strict Check**: Even common colors like `#fff`, `#000`, or `#1a1a1a` must be accessed via `theme.colors`.
- Use `useThemedStyles` factory to access the design system tokens.
- Reference: `modules/shared/theme/` and `libs/assets/`.

### 4.2 Component Organization

- **Atomic Components**: Reusable, generic UI (Buttons, Inputs, Cards) live in `modules/shared/components`.
- **Feature Components**: Module-specific UI lives in `modules/[feature]/components/`.
- **Decomposition**: **Avoid large UI files (e.g., > 300 lines).** Break down complex screens into smaller, manageable sub-components. If a component can be reused across different screens or modules, move it to the appropriate `components/` directory.

---

## 5. Development Standards

### 5.1 Naming Conventions

- **Components**: PascalCase (e.g., `RegisterButton.tsx`).
- **Hooks**: camelCase with `use` prefix (e.g., `useLogin.ts`).
- **Files/Folders**: kebab-case for directories; camelCase for logic files.

### 5.2 Logging & Diagnostics

- Use the custom `Logger` class from `@/libs/log` for all logs.
- Scoped logging: `const logger = new Logger('ModuleName');`.
- **DO NOT** use `console.log` directly in production-ready code.

### 5.3 Error Feedback

- Use `Toaster.error()` and `Toaster.success()` from `@/libs/notification/toast` for user alerts.
- Prefer `useCall` for automatic error haptics and toast integration.

### 5.4 Testing & instrumentation

- **IDs**: Use `testID` prop on interactive elements with the pattern `feature_component_action` (e.g., `auth_login_submit`).
- **Tools**: Jest for unit/integration; Maestro for E2E.

### 5.5 General Principles

- **Avoid Hardcoding**: Avoid hardcoding values (strings, numbers, business logic constants) as much as possible. Use constants, theme tokens, or configuration files instead.
- **Linting & Quality**: Ensure linting and error checking are solid and properly set up. ALWAYS run lint checks after modifying code to catch potential regressions or style violations.

---

## 6. Performance

- Memoize expensive calculations with `useMemo`.
- Use `useCallback` for functions passed to memoized children to prevent unnecessary re-renders.
- Avoid unnecessary state lifting; keep state as local as possible.

---

## 7. Concurrency & Data Consistency

- **Avoid Race Conditions**: Implement mechanisms to handle out-of-order API responses (e.g., using flags, cancellation tokens, or state checks).
- **Stale Data**: Be cautious of stale data in closures, especially within `useEffect` or callbacks.
- **Batch State Updates**: Use functional state updates `setState(prev => ...)` when the new state depends on the previous one to avoid issues with batched updates.

---

## 8. Diamond Quality Enforcement (The "Strict" Mandate)

To maintain a "Diamond Resistant" codebase, the following automated rules are strictly enforced:

### 8.1 Automated Import Sorting

- **Rule**: All imports must be sorted alphabetically and grouped by category (Built-ins, Externals, Internal Aliases, Relatives).
- **Automation**: Enforced by `simple-import-sort/imports`. Rule is `error` level.
- **Workflow**: Run `npm run lint:fix` to auto-arrange imports.

### 8.2 Zero Unused Resources

- **Unused Imports**: Enforced by `unused-imports/no-unused-imports`. Must be removed immediately.
- **Unused Variables**: Use `_` prefix for intentional unused variables (e.g., `[_, setValue]`). Others are flagged as `error`.
- **Unused Styles**: Logic for detecting unused styles is currently disabled due to technical incompatibility with the `useThemedStyles` factory pattern.
- **In-line Styles**: **FORBIDDEN**. Prefer `useThemedStyles`. Enforced by `react-native/no-inline-styles`.
- **Color Literals**: **FORBIDDEN**. Use of hex codes or named colors outside of the theme system is blocked by `react-native/no-color-literals`.

### 8.5 Integrity Checks

- **CI/CD Threshold**: The lint command `npm run lint` uses `--max-warnings 0`. **Any** warning (even minor ones) is treated as a blocker.
- **Type Safety**: **ALWAYS** run `npx tsc --noEmit` after any functional changes or refactoring to ensure zero type regressions. The project must always be typesafe.

### 8.6 Anti-Deprecation Mandate

- **Rule**: Usage of any function, component, or utility marked with the `@deprecated` JSDoc tag is strictly **FORBIDDEN**.
- **Enforcement**: Regressions are blocked by the `import/no-deprecated` and `react/no-deprecated` ESLint rules.
- **Action**: When encountering a deprecated API, you MUST migrate to the recommended replacement immediately. Do not defer migration debt.
