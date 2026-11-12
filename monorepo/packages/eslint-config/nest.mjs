import { defineConfig } from 'eslint/config';

import base from './base.mjs';

export default defineConfig([...base, { rules: { 'no-console': 'error' } }]);
