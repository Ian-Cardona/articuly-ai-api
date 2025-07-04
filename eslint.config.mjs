import tseslint from "@typescript-eslint/eslint-plugin";
import tseslintParser from "@typescript-eslint/parser";
import { defineConfig } from "eslint/config";
import stylistic from "@stylistic/eslint-plugin";
import importPlugin from "eslint-plugin-import";
import globals from "globals";

export default defineConfig([
  {
    files: ["src/**/*.ts", "src/**/*.mts", "src/**/*.cts", "*.ts"],
    ignores: ['dist', 'build', 'node_modules'],
    plugins: { "@typescript-eslint": tseslint, '@stylistic': stylistic, import: importPlugin },
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
        tsconfigRootDir: new URL('.', import.meta.url),
      },
      globals: globals.node
    },
    rules: {
      // Stylistic Rules
      '@stylistic/semi': ['error', 'always'],
      '@stylistic/indent': ['error', 2],
      '@stylistic/quotes': ['error', 'single'],
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/array-bracket-spacing': ['error', 'never'],
      '@stylistic/space-before-function-paren': ['error', {
        anonymous: 'always',
        named: 'never',
        asyncArrow: 'always'
      }],
      '@stylistic/keyword-spacing': ['error', { before: true, after: true }],
      '@stylistic/space-infix-ops': 'error',
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/eol-last': ['error', 'always'],

      // TypeScript Rules
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/restrict-plus-operands': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { 
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true
        },
      ],
      '@typescript-eslint/no-non-null-assertion': 'warn',
      '@typescript-eslint/prefer-nullish-coalescing': 'error',
      '@typescript-eslint/prefer-optional-chain': 'error',
      '@typescript-eslint/no-unnecessary-condition': 'warn',
      '@typescript-eslint/consistent-type-imports': [
        'error', 
        { prefer: 'type-imports', fixStyle: 'separate-type-imports' }
      ],

      // Express/API specific
      'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],

      // Import Plugin ESM rules
      'import/no-unresolved': 'error',
      'import/no-extraneous-dependencies': 'error',
      'import/extensions': [
        'error',
        'ignorePackages',
        {
          'ts': 'never',
          'tsx': 'never',
          'js': 'always',
        }
      ],
      'import/order': [
        'error',
        {
          'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'object', 'type'],
          'newlines-between': 'always',
        }
      ],
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.ts', '.d.ts']
        }
      }
    }
  }
]);
