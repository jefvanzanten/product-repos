import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['build', 'dist', '.react-router']),
  {
    files: ['app/**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        project: ['./tsconfig.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // React Router intentionally throws Response objects from loaders and redirects.
      '@typescript-eslint/only-throw-error': 'off',
      // Prevent cascading renders caused by synchronously copying values into local state.
      'react-hooks/set-state-in-effect': 'error',
      // The fetch test seam intentionally forwards non-Error protocol rejection values.
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      'react-refresh/only-export-components': [
        'warn',
        {
          allowExportNames: ['action', 'headers', 'links', 'loader', 'meta', 'middleware'],
        },
      ],
    },
  },
  {
    files: ['*.config.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.node,
    },
  },
])
