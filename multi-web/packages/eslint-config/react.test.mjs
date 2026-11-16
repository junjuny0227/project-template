import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

// react.mjs가 eslint-config-next와 같은 React·hooks·접근성 규칙을 켜는지 확인한다.
// Next나 플러그인을 올렸을 때 앱과 패키지의 규칙이 어긋나면 이 테스트가 실패한다.
const reactRules = async (configFile) => {
  const eslint = new ESLint({
    cwd: import.meta.dirname,
    overrideConfigFile: new URL(configFile, import.meta.url).pathname,
  });
  const { rules } = await eslint.calculateConfigForFile('fixture.tsx');

  return Object.fromEntries(
    Object.entries(rules)
      .filter(([name]) => /^(react|react-hooks|jsx-a11y)\//.test(name))
      .map(([name, [severity, ...options]]) => [name, [severity, ...options]])
      .filter(([, [severity]]) => severity !== 0)
      // jsx-runtime에서는 의미가 없는 규칙이라 비교에서 뺀다. next.mjs만 켠다.
      .filter(([name]) => name !== 'react/jsx-uses-react'),
  );
};

describe('react.mjs', () => {
  // 두 설정의 플러그인을 처음부터 불러와 계산하므로, 다른 패키지 테스트와 동시에 도는 CI에서는 기본 5초를 넘길 수 있다.
  it('next.mjs와 같은 React·hooks·접근성 규칙을 켠다', { timeout: 30_000 }, async () => {
    const [next, react] = await Promise.all([reactRules('./next.mjs'), reactRules('./react.mjs')]);

    expect(Object.keys(react).length).toBeGreaterThan(0);
    expect(react).toEqual(next);
  });
});
