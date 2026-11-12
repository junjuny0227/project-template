import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import simpleImportSort from 'eslint-plugin-simple-import-sort';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,

  globalIgnores([
    'node_modules/**',
    '.next/**',
    'out/**',
    'build/**',
    'coverage/**',
    'playwright-report/**',
    'test-results/**',
    'next-env.d.ts',
    '**/*.d.ts',
  ]),

  {
    plugins: {
      'simple-import-sort': simpleImportSort,
    },

    settings: {
      react: {
        version: '19',
      },
    },

    rules: {
      'simple-import-sort/imports': [
        'error',
        {
          groups: [['^react$'], ['^next(/.*)?$'], ['^@?\\w'], ['^@/'], ['^\\.']],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },

    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'TSEnumDeclaration',
          message: 'enum 대신 리터럴 유니온이나 as const 객체를 사용하세요.',
        },
      ],
    },
  },
]);

export default eslintConfig;
