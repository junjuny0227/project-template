# Multi-web Template

외부 백엔드를 사용하는 Next.js 프런트엔드 모노레포다. client와 admin은 각각 FSD 구조를 갖고, 공통 코드는 패키지로 공유한다. 도메인 화면·인증 흐름은 포함하지 않는다.

## 시작하기

템플릿 저장소에서는 먼저 `./setup.sh multi-web`을 실행한다. 아래 명령은 선택한 템플릿이 프로젝트 루트로 복사된 뒤 실행한다.

Node.js 24 이상과 pnpm 12.18.0이 필요하다.

```bash
pnpm install --frozen-lockfile
cp apps/client/.env.example apps/client/.env.local
cp apps/admin/.env.example apps/admin/.env.local
pnpm dev
```

- client: `http://localhost:3000`
- admin: `http://localhost:3001`
- 기본 환경에서는 MSW가 브라우저와 서버 요청을 모킹하므로 백엔드 없이 두 홈을 확인할 수 있다.

## 구조

```text
apps/
├── client/                 사용자 웹 (3000)
└── admin/                  관리 웹 (3001)
    ├── app/                얇은 Next 라우트
    ├── src/                _app → _pages → widgets → features → entities → shared
    ├── instrumentation.ts  서버 모킹 시작점
    └── e2e/                홈과 모킹 켜기·끄기 검사
packages/
├── core/                   공통 entities·shared, API 팩토리와 QueryClient, 공통 env 스키마
├── ui/                     cn, 공유 CSS 수집 확인용 fixture
├── tailwind-config/        공통 @theme·@source, PostCSS
├── mocks/                  공통 handler와 브라우저·서버 모킹 시작 함수
├── typescript-config/      TypeScript 공통 설정(base, nextjs, react-library)
└── eslint-config/          ESLint 공통 설정(base, next, react)
```

각 앱의 `shared/api`가 `@repo/core/shared/api` 팩토리에 앱의 baseURL을 연결한다. core는 세그먼트·slice 단위(`@repo/core/shared/<segment>`, `@repo/core/entities/<slice>`, 각각의 `/server`)로만 공개한다. 앱끼리 import하지 않는다. entity는 처음 쓰는 앱에 두고 두 앱 이상에서 쓰면 core로 옮긴다. 공통 의존성 버전은 `pnpm-workspace.yaml`의 `catalog`에서 관리한다.

## 환경 변수

앱마다 `.env.example`을 제공한다. 실제 환경 파일은 커밋하지 않는다.

| 변수                      | 설명                                                              | 예시 / 기본값                                   |
| ------------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `API_BASE_URL`            | 필수 http(s) 백엔드 주소. 서버 요청과 `/backend/*` rewrite에 사용 | `http://localhost:8080`                         |
| `NEXT_PUBLIC_API_MOCKING` | `enabled`일 때만 모킹. 선택 값은 `enabled`, `disabled`            | `.env.example`은 `enabled`, 미설정은 `disabled` |

검증은 앱별 `src/shared/config/env.ts`가 하고, 공통 스키마는 `@repo/core/shared/config`의 `AppEnvSchema`다. 브라우저 요청은 `@/shared/api`의 `/backend` 경로를 쓰고, 서버 요청은 `@/shared/api/index.server`를 쓴다. `/api/*`는 Next Route Handler용이다.

## API 모킹

- handler는 `packages/mocks/src/handlers.ts` 한 곳에 둔다. 모킹할 endpoint마다 handler를 추가한다. 기본 예시는 `GET /health` → `{ status: 'mocked' }` 하나다.
- 앱의 MockProvider는 worker가 시작된 뒤 children을 렌더한다. `instrumentation.ts`는 Node 서버 모킹을 시작한다. mocks 패키지는 env를 읽지 않고 base URL을 인자로 받는다.
- `NEXT_PUBLIC_API_MOCKING`은 빌드 시 고정된다. 운영에서는 변수를 빼거나 `disabled`로 설정하고 다시 빌드한다. 실행 시점에만 값을 바꿔서는 이미 만든 브라우저 번들을 바꿀 수 없다.
- MSW를 올린 뒤 `pnpm --filter @repo/mocks exec msw init`으로 두 앱의 `public/mockServiceWorker.js`를 재생성한다.
- 홈의 `서버 요청: mocked`, `브라우저 요청: mocked`은 배선 확인용이다. 실제 화면·API를 붙이며 제거할 때 `mocking-on.spec.ts`도 함께 바꾼다.

## 명령과 검증

루트 명령은 두 앱과 해당 패키지의 작업을 Turborepo로 실행한다.

```bash
pnpm dev
pnpm lint
pnpm lint:fsd
pnpm format:check
pnpm check-types
pnpm test
pnpm exec playwright install --with-deps chromium
pnpm test:e2e
pnpm build
```

`check-types`, `build`에는 `API_BASE_URL`이 필요하다. 환경 파일 없이 검사하려면 `API_BASE_URL=http://localhost:8080 NEXT_PUBLIC_API_MOCKING=disabled pnpm build`처럼 명령 앞에 전달한다. `.github/workflows/ci.yml`은 같은 게이트를 실행하며 운영 빌드의 모킹을 명시적으로 끈다.

- `lint:fsd`: client, admin, core의 FSD 경계 검사.
- `test`: Vitest 단위 테스트.
- `test:e2e`: 앱마다 Playwright가 서버 두 개를 직접 띄운다. `chromium` 프로젝트는 모킹을 끈 빌드·운영 서버(3000/3001), `mocking` 프로젝트는 모킹을 켠 개발 서버(3100/3101)를 사용한다. 백엔드는 필요 없으며 네 포트는 비워 둔다.
- `build`: 두 앱 빌드와 공유 UI 클래스·앱 전용 토큰이 CSS에 포함됐는지 검사.
- `format`: Prettier 자동 수정.

## 에이전트와 작업 양식

규칙은 `AGENTS.md`, Claude 진입점은 `CLAUDE.md`다. 여섯 스킬의 원본은 `.agents/skills`이며 `.claude/skills`와 `.hermes/skills`는 이 폴더를 가리킨다. 이슈·PR 양식은 `.github`에 있다.
