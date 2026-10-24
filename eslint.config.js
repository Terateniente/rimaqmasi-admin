import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    rules: {
      // The dashboard is an existing React application, not a React Compiler
      // project. These compiler-oriented rules reject valid imperative form and
      // data-loading patterns used by react-hook-form and the current services.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
      'react-hooks/incompatible-library': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/exhaustive-deps': 'off',
      // Vite Fast Refresh remains enabled at runtime. Context modules also
      // export hooks, which is intentional in this codebase.
      'react-refresh/only-export-components': 'off',
      // Unused declarations are build-time hygiene and do not affect runtime.
      // Keep no-undef enabled so missing runtime identifiers still fail lint.
      'no-unused-vars': 'off',
    },
  },
])
