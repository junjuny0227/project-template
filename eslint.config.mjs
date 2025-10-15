import { FlatCompat } from '@eslint/eslintrc';
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { set } from 'zod/v4-mini';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends('next/core-web-vitals', 'next/typescript', 'plugin:prettier/recommended'),
  {
    ignores: [
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
    ],
  },
  {
    settings: {
      react: {
        version: '19',
      },
    },
  },
  {
    rules: {
      'prettier/prettier': 'error',
    },
  },
];

export default eslintConfig;
