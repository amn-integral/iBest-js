import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import prettierConfig from 'eslint-config-prettier'
import prettierPlugin from 'eslint-plugin-prettier'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  // ignore build artifacts
  globalIgnores(['**/dist/**', '**/node_modules/**']),

  // TS/JS source files
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
      // keep this LAST so it disables conflicting style rules
      prettierConfig,
    ],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Show prettier formatting issues as ESLint errors
      'prettier/prettier': 'error',
      // stop line-wrapping complaints
      'function-call-argument-newline': 'off',
      'function-paren-newline': 'off',
      'max-len': 'off',
      // if you had comma-dangle conflicts with Prettier:
      'comma-dangle': 'off',
      // 'react/jsx-first-prop-new-line': ['error', 'never'],
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  // Plain JS config files, etc. (no TS project service)
  {
    files: ['**/*.{js,jsx}'],
    extends: [js.configs.recommended, prettierConfig],
    plugins: {
      prettier: prettierPlugin,
    },
    rules: {
      // Show prettier formatting issues as ESLint errors
      'prettier/prettier': 'error',
      'function-call-argument-newline': 'off',
      'function-paren-newline': 'off',
      'max-len': 'off',
      'comma-dangle': 'off',
    },
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.node,
    },
  },
])
