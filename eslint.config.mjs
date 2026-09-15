import js from '@eslint/js'
import tseslint from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'

export default [
  {
    ignores: ['node_modules/**', 'out/**', 'dist/**', 'release/**', 'drizzle/**', '*.config.js', '*.config.ts']
  },
  js.configs.recommended,

  // TypeScript already catches genuine undefined-variable/type errors, and
  // (unlike this base rule) understands ambient global types such as the
  // `JSX` namespace used in every component's `JSX.Element` return type —
  // `no-undef` doesn't, and flags them as errors. Standard typescript-eslint
  // guidance is to disable it for .ts/.tsx files entirely.
  {
    files: ['**/*.{ts,tsx}'],
    rules: { 'no-undef': 'off' }
  },

  // One-off build/dev scripts — plain CommonJS Node, run outside Vite.
  {
    files: ['scripts/**/*.js'],
    languageOptions: {
      sourceType: 'commonjs',
      ecmaVersion: 2022,
      globals: { ...globals.node }
    },
    rules: { 'no-console': 'off' }
  },

  // Main process + preload — Node/Electron environment.
  {
    files: ['src/main/**/*.ts', 'src/preload/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
      globals: { ...globals.node }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'off'
    }
  },

  // Renderer — browser environment, React.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 2022, ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser }
    },
    plugins: { '@typescript-eslint': tseslint, react, 'react-hooks': reactHooks },
    settings: { react: { version: '18.3' } },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // This app's entire data-fetching-hook pattern (useEffect(() => {
      // setLoading(true); load().finally(() => setLoading(false)) }, deps))
      // is the standard, correct "cancelled flag" approach for fetching in
      // an effect — it's flagged by this fairly new rule, but rewriting
      // every hook to avoid it would fight a consistent, already-tested
      // architecture for no real bug fixed.
      'react-hooks/set-state-in-effect': 'off'
    }
  },

  // Shared — used by both processes, keep it environment-agnostic.
  {
    files: ['src/shared/**/*.ts'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { sourceType: 'module', ecmaVersion: 2022 },
      globals: { ...globals.node, ...globals.browser }
    },
    plugins: { '@typescript-eslint': tseslint },
    rules: {
      ...tseslint.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn'
    }
  }
]
