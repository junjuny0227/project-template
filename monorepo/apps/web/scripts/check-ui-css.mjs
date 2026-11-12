import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// 앱에는 사용하지 않는 UI 테스트 컴포넌트의 클래스가 실제 빌드 CSS에 있어야 한다.
// 이 클래스 자체를 앱 소스에 적으면 @source 없이도 생성되므로 값은 UI 파일에서 읽는다.
const fixture = await readFile(
  new URL('../../../packages/ui/src/tailwind-source.fixture.ts', import.meta.url),
  'utf8',
);
const value = /z-\[(\d+)\]/.exec(fixture)?.[1];
assert.ok(value, 'UI 테스트 컴포넌트에 검증할 클래스가 없습니다.');
const cssRoot = new URL('../.next/static/', import.meta.url);
const files = await readdir(cssRoot, { recursive: true });
const styles = await Promise.all(
  files
    .filter((file) => file.endsWith('.css'))
    .map((file) => readFile(`${fileURLToPath(cssRoot)}${file}`, 'utf8')),
);
assert.ok(styles.length, '빌드 CSS가 없습니다. 먼저 pnpm build를 실행하세요.');
const selector = `.z-\\[${value}\\]`;
assert.ok(
  styles.some((css) => css.includes(selector) && css.includes(`z-index:${value}`)),
  'UI 클래스가 빌드 CSS에 없습니다. globals.css의 packages/ui @source를 확인하세요.',
);
console.log('[check-ui-css] packages/ui 클래스가 빌드 CSS에 있습니다.');
