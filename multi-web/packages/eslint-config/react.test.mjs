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
  it('next.mjs와 같은 React·hooks·접근성 규칙을 켠다', async () => {
    const [next, react] = await Promise.all([reactRules('./next.mjs'), reactRules('./react.mjs')]);

    expect(Object.keys(react).length).toBeGreaterThan(0);
    expect(react).toEqual(next);
  });
});
