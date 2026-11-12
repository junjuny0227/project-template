import { expect, test } from '@playwright/test';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

test('모킹을 끄면 worker가 등록되지 않는다', async ({ page }) => {
  await page.goto('/');
  // worker는 화면이 뜬 뒤에 등록된다. 뒤따르는 요청까지 끝난 다음에 확인한다.
  await page.waitForLoadState('networkidle');

  const registrations = await page.evaluate(async () => {
    return (await navigator.serviceWorker.getRegistrations()).length;
  });

  expect(registrations).toBe(0);
});

test('모킹을 끈 빌드의 브라우저용 JS에 MSW 코드가 없다', async () => {
  const staticDir = fileURLToPath(new URL('../.next/static', import.meta.url));
  const files = (await readdir(staticDir, { recursive: true })).filter((file) =>
    file.endsWith('.js'),
  );
  const filesWithMsw: string[] = [];

  for (const file of files) {
    const source = await readFile(path.join(staticDir, file), 'utf8');

    // worker 파일 이름과 MSW의 로그 머리말이다. MSW가 번들에 들어가면 문자열로 남는다.
    if (/mockServiceWorker|\[MSW\]/.test(source)) {
      filesWithMsw.push(file);
    }
  }

  expect(files.length).toBeGreaterThan(0);
  expect(filesWithMsw).toEqual([]);
});
