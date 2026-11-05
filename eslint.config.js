import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'dev-dist', 'android']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
  },

  // ── Architecture boundaries (Phase 0, OPTIMIZATION_PLAN.md §3) ────────────────
  // src/shared is used by POS and Back Office: it must never depend on a feature or the app shell.
  {
    files: ['src/shared/**/*.{ts,tsx}'],
    // Documented exception until Phase 2: the HTTP client still imports the auth refresh calls.
    ignores: ['src/shared/api/http.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [{
          group: ['**/features/**', '**/app/**', '@features/*', '@pos/*', '@app/*'],
          message: 'src/shared must not import features or the app shell — move the code into shared or pass it in.',
        }],
      }],
    },
  },
  // The POS pricing engine is PURE (no React, Redux, HTTP or storage) — see AGENT.md §4 / §7.
  {
    files: ['src/features/pos/pricing/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        paths: ['react', 'react-dom', 'react-redux', '@reduxjs/toolkit', '@tanstack/react-query', 'axios'],
        patterns: [{ group: ['**/store/**', '**/services/**', '**/components/**', '**/hooks/**'], message: 'pricing/ must stay pure.' }],
      }],
      'no-restricted-globals': ['error', 'localStorage', 'sessionStorage', 'window', 'document'],
    },
  },
])
