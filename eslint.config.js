import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // .mjs files (scripts/, .claude/state/ probes) run under Node, not in the
    // browser bundle. They are plain JS, so no-undef applies (typescript-eslint
    // disables it for TS files) — declare the Node globals they use.
    files: ['**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
  },
  {
    rules: {
      // Underscore-prefixed bindings are deliberate "intentionally unused"
      // markers (the convention Biome already honours), e.g. the typed-but-
      // unread `_props` of AssetDetail's PreviewLoadError fallback.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/react-in-jsx-scope': 'off',
    },
    settings: {
      react: { version: '19' },
    },
  },
  {
    // Mirrors biome.json's linter.ignore for tests: vitest store mocks take
    // partial selector doubles (`selector: any`) — test scaffolding, not
    // production typing.
    files: ['src/**/*.test.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'src-tauri/', 'coverage/', '.claude/worktrees/'],
  },
];
