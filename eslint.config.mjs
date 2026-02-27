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
    'public/**',
    'next-env.d.ts',
    '**/*.d.ts',
    'pnpm-lock.yaml',
    'yarn.lock',
    'package-lock.json',
    '.DS_Store',
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
          groups: [['^react$'], ['^next(/.*)?$'], ['^@?\\w'], ['^@/'], ['^\.']],
        },
      ],
      'simple-import-sort/exports': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
]);

export default eslintConfig;
