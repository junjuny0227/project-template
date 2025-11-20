import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettierConfig from 'eslint-config-prettier';
import pluginPrettier from 'eslint-plugin-prettier';
import { defineConfig, globalIgnores } from 'eslint/config';

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
      prettier: pluginPrettier,
    },

    settings: {
      react: {
        version: '19',
      },
    },

    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
    },
  },
]);

export default eslintConfig;
