// ESLint Flat Config for ESLint v9+
// See: https://eslint.org/docs/latest/use/configure/migration-guide

const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const jest = require('eslint-plugin-jest');

module.exports = [
  {
    files: ['**/*.ts', '**/*.tsx'],
    ignores: ['dist/**', 'coverage/**', 'node_modules/**'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
      globals: {
        document: 'readonly',
        window: 'readonly',
        console: 'readonly',
        process: 'readonly',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      jest,
    },
    rules: {
      // Use non-type-checked to avoid requiring project references
      ...tseslint.configs.recommended.rules,
      ...(jest.configs?.['flat/recommended']?.rules || jest.configs.recommended.rules),
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
    },
  },
];
