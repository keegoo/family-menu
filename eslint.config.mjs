import js from '@eslint/js'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

export default [
  {
    ignores: [
      'node_modules/',
      'dist/',
      'server/public/',
      'data/'
    ]
  },
  js.configs.recommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        document: "readonly",
        fetch: "readonly",
        process: "readonly",
        console: "readonly"
      },
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true }
      }
    },
    plugins: {
      react,
      'react-hooks': reactHooks
    },
    settings: {
      react: { version: 'detect' }
    },
    rules: {
      'semi': ['error', 'never'],           // no trailing semicolons
      'quotes': ['error', 'single'],        // single quotes
      'comma-dangle': ['error', 'never'],   // no trailing commas
      'no-unexpected-multiline': 'error',
      'react/jsx-uses-vars': 'error',       // <Component /> counts as using a variable
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn'
    }
  },
  {
    files: ['server/**/*.js']
  }
]
