#!/usr/bin/env node
// 실제 공통 파일 복사본을 변형해 각 비교 범위가 드리프트를 잡는지 확인한다.
import assert from 'node:assert/strict';
import { appendFile, cp, mkdtemp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const work = await mkdtemp(join(tmpdir(), 'test-template-drift-'));
const paths = [
  ...['single', 'fullstack/apps/web', 'multi-web/apps/client', 'multi-web/apps/admin'].flatMap((app) =>
    ['src/shared/api', ...(!app.includes('multi-web') ? ['src/shared/lib'] : []), 'src/shared/config', 'src/_app/providers', 'src/_pages/home', 'steiger.config.mjs', ...(app.includes('fullstack') ? [] : ['instrumentation.ts']), ...(app.includes('multi-web') ? ['next.config.ts'] : [])].map((path) => `${app}/${path}`)),
  ...['single', 'fullstack', 'multi-web'].flatMap((template) =>
    ['.agents/skills', '.github/ISSUE_TEMPLATE', '.github/PULL_REQUEST_TEMPLATE.md', '.github/workflows/ci.yml'].map((path) => `${template}/${path}`)),
];
const cases = [
  ['범위 1: single ↔ fullstack', 'fullstack/apps/web/src/shared/lib/cn.ts'],
  ['범위 1: 새 모킹 파일은 예외 아님', 'single/src/shared/api/mocks/drift-probe.ts'],
  ['범위 1-1: 모킹 연결', 'multi-web/apps/client/instrumentation.ts'],
  ['범위 2: client ↔ admin providers', 'multi-web/apps/admin/src/_app/providers/TanStackProvider.tsx'],
  ['범위 2: client ↔ admin config', 'multi-web/apps/admin/src/shared/config/env.ts'],
  ['범위 2: client ↔ admin steiger', 'multi-web/apps/admin/steiger.config.mjs'],
  ['범위 2: client ↔ admin next.config', 'multi-web/apps/admin/next.config.ts'],
  ['범위 3: 세 번째 스킬', 'multi-web/.agents/skills/data-and-forms/SKILL.md'],
  ['범위 3: fullstack 전용 목록 밖 스킬', 'fullstack/.agents/skills/drift-probe.md'],
  ['범위 3: 공통 스킬은 fullstack도 같아야 함', 'fullstack/.agents/skills/git-commit/SKILL.md'],
  ['범위 3: 이슈 양식', 'multi-web/.github/ISSUE_TEMPLATE/drift-probe.yml'],
  ['범위 3: PR 양식', 'multi-web/.github/PULL_REQUEST_TEMPLATE.md'],
  ['CI: 세 번째 템플릿', 'multi-web/.github/workflows/ci.yml'],
];
function run() {
  return spawnSync(process.execPath, [join(root, 'scripts/check-template-drift.mjs'), work], { encoding: 'utf8' });
}
try {
  for (const path of paths) {
    await mkdir(dirname(join(work, path)), { recursive: true });
    await cp(join(root, path), join(work, path), { recursive: true });
  }
  const baseline = run();
  assert.equal(baseline.status, 0, baseline.stderr);
  console.log('PASS 기준 복사본');
  for (const [name, path] of cases) {
    const target = join(work, path);
    // CI 검사는 주석이 아니라 실제 게이트 누락을 검사한다.
    if (path.endsWith('/ci.yml')) {
      const { readFile, writeFile } = await import('node:fs/promises');
      await writeFile(target, (await readFile(target, 'utf8')).replace(/^.*run: pnpm build.*$/m, ''));
    } else {
      await appendFile(target, '\n// drift negative control\n');
    }
    const result = run();
    assert.equal(result.status, 1, `${name}: 드리프트를 놓쳤습니다\n${result.stdout}${result.stderr}`);
    assert.ok(result.stderr.includes(path), `${name}: 경로가 없습니다\n${result.stderr}`);
    console.log(`PASS ${name}`);
    await rm(target);
    try { await cp(join(root, path), target); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
} finally {
  await rm(work, { recursive: true, force: true });
}
