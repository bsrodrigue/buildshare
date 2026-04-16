import js from '@eslint/js';
import expoConfig from 'eslint-config-expo/flat.js';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import reactNative from 'eslint-plugin-react-native';
import tseslint from 'typescript-eslint';
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
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'react-native': reactNative,
      deprecation: fixupPluginRules({
        rules: deprecation.rules,
        meta: deprecation.meta,
      }),
    },
    rules: {
      // General Code Quality
      'no-console': ['error', { allow: ['warn', 'error', 'debug'] }],
      'no-debugger': 'error',
      'no-alert': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
      eqeqeq: ['error', 'always'],

      // Deprecation check
      'deprecation/deprecation': 'error',

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
      'react-native/no-raw-text': 'off', // Too many false positives with custom components

      // TypeScript strictness (Inspired by the provided snippet)
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'error',
      '@typescript-eslint/restrict-template-expressions': 'off', // Off as per inspiration for better logging
      '@typescript-eslint/no-unused-vars': 'off', // Delegated to unused-imports
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-misused-spread': 'error',
      '@typescript-eslint/no-non-null-assertion': 'warn',
      
      // Strict Type Checking overrides
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
      '@typescript-eslint/no-shadow': 'error',
    },
  },
);
