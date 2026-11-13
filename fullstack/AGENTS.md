# Project Template (fullstack)

Next.js App Router 웹(`apps/web`)과 NestJS ESM API(`apps/api`), 공용 패키지(`packages/*`)를 묶은 Turborepo다. Feature-Sliced Design(FSD) 공식 Next.js 구조를 따른다. 모든 응답과 문서는 한국어로 작성하고, 식별자·파일 이름·커밋 타입은 영어로 둔다.

## 스택

pnpm 12 / Next.js 16 (App Router, React Compiler) / React 19 / TypeScript 6 / Tailwind CSS 4 / TanStack Query 5 / axios / zod 4 / react-hook-form / Vitest / Playwright / ESLint 10 + Prettier / steiger.

- 의존성은 범위 없이 정확한 버전으로 고정한다. `pnpm-workspace.yaml`의 `minimumReleaseAge`(7일)를 지키며, 출시 7일이 지나지 않은 버전은 올리지 않는다.
- 공통 의존성 버전은 `pnpm-workspace.yaml`의 catalog 한 곳에서 바꾼다.
- 사용자 요청 없이 새 라이브러리를 추가하지 않는다.
- Next.js 16 API가 기억과 다르면 `node_modules/next/dist/docs/`의 번들 문서를 확인한다.

## 구조

웹 절의 `src/`, `app/`, 웹 설정 파일 경로는 모두 `apps/web/` 기준이다. `@/*`는 `apps/web/src/*`다. 프로젝트 루트에는 `apps/{web,api}`, `packages/{eslint-config,typescript-config}`, 풀스택 `e2e/`, `docker-compose.yml`, `turbo.json`이 있다. `pnpm dev`는 두 앱을 함께 띄우며 공통 게이트는 프로젝트 루트에서 실행한다.

```text
app/                  Next 라우트. layout.tsx, page.tsx만 두고 구현은 src에서 가져온다
src/
├── _app/             FSD app 레이어
│   ├── providers/    TanStackProvider
│   └── styles/       globals.css (Tailwind 진입점, @theme 토큰)
├── _pages/           FSD pages 레이어 (home/ui/HomePage.tsx)
├── widgets/          비어 있음 (.gitkeep)
├── features/         비어 있음 (.gitkeep)
├── entities/         비어 있음 (.gitkeep)
└── shared/
    ├── api/          axios 인스턴스, 메서드, ApiError, 인터셉터, getQueryClient
    ├── config/       환경 변수 검증 (env)
    └── lib/          cn 유틸
e2e/                  Playwright 테스트
```

- `_app`·`_pages`의 밑줄은 Next가 `src/app`, `src/pages`를 라우터 폴더로 읽지 않게 하려고 붙였다. steiger는 이 둘을 `app`·`pages` 레이어로 인식한다.
- `widgets`, `features`, `entities`는 실제 도메인 코드가 생길 때만 slice를 추가한다. 빈 slice나 세그먼트를 미리 만들지 않는다.
- `@/*`는 `src/*`를 가리킨다. 루트 `app/`도 `@/`로 `src`를 import한다.
- 기존 라우트와 공개 API를 사용자 요청 없이 삭제하거나 이름을 바꾸지 않는다.

## 패키지 경계

- `apps/web`과 `apps/api`는 서로 import하지 않는다. 같은 타입·상수가 필요하면 `packages/`에 새 패키지를 만들어 공유한다.
- 패키지는 `package.json`의 `exports`에 적힌 진입점으로만 import한다. 내부 파일 경로를 직접 참조하지 않는다.
- 앱에서 소스 그대로 쓰는 패키지를 새로 만들면 웹의 `transpilePackages`에 넣는다. 빌드 산출물을 배포하는 패키지는 넣지 않는다.

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

## 네이밍

| 구분              | 규칙                   | 예                                 |
| ----------------- | ---------------------- | ---------------------------------- |
| slice 폴더        | kebab-case             | `user-profile/`                    |
| 컴포넌트 파일     | PascalCase             | `ui/HomePage.tsx`                  |
| 유틸·훅·기타 파일 | camelCase              | `getQueryClient.ts`, `cn.ts`       |
| props 타입        | PascalCase + `Props`   | `HomePageProps`                    |
| 그 밖의 타입      | PascalCase + `Type`    | `ApiErrorType`, `UserResponseType` |
| 요청 타입         | PascalCase + `ReqType` | `UpdateProfileReqType`             |
| zod 스키마        | PascalCase + `Schema`  | `EnvSchema`, `UpdateProfileSchema` |

예시 이름 중 이 표에서 처음 나온 것(`user-profile` 등)은 구현된 모듈이 아니다.

## 타입

- 객체 형태는 `interface`, 유니온과 조합은 `type`을 쓴다.
- `enum`은 쓰지 않는다. 리터럴 유니온과 `as const` 객체 또는 `Record`를 쓴다. ESLint가 막는다.
- 타입만 가져올 때는 `import type`을 쓴다. ESLint가 고친다.

## 컴포넌트

- 화살표 함수와 props 구조 분해를 쓴다. slice의 컴포넌트는 default export하고 소유 slice의 `index.ts`에서 이름을 붙여 공개한다(`export { default as HomePage } from './ui/HomePage';`).
- 컴포넌트 안의 순서는 변수·훅 → 핸들러·기타 로직 → `useEffect`(필요할 때만) → return이다. 관례를 맞추려고 필요 없는 상태나 effect를 만들지 않는다.
- 기본은 Server Component다. 상태·이벤트·브라우저 API가 필요한 가장 작은 컴포넌트에만 `'use client'`를 붙인다.
- import 정렬(`react` → `next` → 외부 패키지 → `@/` → 상대 경로)은 ESLint `simple-import-sort`가 고친다.

## 스타일링

- Tailwind CSS v4다. 진입점과 디자인 토큰은 `src/_app/styles/globals.css`가 소유한다. 토큰은 `@theme`에 추가하고(`--color-background` → `bg-background`), 다른 전역 스타일 진입점을 만들지 않는다.
- 정적 클래스는 문자열 하나로 쓴다. `cn()`(`@/shared/lib`)은 조건부 클래스나 외부 `className` 병합이 있을 때만 쓴다.
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
- 응답 타입은 첫 번째 제네릭, body 타입은 두 번째 제네릭이다. 응답 타입을 적으면서 body도 검사하려면 둘 다 적는다: `post<UserResponseType, UpdateProfileReqType>(url, body)`.
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

- 서버 환경 변수는 `src/shared/config/env.ts`의 zod 스키마 한 곳에서 검증하고 `env`로 꺼내 쓴다. `process.env`를 다른 곳에서 직접 읽지 않는다.
- 새 변수를 추가하면 스키마, `.env.example`, CI의 `env`를 함께 고친다.
- 웹 변수는 `API_BASE_URL`(필수, http(s) URL, 로컬 API는 `http://localhost:4000`)이다. 값이 없으면 `dev`, `build`, `check-types`가 바로 실패한다.
- `env`는 서버에서만 읽는다. 클라이언트 컴포넌트에서 import하지 않는다.

## 데이터와 폼

상세 패턴은 [`data-and-forms`](.agents/skills/data-and-forms/SKILL.md) 스킬에 있다.

- TanStack Query: 훅은 `useGet<리소스>` / `usePost<리소스>` / `usePatch<리소스>` / `usePut<리소스>` / `useDelete<리소스>`, key는 `all()` 루트를 둔 계층 factory로 만든다. QueryClient는 `@/shared/api`의 `getQueryClient`로 얻는다. 서버 prefetch는 `src/_pages`의 페이지 컴포넌트에서 하고 루트 `app/` 라우트는 얇게 둔다.
- 폼: zod 스키마(`...Schema`)와 react-hook-form(`zodResolver`)을 쓰고, 요청 타입은 `z.infer`로 만든 `...ReqType`이다. 제출은 mutation으로 한다.

## 테스트

- 웹 단위 테스트는 대상 파일 옆에 `*.test.ts(x)`로 둔다(Vitest, jsdom, Testing Library).
- 웹 홈 E2E는 `apps/web/e2e/*.spec.ts`, API e2e는 `apps/api/test/`, 풀스택 스모크는 루트 `e2e/`에 둔다. 루트 `test:e2e`는 앱별 E2E 뒤에 풀스택을 실행해 웹 포트 경합을 막는다. 풀스택에는 Compose DB가 필요하며 외부 API에는 의존하지 않는다.
- 동작을 바꾸면 그 동작을 확인하는 테스트를 함께 고치거나 추가한다.

## 검증

변경 후 이 폴더 루트에서 범위에 맞는 검사를 실행한다. CI(`.github/workflows/ci.yml`)도 같은 순서로 전부 실행한다.

```bash
pnpm lint
pnpm lint:fsd
pnpm format:check
pnpm check-types   # API_BASE_URL 필요
pnpm test
pnpm test:e2e      # 처음에는 pnpm exec playwright install chromium
pnpm build         # API_BASE_URL 필요
```

- `API_BASE_URL`은 웹의 `.env.local`에서, API 환경은 API의 `.env`에서 읽힌다. 환경 파일이 없으면 명령 앞에 예제 값과 별도 테스트용 JWT 비밀을 주입한다. DB가 필요한 검사는 먼저 `docker compose up -d --wait`로 띄우고 종료 후 정리한다.
- FSD 경계, 공개 API, 서버·클라이언트 경계를 바꿨다면 최소한 `lint:fsd`, `check-types`, `build`를 확인한다.
- 실행하지 못했거나 실패한 검사는 그대로 보고한다.

## 백엔드 (`apps/api`)

- 모듈 구조, 이름, REST 경로·상태 코드, DTO 검증, 예외, Prisma 모델 규칙과 예시는 [`nestjs-api`](.agents/skills/nestjs-api/SKILL.md) 스킬에 있다.
- NestJS ESM이다. 도메인별 `<name>.module.ts`에 controller·service·DTO를 모으고 `AppModule`에 연결한다. FSD와 steiger는 웹 전용이다. 로컬 import에는 `.js` 확장자를 쓴다. API 단위 테스트는 `*.spec.ts`, 통합 테스트는 `test/*e2e-spec.ts`다.
- `src/config/env.ts`의 `validateEnv`가 DATABASE_URL, PORT, JWT_SECRET(32자 이상, 예제 자리표시자 거부), CORS_ORIGINS를 부팅 전에 검증한다. 새 설정은 검증 함수·`.env.example`·CI env를 함께 수정하고 `ConfigService.getOrThrow`로 읽는다. DTO에는 class-validator를 쓰며 전역 ValidationPipe의 whitelist·forbidNonWhitelisted·transform을 유지하고 암묵 변환은 켜지 않는다.
- Prisma CLI·client·PostgreSQL adapter는 모두 **7.10.1**로 고정한다. `prisma/schema.prisma`에는 generator와 datasource만 있고 모델은 0개다. 도메인이 생기면 모델을 추가하고 `pnpm --filter @repo/api exec prisma migrate dev --name <name>`으로 migration을 만든 뒤 `pnpm --filter @repo/api exec prisma generate`로 생성한다. 생성된 `src/generated/prisma`는 직접 수정하거나 커밋하지 않는다. `PrismaService`와 driver adapter를 통해 DB에 접근한다.
- Docker와 Docker Compose가 필요하다. `docker compose up -d --wait`로 PostgreSQL을 띄운다. `/health`는 쿠키 없이 DB의 실제 `SELECT 1`까지 검사하고 정상 200/database up, 장애 503/database down을 반환한다. `/docs`(UI)와 `/docs-json`(명세)은 Swagger이며 `NODE_ENV`가 `production`이 아닐 때만 등록한다. Swagger 라우트는 전역 가드를 거치지 않으므로 운영에서 다시 켜려면 별도 인증을 함께 붙인다. helmet CSP를 임의로 끄지 않는다.
- 로깅은 주입한 nestjs-pino `Logger`/`PinoLogger`만 사용한다(`console` 금지). 개발은 pino-pretty, 그 외는 JSON이다. 서버가 요청마다 UUID를 만들고 `X-Request-Id`로 돌려준다. `req.headers.cookie`·`authorization` redact, `/health` 자동 요청 로그 제외를 유지한다. 클라이언트가 보낸 ID나 JWT를 로그에 그대로 남기지 않는다.
- 전역 `HttpExceptionFilter`는 `status`, `code`, `message`로 웹 `ApiError`와 맞는 응답을 만든다. 요청 ID는 응답 헤더에서 읽고, health 장애 응답의 details는 보존한다. 4xx는 warn, 5xx는 원본 stack과 함께 error로 남기되 운영 응답에는 내부 메시지나 stack을 넣지 않는다.
- Sentry 같은 에러 수집 도구를 붙일 때는 전역 예외 필터의 5xx 경로에 연결하고 `X-Request-Id`를 태그로 남긴다.
- JWT 검증은 전역 `JwtAuthGuard`가 httpOnly 쿠키에서 HS256 토큰을 읽는다. 쿠키 이름은 `src/config/env.ts`의 `AUTH_COOKIE_NAME` 상수 하나로 관리한다. 토큰을 발급하는 프로젝트 코드도 같은 상수를 사용하고 SameSite·Secure·만료 정책을 정한다. 토큰 발급·로그인은 템플릿 범위가 아니다. 공개 엔드포인트만 `@Public()`으로 제외하고 `@CurrentUser()`로 검증된 payload를 받는다.
- 웹 `/backend/*` rewrite는 같은 출처 프록시다. `CORS_ORIGINS`는 API를 직접 교차 출처로 호출할 때만 의미가 있다. credentials와 `exposedHeaders: ['X-Request-Id']`를 유지한다.

## 에이전트 작업 규칙

- 커밋, 푸시, PR 생성, 리뷰 답글은 사용자가 요청한 경우에만 한다. 기존 브랜치와 작업 트리의 변경을 보존한다.
- `.env.local`을 비롯한 환경·자격 증명 파일은 열거나 출력하지 않는다. 필요한 값은 `.env.example`과 `src/shared/config/env.ts`에서 확인한다.
- 이 파일의 규칙 중 도구가 검사하는 것(ESLint, Prettier, steiger, tsc)은 도구 결과를 근거로 판단한다.
- 작업 절차는 `.agents/skills/`에 있다. `.claude/skills`와 `.hermes/skills`는 같은 폴더를 가리키는 링크다.

| 스킬                         | 쓰는 때                                         |
| ---------------------------- | ----------------------------------------------- |
| `git-commit`                 | 변경을 논리 단위로 나눠 커밋할 때               |
| `write-pr`                   | 커밋을 바탕으로 PR을 만들 때                    |
| `resolve-reviews`            | PR 리뷰 코멘트를 판단하고 반영할 때             |
| `nextjs-fsd-architecture`    | 레이어·slice를 정하거나 구조를 바꿀 때          |
| `data-and-forms`             | 서버 데이터 조회·변경, 폼을 만들 때             |
| `frontend-convention-review` | 변경을 도구가 못 잡는 컨벤션 기준으로 볼 때     |
| `nestjs-api`                 | API 모듈·엔드포인트·DTO·Prisma 모델을 만들 때   |
| `backend-convention-review`  | API 변경을 도구가 못 잡는 컨벤션 기준으로 볼 때 |
