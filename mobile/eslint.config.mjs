import expoConfig from 'eslint-config-expo/flat.js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import reactNative from 'eslint-plugin-react-native';
import * as tseslint from 'typescript-eslint';
import deprecation from 'eslint-plugin-deprecation';
import { fixupPluginRules } from '@eslint/compat';
import globals from 'globals';

export default tseslint.config(
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*', 'web-build/*'],
  },
  ...expoConfig,
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.jest,
      },
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint.default.plugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'react-native': reactNative,
    },
    rules: {
      // General Code Quality
      'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // Import sorting
      'simple-import-sort/imports': 'error',
      'simple-import-sort/exports': 'error',

      // Clean imports
      'unused-imports/no-unused-imports': 'error',
      'unused-imports/no-unused-vars': [
        'error',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      // React Native specific
      'react-native/no-inline-styles': 'error',
      'react-native/no-raw-text': 'off',

      // TypeScript basics (Non-type-aware)
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-shadow': 'error',
    },
  },
  {
    // Type-Aware Rules - Only for Source Files to avoid config file errors
    files: ['app/**/*.{ts,tsx}', 'modules/**/*.{ts,tsx}', 'libs/**/*.{ts,tsx}', 'hooks/**/*.{ts,tsx}', 'constants/**/*.{ts,tsx}'],
    plugins: {
      deprecation: fixupPluginRules({
        rules: deprecation.rules,
        meta: deprecation.meta,
      }),
    },
    rules: {
      'deprecation/deprecation': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-spread': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
    },
  },
);
