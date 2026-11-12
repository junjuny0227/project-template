import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import base from './base.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...base,
  { settings: { react: { version: '19' } } },
]);
