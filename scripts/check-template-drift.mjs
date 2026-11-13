#!/usr/bin/env node
// 의존성 없이 세 템플릿의 공통 파일과 CI 게이트를 검사한다.
import { lstat, readdir, readFile, readlink } from 'node:fs/promises';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'));
const differences = [];
// fullstack은 실제 API가 함께 떠서 MSW를 넣지 않는다. 폴더 전체를 제외하지 않는다.
const allowedDifferences = new Map([
  ['single/src/shared/api/index.mocks.ts', '브라우저 모킹 공개 진입점'],
  ['single/src/shared/api/mocks/handlers.ts', '백엔드 없는 개발용 health handler'],
  ['single/src/shared/api/mocks/browser.ts', '브라우저 모킹 초기화'],
  ['single/src/shared/api/mocks/node.ts', '서버 모킹 초기화'],
  ['single/src/shared/api/mocks/node.test.ts', '서버 모킹 handler 검증'],
  ['single/src/_app/providers/MockProvider.tsx', 'worker 준비 후 화면 렌더'],
  ['single/instrumentation.ts', '서버 요청 모킹 연결'],
  ['single/src/shared/config/env.ts', '모킹 환경 변수 검증'],
  ['single/src/shared/config/env.test.ts', '모킹 환경 변수 검증 테스트'],
  ['single/src/_pages/home/ui/MockingStatus.tsx', '서버 모킹 확인용 표시'],
  ['single/src/_pages/home/ui/BrowserMockingStatus.tsx', '브라우저 모킹 확인용 표시'],
  ['single/src/_pages/home/ui/HomePage.tsx', '모킹 확인용 표시 연결'],
  ['single/src/_pages/home/ui/HomePage.test.tsx', '서버 전용 표시를 단위 테스트에서 대체'],
  ['single/src/_app/providers/index.ts', 'MockProvider 공개 진입점'],
  ['single/src/_app/layout.tsx', 'MockProvider 연결'],
  ['single/app/layout.tsx', 'MockProvider를 감싼 src/_app/layout 재수출'],
  ['single/next.config.ts', '모킹 분기를 빌드 때 제거'],
  ['single/playwright.config.ts', '모킹 켠 개발 서버와 끈 운영 서버 검증'],
  ['single/package.json', 'MSW 개발 의존성과 worker 생성 경로'],
  ['single/public/mockServiceWorker.js', 'MSW가 생성한 worker'],
]);
// fullstack에만 있는 백엔드 스킬. 나머지 스킬은 세 템플릿이 같아야 한다.
const templateOnlySkills = new Map([
  ['fullstack/.agents/skills/nestjs-api', 'NestJS API 작성 기준'],
  ['fullstack/.agents/skills/backend-convention-review', 'NestJS API 컨벤션 검토'],
]);
const pairs = [
  ...['src/shared/api', 'src/shared/lib/cn.ts', 'src/shared/lib/cn.test.ts', 'src/shared/config', 'src/_app/providers', 'src/_pages/home', 'steiger.config.mjs'].map((path) => [`single/${path}`, `fullstack/apps/web/${path}`]),
  ...['fullstack', 'multi-web'].flatMap((template) => ['.agents/skills', '.github/ISSUE_TEMPLATE', '.github/PULL_REQUEST_TEMPLATE.md'].map((path) => [`single/${path}`, `${template}/${path}`])),
  // next.config.ts에는 운영 번들에서 MSW를 빼는 플래그 고정과 /backend rewrite가 있다. 앱 전용 설정이 생기면 예외로 다룬다.
  ...['src/_app/providers', 'src/shared/config', 'steiger.config.mjs', 'next.config.ts'].map((path) => [`multi-web/apps/client/${path}`, `multi-web/apps/admin/${path}`]),
  ...['src/_app/providers/MockProvider.tsx', 'instrumentation.ts'].map((path) => [`single/${path}`, `multi-web/apps/client/${path}`]),
];

async function stat(path) {
  try { return await lstat(join(root, path)); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function compare(left, right) {
  if (right.startsWith('fullstack/apps/web/') && allowedDifferences.has(left)) return;
  const [a, b] = await Promise.all([stat(left), stat(right)]);
  if (!a && templateOnlySkills.has(right)) return;
  // fullstack에는 mocks 폴더가 없다. 자식 파일을 각각 확인해야 새 파일이 예외에 묻히지 않는다.
  if (left === 'single/src/shared/api/mocks' && a?.isDirectory() && !b) {
    for (const name of (await readdir(join(root, left))).sort()) await compare(`${left}/${name}`, `${right}/${name}`);
    return;
  }
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
    // 패키지 없는 single과 패키지를 쓰는 multi-web의 두 연결 파일은 import 지정자만 다르다.
    // 그 지정자만 정규화하고 공백·주석·나머지 코드는 바이트 단위로 비교한다.
    const normalize = (source) => right.startsWith('multi-web/apps/client/')
      ? Buffer.from(source.toString('utf8').replaceAll("'@repo/mocks/browser'", "'@/shared/api/index.mocks'").replaceAll("'@repo/mocks/node'", "'@/shared/api/mocks/node'"))
      : source;
    if (!normalize(first).equals(normalize(second))) differences.push(`${left} ↔ ${right}: 내용 다름`);
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
  const templates = ['single', 'fullstack', 'multi-web'];
  const gateSets = await Promise.all(templates.map(checkGates));
  for (let index = 1; index < templates.length; index += 1) {
    if ([...gateSets[0]].some((gate) => !gateSets[index].has(gate)) || [...gateSets[index]].some((gate) => !gateSets[0].has(gate))) {
      differences.push(`single/.github/workflows/ci.yml ↔ ${templates[index]}/.github/workflows/ci.yml: web 게이트 목록 다름`);
    }
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
