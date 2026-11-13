# Project Template (multi-web)

Next.js App Router 기반의 **프런트엔드 모노레포**다. `apps/client`(3000)와 `apps/admin`(3001)이 외부 백엔드를 사용한다. Feature-Sliced Design(FSD) 공식 Next.js 구조를 따른다. 모든 응답과 문서는 한국어로 작성하고, 식별자·파일 이름·커밋 타입은 영어로 둔다.

## 스택

pnpm 12 / Next.js 16 (App Router, React Compiler) / React 19 / TypeScript 6 / Tailwind CSS 4 / TanStack Query 5 / axios / zod 4 / react-hook-form / Vitest / Playwright / ESLint 10 + Prettier / steiger.

- 의존성은 범위 없이 정확한 버전으로 고정한다. `pnpm-workspace.yaml`의 `minimumReleaseAge`(7일)를 지키며, 출시 7일이 지나지 않은 버전은 올리지 않는다.
- 공통 의존성 버전은 `pnpm-workspace.yaml`의 `catalog` 한 곳에서 바꾸고 package.json은 `catalog:`로 참조한다.
- 사용자 요청 없이 새 라이브러리를 추가하지 않는다.
- Next.js 16 API가 기억과 다르면 `node_modules/next/dist/docs/`의 번들 문서를 확인한다.

## 구조

```text
apps/{client,admin}/
├── app/                   얇은 Next 라우트
├── src/
│   ├── _app/              providers(TanStackProvider, MockProvider), styles/globals.css
│   ├── _pages/            home/ui/HomePage.tsx
│   ├── widgets/           .gitkeep
│   ├── features/          .gitkeep
│   ├── entities/          .gitkeep
│   └── shared/            api(앱별 연결), config(core 스키마로 env 검증)
├── instrumentation.ts     서버 모킹 시작점
├── public/mockServiceWorker.js
└── e2e/                   Playwright 테스트
packages/
├── core/                  entities → shared, API 팩토리·인터셉터·getQueryClient, env 스키마
├── ui/                    cn, CSS 수집 확인용 fixture
├── tailwind-config/       공통 CSS 토큰·@source, PostCSS
├── mocks/                 handler, browser·node 시작 함수
├── typescript-config/     base, nextjs(앱), react-library(ui·core)
└── eslint-config/         base, next(앱), react(ui·core)
```

- `_app`·`_pages`의 밑줄은 Next가 `src/app`, `src/pages`를 라우터 폴더로 읽지 않게 하려고 붙였다. steiger는 이 둘을 `app`·`pages` 레이어로 인식한다.
- `widgets`, `features`, `entities`는 실제 도메인 코드가 생길 때만 slice를 추가한다. 빈 slice나 세그먼트를 미리 만들지 않는다.
- 아래 `src/`, `app/`, `@/` 경로는 각 웹 앱 기준이다. 동일 스킬의 `apps/web/` 예시는 이 템플릿에서는 `apps/client/` 또는 `apps/admin/`에 대응한다.
- `@/*`는 각 앱의 `src/*`를 가리킨다. 루트 `app/`도 `@/`로 `src`를 import한다.
- 기존 라우트와 공개 API를 사용자 요청 없이 삭제하거나 이름을 바꾸지 않는다.

## FSD 규칙

상세 가이드(레이어 판단, slice 설계, `@x`, 예시)는 [`nextjs-fsd-architecture`](.agents/skills/nextjs-fsd-architecture/SKILL.md) 스킬에 있다. 여기에는 늘 적용되는 핵심만 둔다.

- import 방향은 `_app → _pages → widgets → features → entities → shared`뿐이다. 같은 레이어의 다른 slice와 slice 내부 경로 import도 금지다. `pnpm lint:fsd`(steiger)가 검사한다.
- slice 밖에서는 공개 `index.ts`로만 import한다. 서버 전용 코드는 `index.server.ts`로 따로 공개하고 클라이언트 배럴에 섞지 않는다.
- 루트 `app/`의 라우트 파일은 얇게 둔다. 페이지 구현은 `src/_pages/<slice>`에 두고 라우트는 재수출이나 조합만 한다. **steiger는 루트 `app/`을 검사하지 않으므로** 라우트 파일에 비즈니스 로직을 넣지 않는 것은 직접 지킨다.

```ts
// app/page.tsx
export { HomePage as default } from '@/_pages/home';
```

- 세그먼트는 필요할 때만 만든다: `ui/` 컴포넌트 · `model/` 타입·훅·스키마·상수 · `api/` 요청 함수·query key · `lib/` slice 전용 유틸 · `config/` 설정.
- feature 전용 코드를 `shared/`에 넣지 않는다.

## 패키지 경계

- 앱끼리는 어떤 경우에도 import하지 않는다. 공유는 `packages/*`로만 한다. 패키지는 package.json의 `exports`에 있는 공개 진입점으로만 import한다.
- core는 FSD의 `entities → shared`만 가진다. 패키지 루트 진입점은 없고, 앱 안의 slice 공개 API와 같은 단위로 공개한다.

  | import                               | 대상                                                      |
  | ------------------------------------ | --------------------------------------------------------- |
  | `@repo/core/shared/<segment>`        | shared 세그먼트의 `index.ts`(예: `@repo/core/shared/api`) |
  | `@repo/core/shared/<segment>/server` | shared 세그먼트의 `index.server.ts`(서버 전용)            |
  | `@repo/core/entities/<slice>`        | entity의 `index.ts`(클라이언트 안전)                      |
  | `@repo/core/entities/<slice>/server` | entity의 `index.server.ts`(서버 전용)                     |

- shared 세그먼트(`api`, 이후 `config`·`lib` 등)와 entity slice는 앱과 같은 공개 API 구조(`index.ts`, 필요할 때 `index.server.ts`)를 따르므로 새로 만들어도 `exports`를 고칠 필요가 없다. 공개 파일 안쪽 경로(`@repo/core/entities/user/model` 등)는 import하지 않는다. 와일드카드가 여러 단계 경로도 받으므로 하위 폴더에 `index.ts`를 만들면 그 경로도 열린다는 점에 주의한다.
- core의 entity도 앱과 같은 slice 구조(세그먼트, `index.ts`, 필요할 때 `index.server.ts`)를 따른다. 서버 전용 구현에는 `import 'server-only'`를 붙이고 `index.ts`에 섞지 않는다.
- 앱의 `src/shared`는 `@repo/core/entities/*`를 import할 수 없다. ESLint가 막는다. core 안의 레이어 규칙은 core의 `lint:fsd`(steiger)가 검사한다.
- core에는 env를 넣지 않는다. 앱별 `shared/api`가 core 팩토리에 baseURL을 넣고 `get`, `post`, `getQueryClient` 등을 같은 이름으로 공개한다.
- entity는 처음 쓰는 앱에 둔다. 두 앱 이상이 쓰게 되면 slice 폴더를 `packages/core/src/entities`로 옮기고 import를 `@/entities/<slice>`에서 `@repo/core/entities/<slice>`로 바꾼다.
- ESLint는 앱이 `@repo/eslint-config/next`, React 코드를 담는 패키지(ui, core)가 `@repo/eslint-config/react`를 쓴다. `react`는 Next 전용 규칙과 앱 전용 FSD 규칙을 빼고 React·hooks·접근성 규칙을 `next`와 같게 켠다. 두 설정의 규칙 집합은 `packages/eslint-config/react.test.mjs`가 비교하므로, 한쪽만 바꾸면 테스트가 실패한다. React가 없는 패키지(mocks)는 `base`를 쓴다.
- `@repo/ui`는 `cn`을 제공한다. 앱에서 소스를 그대로 쓰는 패키지는 `transpilePackages`에 넣는다(현재 core, ui, mocks). 빌드 산출물을 배포하는 UI 패키지로 바꾸면 해당 패키지는 목록에서 뺀다.
- 공통 토큰과 UI 소스 수집은 `@repo/tailwind-config/shared-styles.css`, PostCSS는 `@repo/tailwind-config/postcss`를 쓴다. 앱의 globals.css는 공통 CSS를 먼저 import하고 그 뒤에 앱 전용 `@theme`만 덮어쓴다.
- 두 앱의 `next.config.ts`는 같게 유지한다(drift 검사가 비교한다). 모킹 플래그 고정과 `/backend` rewrite가 들어 있어서다. 앱 전용 설정이 필요하면 해당 앱 파일에 추가하고 drift 검사에 예외를 함께 둔다.
- `@repo/mocks`는 공통 handler와 시작 함수를 제공한다. 앱의 모킹 배선과 환경 변수는 아래 API 모킹 규칙을 따른다.

## 네이밍

| 구분              | 규칙                         | 예                                 |
| ----------------- | ---------------------------- | ---------------------------------- |
| slice 폴더        | kebab-case                   | `user-profile/`                    |
| 컴포넌트 파일     | PascalCase                   | `ui/HomePage.tsx`                  |
| 유틸·훅·기타 파일 | camelCase                    | `getQueryClient.ts`, `cn.ts`       |
| props 타입        | PascalCase + `Props`         | `HomePageProps`                    |
| 그 밖의 타입      | PascalCase, 종류 접미사 없음 | `User`, `UserResponse`             |
| 요청 타입         | PascalCase + `Request`       | `UpdateProfileRequest`             |
| zod 스키마        | PascalCase + `Schema`        | `EnvSchema`, `UpdateProfileSchema` |

예시 이름 중 이 표에서 처음 나온 것(`user-profile` 등)은 구현된 모듈이 아니다.

## 타입

- 객체 형태는 `interface`, 유니온과 조합은 `type`을 쓴다.
- `enum`은 쓰지 않는다. 리터럴 유니온과 `as const` 객체 또는 `Record`를 쓴다. ESLint가 막는다.
- 타입만 가져올 때는 `import type`을 쓴다. ESLint가 고친다.
- 타입 이름에 `Type` 같은 종류 접미사를 붙이지 않는다. 같은 이름의 값(클래스·상수)이 있을 때만 역할을 나타내는 단어를 붙인다(`ApiError` 클래스의 생성 인자는 `ApiErrorInit`).

## 컴포넌트

- 화살표 함수와 props 구조 분해를 쓴다.
- `src` 안의 모듈은 named export만 쓴다(`export const HomePage = …`, 소유 slice의 `index.ts`에서 `export { HomePage } from './ui/HomePage';`). default export는 Next가 요구하는 루트 `app/` 라우트 파일과 설정 파일에만 두고, 라우트는 `export { HomePage as default } from '@/_pages/home';`로 재수출한다. `src`의 default export는 ESLint가 막는다.
- 컴포넌트 안의 순서는 변수·훅 → 핸들러·기타 로직 → `useEffect`(필요할 때만) → return이다. 관례를 맞추려고 필요 없는 상태나 effect를 만들지 않는다.
- 기본은 Server Component다. 상태·이벤트·브라우저 API가 필요한 가장 작은 컴포넌트에만 `'use client'`를 붙인다.
- import 정렬(`react` → `next` → 외부 패키지 → `@/` → 상대 경로)은 ESLint `simple-import-sort`가 고친다.

## 스타일링

- Tailwind CSS v4다. 앱 진입점은 `src/_app/styles/globals.css`, 공통 디자인 토큰은 `@repo/tailwind-config/shared-styles.css`가 소유한다. 토큰은 `@theme`에 추가하고(`--color-background` → `bg-background`), 다른 전역 스타일 진입점을 만들지 않는다.
- 정적 클래스는 문자열 하나로 쓴다. `cn()`(`@repo/ui`)은 조건부 클래스나 외부 `className` 병합이 있을 때만 쓴다.
- 여러 곳에서 반복되는 클래스 조합만 소유 slice의 `ui/styles.ts` 상수로 뺀다.
- 클래스 순서는 Prettier(`prettier-plugin-tailwindcss`)가 정렬한다.

```tsx
// ❌ 조건이 없는데 cn()
className={cn('flex items-center gap-2')}

// ✅ 정적 클래스
className="flex items-center gap-2"

// ✅ 조건부 클래스, 외부 className 병합
className={cn('flex gap-2', isActive && 'bg-foreground text-background')}
className={cn('rounded-lg px-4', className)}
```

## API

### 인스턴스와 경계

| 용도                       | import                      | 인스턴스              | baseURL        |
| -------------------------- | --------------------------- | --------------------- | -------------- |
| 브라우저                   | `@/shared/api`              | `axiosInstance`       | `/backend`     |
| 서버(RSC, Server Function) | `@/shared/api/index.server` | `serverAxiosInstance` | `API_BASE_URL` |

- 브라우저의 `/backend/*` 요청은 `next.config.ts`의 rewrite가 `API_BASE_URL`로 넘긴다. `/api/*`는 Route Handler용으로 비워 둔다.
- 서버 인스턴스는 `server-only`를 import한다. 클라이언트 코드에서 `index.server`를 import하면 빌드가 실패한다.
- 요청에는 두 공개 모듈의 `get / post / patch / put / del`을 쓴다. `createApiMethods`가 만든 함수이며 응답의 `.data`를 돌려준다. 인스턴스를 직접 호출하면 `AxiosResponse`가 돌아오므로 일반 요청에는 쓰지 않는다.
- 응답 타입은 첫 번째 제네릭, body 타입은 두 번째 제네릭이다. 응답 타입을 적으면서 body도 검사하려면 둘 다 적는다: `post<UserResponse, UpdateProfileRequest>(url, body)`.
- URL 상수는 해당 entity·feature의 `api/`에 둔다. 서버 API의 실제 경로를 따르고 근거 없이 `/api`나 버전 prefix를 붙이지 않는다.

### 에러

- 모든 요청 실패는 인터셉터가 `ApiError { status, code, message, requestId? }`로 바꿔서 던진다. 원본 에러는 `cause`에 있다.
- 응답이 없는 실패(네트워크 오류, 타임아웃, 취소)는 `status: 0`이다.
- `requestId`는 응답 헤더 `X-Request-Id` 값이다. 에러를 보고하거나 로그를 찾을 때 함께 남긴다.
- 화면에서는 `error instanceof ApiError`로 좁힌 뒤 `status`·`code`로 분기한다.

### 401 처리 지점

`setOnUnauthorized(handler)`로 401 응답 때 실행할 함수를 등록한다. 기본값은 아무것도 하지 않는다. 토큰 저장·갱신·로그인 흐름은 템플릿에 없으며, 인증을 붙일 때 여기에 연결한다.

- 동시에 들어온 401은 진행 중인 훅 호출 하나를 함께 기다린다. 훅이 끝나면 원래 요청은 `ApiError`로 실패한다(자동 재시도는 없다).
- 훅 안에서 보내는 요청(토큰 갱신 등)은 이 인터셉터가 없는 별도 axios 인스턴스로 보낸다. 같은 인스턴스로 보내 401을 받으면 그 요청이 훅을 기다리며 끝나지 않는다.
- 훅이 에러를 던지면 요청은 `ApiError`가 아니라 그 에러로 실패한다.
- 서버 인스턴스는 모듈 상태가 요청 사이에 공유된다. 서버 쪽에 사용자별 동작을 하는 훅을 등록하지 않는다.

## 환경 변수

- 서버 환경 변수는 `src/shared/config/env.ts` 한 곳에서 검증하고 `env`로 꺼내 쓴다. 두 앱 공통 변수와 오류 메시지는 `@repo/core/shared/config`의 `AppEnvSchema`가 소유하고, 앱은 `process.env` 값을 모아 `parseEnv`에 넘긴다. 앱 전용 변수는 `AppEnvSchema.extend({...})`로 더한다. 일반 기능은 `process.env`를 다른 곳에서 직접 읽지 않는다. API 모킹의 빌드 시 분기는 아래 예외를 따른다.
- 새 변수를 추가하면 스키마(공통이면 core, 앱 전용이면 앱의 `extend`), `.env.example`, CI의 `env`를 함께 고친다.
- 각 앱의 변수는 `API_BASE_URL`(필수, http(s) URL)과 `NEXT_PUBLIC_API_MOCKING`(선택, `enabled` 또는 `disabled`)이다. `API_BASE_URL`이 없으면 `dev`, `build`, `check-types`가 바로 실패한다.
- `env`는 서버에서만 읽는다. 클라이언트 컴포넌트에서 import하지 않는다.

## API 모킹

- 각 앱 `.env.example`의 기본값은 `NEXT_PUBLIC_API_MOCKING=enabled`다. 백엔드 없이 개발할 수 있다. 미설정 또는 `disabled`일 때 모킹을 끈다.
- 이 플래그는 빌드 시 고정된다. 운영에서는 변수를 빼거나 `disabled`로 설정한 뒤 다시 빌드한다. 실행 시점 변경만으로 기존 브라우저 번들이 바뀌지 않는다.
- env 접근의 예외: MockProvider, `instrumentation.ts`, `next.config.ts`의 모킹 배선과 HomePage의 모킹 표시 분기는 `process.env.NEXT_PUBLIC_API_MOCKING`을 직접 읽는 빌드 시 분기를 허용한다. 현재 next.config.ts는 검증한 env 값을 `env` 옵션에 고정한다. MockProvider와 instrumentation.ts, HomePage의 literal 비교를 env 객체나 조건 변수로 우회하지 않는다. Next가 분기를 제거해야 운영 브라우저 번들에 MSW가 남지 않는다. `NEXT_RUNTIME`은 instrumentation의 Node 런타임 가드용이다.
- handler는 `packages/mocks/src/handlers.ts`에 둔다. 모킹할 endpoint마다 handler를 추가한다. 기본 예시는 `GET /health` 하나다. 패키지는 env를 읽지 않고 base URL을 인자로 받는다(브라우저는 `/backend`, 서버는 `API_BASE_URL`).
- MockProvider는 worker 시작을 기다린 뒤 children을 렌더한다. 브라우저 동적 import에는 `typeof window !== 'undefined'` 가드를 유지한다. instrumentation은 Node 런타임에서만 서버 모킹을 시작한다.
- 모킹된 요청을 보내는 서버 컴포넌트는 빌드 중 실제 백엔드를 호출하지 않도록 먼저 `await connection()`을 호출한다. 홈의 두 mocked 표시는 배선 확인용이며 실제 화면으로 교체할 때 `mocking-on.spec.ts`도 함께 수정한다.
- MSW를 올리면 `pnpm --filter @repo/mocks exec msw init`으로 두 앱의 worker 파일을 재생성한다.
- E2E의 `mocking` 프로젝트는 `enabled`인 `pnpm dev`(client 3100, admin 3101), `chromium` 프로젝트는 `disabled`로 빌드한 운영 서버(3000, 3001)를 쓴다. 모킹 켠 브라우저·서버 응답, 모킹 끈 worker 미등록·번들 MSW 부재를 확인한다.

## 데이터와 폼

상세 패턴은 [`data-and-forms`](.agents/skills/data-and-forms/SKILL.md) 스킬에 있다.

- TanStack Query: 조회는 entity `api/`의 `<리소스>Queries` 팩토리(`queryOptions`, key는 `all()` 루트의 계층 배열)를 컴포넌트에서 `useQuery` 등에 바로 넘긴다. 로직이 없는 조회 훅으로 감싸지 않는다. mutation은 훅으로 두고 동작으로 이름 짓는다(`useUpdateProfile`, HTTP 메서드 이름 아님). QueryClient는 `@/shared/api`의 `getQueryClient`로 얻는다. 서버 prefetch는 `src/_pages`의 페이지 컴포넌트에서 하고 루트 `app/` 라우트는 얇게 둔다.
- 폼: zod 스키마(`...Schema`)와 react-hook-form(`zodResolver`)을 쓰고, 요청 타입은 `z.infer`로 만든 `...Request`이다. 제출은 mutation으로 한다.

## 테스트

- 단위 테스트는 대상 파일 옆에 `*.test.ts(x)`로 둔다(Vitest, jsdom, Testing Library).
- E2E 테스트는 `e2e/*.spec.ts`에 둔다(Playwright). 모킹을 끈 검사는 앱을 빌드해 띄운 뒤 돌고 모킹을 켠 검사만 개발 서버에서 돈다. 외부 API 없이 통과해야 한다.
- 동작을 바꾸면 그 동작을 확인하는 테스트를 함께 고치거나 추가한다.

## 검증

변경 후 프로젝트 루트에서 범위에 맞는 검사를 실행한다. 루트 스크립트가 두 앱과 패키지의 게이트를 실행하며 lint:fsd는 두 앱과 core를 검사한다. CI(`.github/workflows/ci.yml`)도 같은 순서로 전부 실행한다.

```bash
pnpm lint
pnpm lint:fsd
pnpm format:check
pnpm check-types   # API_BASE_URL 필요
pnpm test
pnpm test:e2e      # 처음에는 pnpm exec playwright install --with-deps chromium
pnpm build         # API_BASE_URL 필요
```

- `API_BASE_URL`은 `.env.local`이 있으면 거기서 읽힌다. 없으면 `API_BASE_URL=http://localhost:8080 NEXT_PUBLIC_API_MOCKING=disabled pnpm build`처럼 명령 앞에 붙인다.
- FSD 경계, 공개 API, 서버·클라이언트 경계를 바꿨다면 최소한 `lint:fsd`, `check-types`, `build`를 확인한다.
- 실행하지 못했거나 실패한 검사는 그대로 보고한다.

## 에이전트 작업 규칙

- 커밋, 푸시, PR 생성, 리뷰 답글은 사용자가 요청한 경우에만 한다. 기존 브랜치와 작업 트리의 변경을 보존한다.
- `.env.local`을 비롯한 환경·자격 증명 파일은 열거나 출력하지 않는다. 필요한 값은 `.env.example`과 `src/shared/config/env.ts`에서 확인한다.
- 이 파일의 규칙 중 도구가 검사하는 것(ESLint, Prettier, steiger, tsc)은 도구 결과를 근거로 판단한다.
- 작업 절차는 `.agents/skills/`에 있다. `.claude/skills`와 `.hermes/skills`는 같은 폴더를 가리키는 링크다.

| 스킬                         | 쓰는 때                                     |
| ---------------------------- | ------------------------------------------- |
| `git-commit`                 | 변경을 논리 단위로 나눠 커밋할 때           |
| `write-pr`                   | 커밋을 바탕으로 PR을 만들 때                |
| `resolve-reviews`            | PR 리뷰 코멘트를 판단하고 반영할 때         |
| `nextjs-fsd-architecture`    | 레이어·slice를 정하거나 구조를 바꿀 때      |
| `data-and-forms`             | 서버 데이터 조회·변경, 폼을 만들 때         |
| `frontend-convention-review` | 변경을 도구가 못 잡는 컨벤션 기준으로 볼 때 |
