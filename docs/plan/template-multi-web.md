# 프런트엔드 모노레포 템플릿 추가 계획

> 상태: **초안. 사용자 승인 전이다.** 요구사항은 [template-rebuild.md](./template-rebuild.md)의 Q44–Q47을 따른다. 1차 재구축(`template-rebuild-implementation.md`, 검증 완료)은 그대로 두고 그 위에 더한다. 승인 전에는 실행하지 않는다.

## 1. 목표

- **요청**: 백엔드를 따로 두는 프런트엔드 모노레포 템플릿을 세 번째로 추가한다. 앱은 `apps/client`와 `apps/admin`이다.
- **요청 너머의 목표**: 앱이 두 개가 되어도 공통 코드는 한 곳에서만 고친다. 백엔드가 없어도 `pnpm dev`와 E2E가 동작한다. 세 템플릿이 서로 조용히 어긋나지 않는다.
- **결과 구조**: `./setup.sh single | fullstack | multi-web`

| 폴더 | 내용 |
|---|---|
| `single/` | Next.js 단일 앱 (변경 없음) |
| `fullstack/` | 기존 `monorepo/`의 이름만 바꾼 것. `apps/web` + `apps/api` (Q45) |
| `multi-web/` | 새 템플릿. `apps/client` + `apps/admin` + 공용 패키지 |

## 2. 비목표

- 도메인 화면, 도메인 API, 도메인 mock handler는 만들지 않는다. MSW는 설정과 동작 확인용 handler 1개(`GET /health`)만 둔다.
- `fullstack`에는 MSW를 넣지 않는다. 실제 api가 같이 뜨기 때문이다. `single`에는 넣는다(Q52, U4b).
- admin 전용 UI 키트나 인증 화면은 넣지 않는다(Q36 원칙: 도메인 코드 없음).
- 앱끼리 서로 import하지 않는다. 공유는 `packages/*`로만 한다.

## 3. 결정한 구조

```text
multi-web/
├── apps/
│   ├── client/                   # Next.js 16, FSD, 포트 3000
│   └── admin/                    # Next.js 16, FSD, 포트 3001 (client와 같은 골격)
│       ├── app/                  # layout.tsx, page.tsx (재수출만)
│       ├── src/
│       │   ├── _app/{providers,styles}/   # TanStackProvider, MockProvider(개발용), globals.css(@repo/tailwind-config import + 앱 전용 @theme 덮어쓰기 자리)
│       │   ├── _pages/home/
│       │   ├── widgets/.gitkeep  features/.gitkeep  entities/.gitkeep
│       │   └── shared/{api,config}/       # api: @repo/core의 팩토리에 이 앱의 baseURL을 연결하는 얇은 층, config: zod env
│       ├── instrumentation.ts    # 서버(RSC) 요청용 MSW node server 시작 (모킹 켰을 때만)
│       ├── public/mockServiceWorker.js    # `msw init`으로 생성, 커밋
│       └── e2e/                  # 홈 스모크 + 모킹된 API 응답이 화면에 도달하는지
├── packages/
│   ├── typescript-config/  eslint-config/   # fullstack에서 가져오고 nest 프리셋은 뺀다
│   ├── ui/                       # cn (+ @source 검사용 fixture)
│   ├── tailwind-config/          # @repo/tailwind-config: shared-styles.css(@import tailwindcss, 공통 @theme 토큰, @source ../ui), postcss.config
│   ├── core/                     # @repo/core: 앱 공용 FSD 하위 레이어 (Q49)
│   │   └── src/
│   │       ├── entities/.gitkeep # 두 앱 이상이 쓰는 entity만 앱에서 올려 온다
│   │       └── shared/api/       # createApiInstance, 인터셉터(ApiError·requestId·onUnauthorized), createApiMethods, getQueryClient
│   │   (공개 진입점: slice 단위 `@repo/core/shared/api`, `@repo/core/entities/*`, `.../server` — Q54)
│   └── mocks/                    # @repo/mocks: handlers(예시 /health 1개), browser·node setup 함수
├── .github/ .agents/skills/ .claude/skills→ .hermes/skills→ AGENTS.md CLAUDE.md README.md
└── turbo.json  package.json  pnpm-workspace.yaml  pnpm-lock.yaml  .prettierrc  .husky/ ...
```

- **`@repo/core`의 경계 (Q49, 공개 경로는 Q54로 바뀜: 루트·`/server` 대신 slice 단위 서브패스)**: datagsm-client-v2에서 쓰던 구조를 따른다. 앱은 `_app → _pages → widgets → features → entities → shared` 전체를 갖고, core는 `entities → shared`만 갖는다. 앱은 core를 공개 진입점(`@repo/core`, 서버 전용은 `@repo/core/server`)으로만 import한다. core에는 env를 넣지 않고, 앱별 baseURL은 각 앱의 `shared/api`가 core의 팩토리에 넣는다. 서버 전용 코드는 `index.server.ts`에만 두고 `import 'server-only'`를 붙이며, 클라이언트 배럴(`index.ts`)에는 섞지 않는다. core와 ui는 소스 그대로 쓰므로 각 앱 `transpilePackages`에 넣는다. 빌드 산출물을 배포하는 UI 패키지라면 `transpilePackages`에서 뺀다는 규칙은 AGENTS.md에만 남긴다.
- **entity 승격 규칙**: entity는 처음 쓰는 앱에 둔다. 두 앱 이상이 쓰게 되면 `packages/core/src/entities`로 올린다. 앱끼리는 어떤 경우에도 import하지 않는다.
- **버전 관리 (Q50)**: pnpm `catalog`로 공통 의존성 버전을 `pnpm-workspace.yaml` 한 곳에 적고, 각 package.json은 `catalog:`로 참조한다. `fullstack`도 U1에서 같은 방식으로 바꾼다. 7일 규칙과 정확한 버전 고정은 그대로 지킨다.
- **env**: 앱마다 `API_BASE_URL`(필수)과 `NEXT_PUBLIC_API_MOCKING`(`enabled`일 때만 모킹)을 둔다. `.env.example`에서 `NEXT_PUBLIC_API_MOCKING=enabled`를 기본값으로 둔다. 백엔드 없이 바로 `pnpm dev`가 되게 하기 위해서다.
- **MSW**: 버전은 실행 시점에 7일 규칙을 지키는 최신(2026-11-12 기준 3.0.3). 브라우저는 `_app/providers`의 MockProvider가 worker 시작을 기다린 뒤 렌더한다. 서버는 `instrumentation.ts`의 `register()`가 node server를 띄운다. 운영 빌드에서는 `NEXT_PUBLIC_API_MOCKING`이 없으면 MSW 코드가 실행되지 않는다.
- **Tailwind 공통 설정 (Q48)**: v4는 JS 설정 파일 없이 CSS가 설정이다. 그래서 공통 토큰(`@theme`), `@import 'tailwindcss'`, `packages/ui`를 가리키는 `@source`를 `@repo/tailwind-config/shared-styles.css` 한 곳에 두고, PostCSS 설정도 이 패키지에서 내보낸다. 각 앱 `globals.css`는 이 파일을 import한 뒤 앱 전용 토큰만 덮어쓴다(예: admin의 밀도). Turborepo 공식 `with-tailwind` 예제와 같은 구조다. Prettier `tailwindStylesheet`는 앱별 override로 각 앱 `globals.css`를 가리킨다.
- **steiger**: client, admin, `packages/core` 각각에 적용한다. 음성 대조도 셋 다 한다. core에서는 `shared → entities` import를 심는다. 나머지 `packages/*`는 검사하지 않는다.
- **drift 검사**: 세 범위를 본다.
  1. `single` ↔ `fullstack/apps/web` (기존 범위. 단 MSW 관련 파일인 MockProvider·`instrumentation.ts`·env 스키마의 모킹 변수는 의도한 차이로 제외 목록에 이유와 함께 적는다)
  1-1. `single` ↔ `multi-web/apps/client`의 MockProvider·`instrumentation.ts` (모킹 연결 코드가 두 템플릿에서 같게 유지되는지)
  2. `multi-web/apps/client` ↔ `multi-web/apps/admin`의 `_app/providers`, `shared/config`, `steiger.config.mjs`
  3. 세 템플릿의 `.agents/skills/**`와 이슈·PR 양식
- **하네스**: AGENTS.md는 웹 규칙을 `single`에서 가져오고 "패키지 경계" 절을 더한다. 이 절에는 core·ui·tailwind-config·mocks 사용법, 앱 간 import 금지, entity 승격, `transpilePackages`와 서버 서브패스 규칙을 담는다. datagsm의 `nextjs-package-boundaries`·`nextjs-turborepo-fsd` 스킬은 짧고 늘 적용되는 규칙이라 별도 스킬로 두지 않고 이 절로 흡수한다. 그 스킬의 `.harness/sync.yml`, `check-fsd-dependencies.mjs`·`views`(Q8), shadcn(Q23) 부분은 이번 재구축 결정과 맞지 않아 가져오지 않는다. 스킬 6개는 세 템플릿이 같은 내용이다(`data-and-forms`는 getQueryClient import 경로를 템플릿에 묶이지 않게 쓴다).

### fullstack에 함께 생기는 변경 (U1)

이름 변경과 Q48–Q51 결정 때문에 기존 템플릿에서 고칠 것이다. 앱 동작은 바뀌지 않는다.

| 대상 | 변경 | 이유 |
|---|---|---|
| 이름 표기 | `AGENTS.md` 제목 `(monorepo)` → `(fullstack)`, `README.md` 제목, 루트 `package.json`의 `name`(`project-template-monorepo` → `project-template-fullstack`) | 폴더 이름 변경(Q45) |
| 버전 관리 | `pnpm-workspace.yaml`에 `catalog`, 각 package.json의 공통 의존성을 `catalog:`로. lockfile 재생성(버전 값은 그대로) | Q50 |
| AGENTS.md 스택 절 | "공통 의존성 버전은 `pnpm-workspace.yaml`의 catalog 한 곳에서 바꾼다" 한 줄 | Q50. 없으면 에이전트가 package.json에 버전을 직접 적는다 |
| AGENTS.md 새 "패키지 경계" 절 | ① `apps/web`과 `apps/api`는 서로 import하지 않는다. web과 api가 같은 타입·상수를 써야 하면 `packages/`에 새 패키지를 만들어 공유한다 ② 패키지는 `package.json` `exports`에 적힌 진입점으로만 import한다 ③ 앱에서 소스 그대로 쓰는 패키지를 새로 만들면 web `transpilePackages`에 넣는다 | datagsm 스킬에서 가져온 규칙 중 fullstack에도 해당하는 것. ①은 풀스택 모노레포에서 가장 먼저 생기는 유혹이라 규칙이 필요하다. 공유 타입 패키지 자체는 도메인 코드라 템플릿에 미리 만들지 않는다 |
| `packages/ui` 제거 (Q51) | `cn`과 테스트를 `apps/web/src/shared/lib`으로 옮긴다(single과 같은 위치). `packages/ui`, `@source`, `transpilePackages`, `scripts/check-ui-css.mjs`, `.lintstagedrc.mjs`의 ui 항목, AGENTS.md·README의 `@repo/ui` 표기를 지운다. drift 검사에 `shared/lib/cn.ts`·`cn.test.ts`를 비교 대상으로 넣는다 | 웹 앱이 하나라 공유 대상이 없다. 남은 것은 `cn` 한 파일인데, 패키지로 두면 `@source` 경로와 그 검사 스크립트까지 유지해야 한다. 옮기면 web이 single과 더 같아져 drift 검사도 단순해진다 |
| 그대로 두는 것 | Tailwind는 앱 안에 둔다(웹 앱 1개, Q48). MSW는 넣지 않는다(실제 api가 같이 뜬다). `@repo/core`도 만들지 않는다(공유할 앱이 없다). 남는 공용 패키지는 `typescript-config`, `eslint-config` 두 개다(web·api가 실제로 함께 쓴다) | 공유할 대상이 없는 패키지는 늘리지 않는다 |

스킬 6개는 세 템플릿에서 같게 유지한다. 그래서 multi-web의 각 앱 `shared/api`는 `@repo/core`의 함수를 이 앱 인스턴스로 묶어 `get`·`post`·`getQueryClient` 등을 같은 이름으로 다시 공개한다. 스킬 예시의 `@/shared/api` import가 세 템플릿 모두에서 그대로 맞고, single·fullstack 스킬은 고치지 않는다.

## 4. 작업

| ID | 작업 | 의존 | 쓰기 범위 | 완료 판정 |
|---|---|---|---|---|
| **U1** | `monorepo/` → `fullstack/` 이름 변경(`git mv`)과 §3 "fullstack에 함께 생기는 변경" 표 전체. `setup.sh`의 TEMPLATES, `test-setup.sh` 픽스처, `verify-template.sh`, drift 검사, 루트 CI 매트릭스, 루트 README, `fullstack/README.md`·`fullstack/.github`의 이름을 바꾼다. `fullstack/AGENTS.md`는 부모가 고친다(보호 파일). | — | `fullstack/**`, `setup.sh`, `scripts/**`, `.github/**`, `README.md` | `test-setup.sh` 11개 통과, `verify-template.sh fullstack` exit 0, drift exit 0, actionlint exit 0 |
| **U2** | 새 `multi-web/` 루트(catalog 포함)와 `packages/{typescript-config,eslint-config,ui,tailwind-config,core,mocks}`. `@repo/core/src/shared/api`에 single의 api 코드와 테스트(②⑤⑥⑦, 동시 401)를 옮기고, core에 steiger를 건다. | U1 | `multi-web/package.json` 등 루트 파일, `multi-web/packages/**`, `multi-web/pnpm-lock.yaml` | frozen install, `turbo run lint check-types test --filter=./packages/*` exit 0, core steiger exit 0과 음성 대조 실패 확인, `@repo/core`의 `index.ts`에서 닿는 파일에 `server-only`가 없음을 grep으로 확인 |
| **U3** | `apps/client`, `apps/admin` 골격(FSD, `.gitkeep` 레이어, env, rewrite, `@repo/core` 연결, steiger), 단위 테스트(④ env, ③ HomePage)와 홈 E2E. 포트 3000/3001. | U2 | `multi-web/apps/**`, lockfile, `turbo.json` | 두 앱 lint·lint:fsd·check-types·test·build exit 0, 홈 E2E 통과, drift 범위 2가 같음 |
| **U4** | MSW: `@repo/mocks`, 각 앱 MockProvider·`instrumentation.ts`·`public/mockServiceWorker.js`. 테스트 `모킹을 켜면 브라우저 요청이 handler 응답을 받는다`(E2E), `모킹을 켜면 서버 컴포넌트 요청도 handler 응답을 받는다`(E2E), `모킹을 끄면 worker가 등록되지 않는다`(E2E), 운영 빌드 결과물에 MSW 코드가 들어가지 않는지 확인. | U3 | `multi-web/packages/mocks/**`, `multi-web/apps/**`, lockfile | 위 E2E 3개 통과, `pnpm dev`로 백엔드 없이 홈이 뜸 |
| **U4b** | single에 MSW를 넣는다(Q52). U4에서 검증한 구성을 패키지 없이 옮긴다: `src/shared/api/mocks/`(handlers·browser·node), `_app/providers`의 MockProvider, `instrumentation.ts`, `public/mockServiceWorker.js`, env `NEXT_PUBLIC_API_MOCKING`, `.env.example` 기본값 `enabled`. U4의 E2E 3개와 운영 빌드 grep을 같게 둔다. AGENTS.md(single)에 "API 모킹" 절을 더한다(부모가 배치). | U4 | `single/**`, `scripts/check-template-drift.mjs` | single lint·lint:fsd·check-types·test·build exit 0, E2E 3개 통과, 운영 빌드에 MSW 없음, drift 통과 |
| **U5** | 하네스·CI·README: 스킬 6개(세 템플릿 동일), 링크, `.github/`(CI, 이슈·PR 양식), README. AGENTS.md 초안은 scratch에 쓰고 부모가 배치한다. | U4b | `multi-web/.agents/**`, `.claude/`, `.hermes/`, `.github/`, `README.md`, `single/.agents/**`, `fullstack/.agents/**`(문구 정렬만) | actionlint exit 0, 스킬 세 벌 `diff -r` 동일 |
| **U6** | `setup.sh`·`test-setup.sh`·`verify-template.sh`·drift·루트 CI를 세 템플릿으로 확장한다. `setup.sh`는 고르지 않은 두 폴더를 지운다. | U5 | `setup.sh`, `scripts/**`, `.github/workflows/**`, `README.md` | `test-setup.sh`에 `multi-web` 선택 케이스와 "나머지 두 폴더 삭제" 확인 추가 후 통과, `verify-template.sh single·fullstack·multi-web` 모두 exit 0, drift 3범위 통과 + 음성 대조 |
| **U7** | 독립 리뷰 + 종료 게이트(1차 §6 명령을 세 템플릿으로) | U6 | 없음 | 전 항목 exit 0 |

## 5. 리스크와 검증 공백

| 리스크 | 대응 |
|---|---|
| 공통 CSS의 `@source`가 상대 경로라 패키지 위치가 바뀌면 ui 클래스가 조용히 빠짐 | 앱 빌드 CSS에 ui fixture 클래스가 있는지 grep하는 검사를 client·admin 둘 다에 둔다(U3) |
| 앱 globals.css에서 공통 토큰을 덮어쓰면 순서에 따라 적용되지 않음 | 앱 전용 `@theme`는 import 뒤에 둔다는 규칙을 AGENTS.md에 적고, admin에 덮어쓴 토큰 1개가 빌드 CSS에 반영되는지 확인(U3) |
| `@repo/core`가 서버 코드를 클라이언트 번들로 끌고 감 | 서버 전용 코드는 `index.server.ts`와 `/server` 서브패스에만 두고, 클라이언트 배럴 grep과 build로 확인(U2·U3) |
| steiger가 패키지 루트(`packages/core/src`)를 레이어 구조로 인식하지 못함 | U2의 음성 대조로 실제로 잡히는지 확인한다. 안 잡히면 보고하고 대안을 정한다 |
| single에 MSW가 들어가 fullstack web과의 drift 예외가 늘어남 | 예외는 MSW 파일 3곳으로 한정하고 목록에 이유를 적는다. 대신 single ↔ multi-web client 비교로 모킹 코드 자체는 맞춘다(U4b) |
| MSW가 운영에 섞임 | env가 `enabled`일 때만 동적 import, 운영 빌드 산출물 grep(U4) |
| App Router에서 MSW 서버 측 모킹이 불안정함(공식 지원이 제한적) | `instrumentation.ts` 방식으로 구현하고 서버 컴포넌트 요청 E2E로 확인. 안 되면 서버 모킹은 빼고 브라우저 모킹만 남긴 뒤 보고한다(U4) |
| 이름 변경으로 기존 문서·스킬의 `monorepo` 표기가 틀어짐 | U1에서 `grep -rn "monorepo"`로 남은 표기를 전수 확인한다("모노레포"라는 일반 명사는 둔다). 1차 계획 문서는 기록이므로 상단에 이름 변경 주석만 단다 |
| `setup.sh` 삭제 목록이 세 폴더로 늘며 실수 가능성 증가 | 템플릿 목록을 상단 한 곳에서만 정의하고 테스트로 세 조합을 모두 확인(U6) |

## 6. 승인 범위

- U1의 폴더 이름 변경(`monorepo` → `fullstack`)과 관련 스크립트·CI 수정
- §3 구조와 U1–U7
- 새로 만들고 고칠 보호 파일: `multi-web/AGENTS.md`, `multi-web/CLAUDE.md` 생성, `single/AGENTS.md`에 "API 모킹" 절 추가, `fullstack/AGENTS.md`의 제목 수정·스택 절 한 줄·"패키지 경계" 절 추가·`@repo/ui` 표기 정리
- 커밋은 작업 단위로 나눠서 하고, push는 따로 확인받는다
