import { defineConfig } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

import base from './base.mjs';

const coreLayer = (layer, message) => ({
  regex: `^@repo/core/${layer}(?:/|$)`,
  message,
});

const restrict = (files, patterns) => ({
  files,
  rules: { 'no-restricted-imports': ['error', { patterns }] },
});

const upper = (layer, from) =>
  coreLayer(layer, `${from} 레이어는 core의 ${layer}를 import할 수 없습니다(FSD 레이어 방향).`);

const coreLayerRules = [
  restrict(
    ['src/shared/**'],
    [upper('entities', 'shared'), upper('features', 'shared'), upper('widgets', 'shared')],
  ),
  restrict(
    ['src/entities/**'],
    [
      {
        regex: '^@repo/core/entities(?!/[^/]+/@x/[^/]+$)(?:/|$)',
        message:
          'entity끼리는 core entity의 @x/<소비 slice> 공개 API로만 import합니다(FSD 같은 레이어 규칙).',
      },
      upper('features', 'entities'),
      upper('widgets', 'entities'),
    ],
  ),
  restrict(
    ['src/features/**'],
    [
      coreLayer(
        'features',
        'feature는 다른 feature를 import할 수 없습니다. core의 feature는 widgets 이상에서 조합합니다.',
      ),
      upper('widgets', 'features'),
    ],
  ),
  restrict(
    ['src/widgets/**'],
    [
      coreLayer(
        'widgets',
        'widget은 다른 widget을 import할 수 없습니다. core의 widget은 _pages 이상에서 조합합니다.',
      ),
    ],
  ),
];

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  ...base,
  { settings: { react: { version: '19' } } },
  // FSD import 방향을 패키지 경계에도 적용한다. steiger는 앱의 src만 보므로 @repo/core import는 여기서 막는다.
  // 앱 레이어는 core의 더 아래 레이어만 쓸 수 있다. 같은 레이어(core의 features를 앱 features에서 등)도 다른 slice라서 금지다.
  // entity만 예외로 core entity가 공개한 @x/<소비 slice> 경로를 쓸 수 있다.
  ...coreLayerRules,
]);
