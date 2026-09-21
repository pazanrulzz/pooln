// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// Covers apps/api and packages/shared (plain TS, no JSX/RN globals).
// apps/mobile has its own eslint config via `expo lint`.
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['apps/api/**/*.ts', 'packages/shared/**/*.ts'],
  },
  {
    ignores: ['**/dist/**', '**/node_modules/**', 'apps/mobile/**'],
  },
);
