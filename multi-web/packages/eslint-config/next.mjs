import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import base from './base.mjs';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...base,
  { settings: { react: { version: '19' } } },
  {
    // FSD import 방향을 패키지 경계에도 적용한다. 앱의 shared 레이어는 core의 entities를 가져올 수 없다.
    files: ['src/shared/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@repo/core/entities', '@repo/core/entities/*'],
              message: 'shared 레이어는 entities를 import할 수 없습니다(FSD 하위 레이어 규칙).',
            },
          ],
        },
      ],
    },
  },
]);
