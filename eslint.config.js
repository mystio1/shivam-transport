import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { globalIgnores } from 'eslint/config'

export default tseslint.config([
  globalIgnores([
    'dist',
    'node_modules',
    'android/**/build/**',
    'src-tauri/target/**',
    'shivam_transport/target/**',
    'ios/App/App/public/**',
  ]),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs['recommended-latest'],
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      'react-refresh/only-export-components': 'off',
      // Repo convention: an intentionally-unused parameter (e.g. Express error middleware's
      // `next`, kept only to match the 4-arg signature Express detects) is prefixed with `_`.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    // The Express backend runs under Node, not a browser — process/Buffer/__dirname etc. are
    // real globals there, and the frontend-oriented react-hooks/react-refresh rules don't apply
    // to it at all.
    files: ['backend/src/**/*.ts'],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'off',
      'react-refresh/only-export-components': 'off',
    },
  },
])
