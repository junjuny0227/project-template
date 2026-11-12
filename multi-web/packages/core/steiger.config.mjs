import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // core의 entity는 앱이 package exports(@repo/core/entities/*)로 가져다 쓴다.
    // steiger는 core의 src 안만 보므로 앱에서 쓰는 참조를 보지 못해 모든 entity를 미사용으로 판단한다.
    files: ['./src/entities/**'],
    rules: {
      'fsd/insignificant-slice': 'off',
    },
  },
]);
