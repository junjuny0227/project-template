import { defineConfig } from 'eslint/config';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

import base from './base.mjs';

// Next 앱이 아닌 패키지(ui, core)의 React 코드를 검사한다. 앱은 next.mjs를 쓴다.
// React·hooks·접근성 규칙은 eslint-config-next와 같은 집합으로 맞춘다. 앱에서 통과한 코드를
// core로 옮겼을 때 lint 결과가 달라지지 않게 하기 위해서다. Next 전용 규칙과 앱 전용 FSD 규칙은 넣지 않는다.
// 플러그인 버전은 eslint-config-next가 쓰는 것과 같게 catalog에 고정한다.
export default defineConfig([
  react.configs.flat.recommended,
  reactHooks.configs.flat.recommended,
  {
    plugins: { 'jsx-a11y': jsxA11y },
    rules: {
      'jsx-a11y/alt-text': ['warn', { elements: ['img'], img: ['Image'] }],
      'jsx-a11y/aria-props': 'warn',
      'jsx-a11y/aria-proptypes': 'warn',
      'jsx-a11y/aria-unsupported-elements': 'warn',
      'jsx-a11y/role-has-required-aria-props': 'warn',
      'jsx-a11y/role-supports-aria-props': 'warn',
    },
  },
  {
    settings: { react: { version: '19' } },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'react/jsx-no-target-blank': 'off',
      'react/no-unknown-property': 'off',
    },
  },
  ...base,
]);
