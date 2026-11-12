import fsd from '@feature-sliced/steiger-plugin';
import { defineConfig } from 'steiger';

export default defineConfig([
  ...fsd.configs.recommended,
  {
    // Next가 src/app과 src/pages를 라우터 폴더로 읽지 않도록 밑줄을 붙였다(FSD 공식 Next.js 가이드).
    // 레이어로는 인식되지만 오타 검사는 폴더 이름을 그대로 비교해서 두 폴더를 오타로 본다.
    files: ['./src/_app/**', './src/_pages/**'],
    rules: {
      'fsd/typo-in-layer-name': 'off',
    },
  },
  {
    // 전역 Provider를 두는 자리다. app 레이어에서 관례로 쓰는 세그먼트 이름이라 그대로 둔다.
    files: ['./src/_app/providers/**'],
    rules: {
      'fsd/segments-by-purpose': 'off',
    },
  },
]);
