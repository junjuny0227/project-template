# Project Template (single)

Next.js App Router와 Feature-Sliced Design(FSD)으로 만든 단일 웹 앱 템플릿이다. 도메인 코드는 없고, 어느 프로젝트에서든 쓰게 되는 설정과 품질 검사만 들어 있다.

## 요구 사항

- Node.js 24 이상 (`.nvmrc` 참고)
- pnpm 12.18.0 (`corepack enable`로 맞출 수 있다)

## 시작하기

```sh
cp .env.example .env.local   # API_BASE_URL을 실제 API 서버 주소로 바꾼다
pnpm install
pnpm dev                     # http://localhost:3000
```

`API_BASE_URL`은 필수다. 값이 없거나 http(s) 주소가 아니면 `dev`, `build`, `check-types`가 바로 실패하고 이유를 알려 준다.

## 구조

```text
app/                 Next 라우트. layout과 page만 두고 구현은 src에서 가져온다
src/
├── _app/            전역 Provider(TanStack Query), 전역 스타일(Tailwind)
├── _pages/          페이지 구현 (FSD pages 레이어)
├── widgets/         독립적인 화면 블록
├── features/        사용자 기능
├── entities/        도메인 엔티티
└── shared/          api, config, lib
e2e/                 Playwright 테스트
```

- import는 `_app → _pages → widgets → features → entities → shared` 방향으로만 한다. `pnpm lint:fsd`가 검사한다.
- `_app`과 `_pages`에 밑줄이 붙은 이유는 Next가 `src/app`, `src/pages`를 라우터 폴더로 읽기 때문이다.
- `widgets`, `features`, `entities`는 비어 있다. 도메인 코드가 생기면 slice를 추가한다.
- `@/*`는 `src/*`를 가리킨다.

## 들어 있는 설정

| 영역           | 내용                                                                                                        |
| -------------- | ----------------------------------------------------------------------------------------------------------- |
| API            | `@/shared/api`(브라우저, `/backend`로 요청)와 `@/shared/api/index.server`(서버 전용, `API_BASE_URL`로 요청) |
| 에러           | API 호출 실패는 `ApiError { status, code, message, requestId? }`로 정규화된다                               |
| 인증 연결 지점 | 401 응답을 받으면 `setOnUnauthorized`로 등록한 함수가 실행된다. 기본값은 아무것도 하지 않는다               |
| 프록시         | 브라우저의 `/backend/*` 요청은 `API_BASE_URL`로 전달된다. `/api/*`는 Route Handler용으로 비워 두었다        |
| 환경 변수      | `@/shared/config`의 zod 스키마가 검증한다                                                                   |
| 서버 상태      | TanStack Query. `@/shared/api`의 `getQueryClient`로 QueryClient를 얻는다                                    |
| 폼             | zod, react-hook-form, @hookform/resolvers가 설치되어 있다                                                   |
| 스타일         | Tailwind CSS v4. 토큰은 `src/_app/styles/globals.css`의 `@theme`에 둔다                                     |

## 명령어

| 명령어              | 하는 일                                           |
| ------------------- | ------------------------------------------------- |
| `pnpm dev`          | 개발 서버 실행                                    |
| `pnpm build`        | 프로덕션 빌드                                     |
| `pnpm start`        | 빌드 결과 실행                                    |
| `pnpm lint`         | ESLint                                            |
| `pnpm lint:fsd`     | FSD 경계 검사 (steiger)                           |
| `pnpm format`       | Prettier로 고치기                                 |
| `pnpm format:check` | Prettier 검사                                     |
| `pnpm check-types`  | 라우트 타입 생성 후 타입 검사                     |
| `pnpm test`         | 단위 테스트 (Vitest)                              |
| `pnpm test:e2e`     | E2E 테스트 (Playwright). 앱을 빌드해 띄운 뒤 돈다 |

`build`와 `check-types`는 `API_BASE_URL`이 있어야 한다. `.env.local`에 넣어 두면 된다.

E2E를 처음 돌리기 전에 브라우저를 받는다.

```sh
pnpm exec playwright install chromium
```

단위 테스트는 대상 파일 옆에 `*.test.ts(x)`로 두고, E2E 테스트는 `e2e/`에 `*.spec.ts`로 둔다.

## 커밋과 CI

- 커밋할 때 husky가 lint-staged를 실행해 바뀐 파일에 ESLint와 Prettier를 적용한다.
- PR과 `main` push에서 `.github/workflows/ci.yml`이 위 검사를 모두 실행한다.

## 의존성 정책

- 버전은 범위 없이 정확한 값으로 고정한다.
- `pnpm-workspace.yaml`의 `minimumReleaseAge`가 출시 후 7일이 지나지 않은 버전의 설치를 막는다. 새 버전을 올릴 때도 이 기준을 지킨다.

## 에이전트 하네스

- 프로젝트 규칙은 `AGENTS.md`에, 작업 절차는 `.agents/skills/`에 있다.
- `CLAUDE.md`는 `AGENTS.md`를 불러오고, `.claude/skills`와 `.hermes/skills`는 `.agents/skills`를 가리키는 심볼릭 링크다. Windows에서는 Git의 심볼릭 링크 지원(`core.symlinks`)을 켜야 링크가 유지된다.
