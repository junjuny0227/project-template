#!/usr/bin/env node
// 의존성 없이 두 템플릿의 공통 파일과 CI 게이트를 검사한다.
import { lstat, readdir, readFile, readlink } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const differences = [];
// 현재 의도한 차이는 없다. cn과 테스트도 같은 경로에서 비교한다.
// 예외가 필요하면 정확한 상대 경로와 한국어 사유를 함께 추가한다.
const allowedDifferences = new Map();
const pairs = [
  ...['src/shared/api', 'src/shared/lib/cn.ts', 'src/shared/lib/cn.test.ts', 'src/shared/config', 'src/_app/providers', 'src/_pages/home', 'steiger.config.mjs'].map((path) => [`single/${path}`, `fullstack/apps/web/${path}`]),
  ...['.agents/skills', '.github/ISSUE_TEMPLATE', '.github/PULL_REQUEST_TEMPLATE.md'].map((path) => [`single/${path}`, `fullstack/${path}`]),
];

async function stat(path) {
  try { return await lstat(join(root, path)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function compare(left, right) {
  if (allowedDifferences.has(left)) return;
  const [a, b] = await Promise.all([stat(left), stat(right)]);
  if (!a || !b) {
    differences.push(`${left} ↔ ${right}: ${!a ? left : right} 없음`);
    return;
  }
  if (a.isDirectory() && b.isDirectory()) {
    const names = new Set([...(await readdir(join(root, left))), ...(await readdir(join(root, right)))]);
    for (const name of [...names].sort()) await compare(`${left}/${name}`, `${right}/${name}`);
  } else if (a.isSymbolicLink() && b.isSymbolicLink()) {
    if (await readlink(join(root, left)) !== await readlink(join(root, right))) differences.push(`${left} ↔ ${right}: 링크 대상 다름`);
  } else if (a.isFile() && b.isFile()) {
    const [first, second] = await Promise.all([readFile(join(root, left)), readFile(join(root, right))]);
    if (!first.equals(second)) differences.push(`${left} ↔ ${right}: 내용 다름`);
  } else {
    differences.push(`${left} ↔ ${right}: 파일 종류 다름`);
  }
}

const gates = ['lint', 'lint:fsd', 'format:check', 'check-types', 'test', 'test:e2e', 'build'];
async function checkGates(template) {
  const path = `${template}/.github/workflows/ci.yml`;
  const source = await readFile(join(root, path), 'utf8');
  // 저장소 CI의 독립적인 pnpm 게이트 step만 읽는다. 주석·step 이름은 근거로 쓰지 않는다.
  const commands = [...source.matchAll(/^\s+run:\s*['"]?pnpm(?:\s+run)?\s+([\w:-]+)['"]?\s*$/gm)].map((match) => match[1]);
  for (const gate of gates) {
    if (!commands.includes(gate)) differences.push(`${path}: web 게이트 없음: ${gate}`);
  }
  return new Set(commands.filter((command) => gates.includes(command)));
}

try {
  for (const [left, right] of pairs) await compare(left, right);
  const [single, fullstack] = await Promise.all([checkGates('single'), checkGates('fullstack')]);
  if ([...single].some((gate) => !fullstack.has(gate)) || [...fullstack].some((gate) => !single.has(gate))) {
    differences.push('single/.github/workflows/ci.yml ↔ fullstack/.github/workflows/ci.yml: web 게이트 목록 다름');
  }
  if (differences.length) {
    for (const difference of differences) console.error(`[drift] ${difference}`);
    process.exitCode = 1;
  } else {
    console.log('[drift] 공통 파일과 web 게이트 7개 일치');
  }
} catch (error) {
  console.error(`[drift] 검사 실패: ${error.message}`);
  process.exitCode = 1;
}
