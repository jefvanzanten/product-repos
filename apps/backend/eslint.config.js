import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

const restrictedApplicationClasses = {
  selector: 'ClassDeclaration',
  message: 'Application-owned classes require an explicitly documented lifecycle or framework need.',
};

export default [
  {
    files: ['src/**/*.ts', 'tests/**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: { ecmaVersion: 2022, sourceType: 'module', project: './tsconfig.json' },
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      'no-restricted-syntax': ['error', restrictedApplicationClasses],
    },
  },
  {
    files: ['src/modules/*/routes/**/*.ts', 'src/modules/*/*.routes.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['**/db/**', '**/internal/**', '**/repositories/drizzle-*', '**/adapters/**'], message: 'Routes may only depend on injected service and middleware capabilities.' },
      ] }],
    },
  },
  {
    files: ['src/modules/*/services/**/*.ts', 'src/modules/*/*.service.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['hono', 'drizzle-orm', 'drizzle-orm/**', '**/db/**', '**/repositories/drizzle-*'], message: 'Services may not depend on HTTP, database, or concrete persistence adapters.' },
      ] }],
    },
  },
  {
    files: ['src/modules/*/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [
        { group: ['hono', 'hono/**', 'drizzle-orm', 'drizzle-orm/**', 'better-auth', 'better-auth/**', '**/db/**', '**/routes/**', '**/services/**', '**/repositories/**', '**/adapters/**'], message: 'Domain code must remain pure and dependency-inward.' },
      ] }],
    },
  },
  { ignores: ['dist', 'node_modules', '*.js'] },
];
