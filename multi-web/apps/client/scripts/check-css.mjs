import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// 빌드 성공만으로는 공용 UI 소스 탐색과 앱 토큰 덮어쓰기를 보장할 수 없다.
const root = fileURLToPath(new URL('../.next/', import.meta.url));
const collect = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const path = `${dir}/${entry.name}`;
      return entry.isDirectory() ? collect(path) : path.endsWith('.css') ? [path] : [];
    }),
  );
  return nested.flat();
};
const files = await collect(root);
assert.ok(files.length, '빌드 CSS가 없습니다.');
const css = (await Promise.all(files.map((file) => readFile(file, 'utf8')))).join('\n');
assert.match(css, /z-index:\s*314159/, '공용 UI fixture 클래스가 빌드 CSS에서 빠졌습니다.');
console.log('빌드 CSS 검증 통과');
