# Project Template (fullstack)

Next.js App Router 웹(`apps/web`)과 NestJS ESM API(`apps/api`), 공용 패키지(`packages/*`)를 묶은 Turborepo다. Feature-Sliced Design(FSD) 공식 Next.js 구조를 따른다. 모든 응답과 문서는 한국어로 작성하고, 식별자·파일 이름·커밋 타입은 영어로 둔다.

## 스택

pnpm 12 / Next.js 16 (App Router, React Compiler) / React 19 / TypeScript 6 / Tailwind CSS 4 + cva / TanStack Query 5 / axios / zod 4 / react-hook-form / Vitest / Playwright / ESLint 10 + Prettier / steiger.

- 의존성은 범위 없이 정확한 버전으로 고정한다. `pnpm-workspace.yaml`의 `minimumReleaseAge`(7일)를 지키며, 출시 7일이 지나지 않은 버전은 올리지 않는다.
- 공통 의존성 버전은 `pnpm-workspace.yaml`의 catalog 한 곳에서 바꾼다.
- 업데이트 PR은 Dependabot(`.github/dependabot.yml`)이 매주 연다. minor·patch는 생태계(npm, GitHub Actions)별 한 PR로 묶이고 major는 개별 PR이다. 자동 병합은 설정하지 않았다. 병합 전에 CI 통과를 확인한다.
- Prisma CLI·client·PostgreSQL adapter는 모두 **7.10.1**로 고정한다.
- 사용자 요청 없이 새 라이브러리를 추가하지 않는다.
- Next.js 16 API가 기억과 다르면 `node_modules/next/dist/docs/`의 번들 문서를 확인한다.

## 구조

웹 절의 `src/`, `app/`, 웹 설정 파일 경로는 모두 `apps/web/` 기준이다. `@/*`는 `apps/web/src/*`다. 프로젝트 루트에는 `apps/{web,api}`, `packages/{api-types,eslint-config,typescript-config}`, 풀스택 `e2e/`, `docker-compose.yml`, `turbo.json`이 있다. `pnpm dev`는 두 앱을 함께 띄우며 공통 게이트는 프로젝트 루트에서 실행한다.

```text
app/                  Next 라우트. layout, page, error, not-found, global-error만 두고 구현은 src에서 가져온다
src/
├── _app/             FSD app 레이어
│   ├── providers/    TanStackProvider
│   ├── global-error/ 루트 layout 오류 화면 (html·body 포함)
│   └── styles/       globals.css (Tailwind 진입점, @theme 토큰)
├── _pages/           FSD pages 레이어 (home/ui/HomePage.tsx, error, not-found)
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
- `@repo/api-types`는 API의 Swagger 메타데이터에서 생성한 타입 전용 패키지다. 컨트롤러·DTO·Swagger 데코레이터를 바꾸면 `pnpm openapi`로 다시 생성해 함께 커밋하고, 생성물(`openapi.json`, `openapi.d.ts`)은 손으로 고치지 않는다. CI의 `pnpm openapi:check`가 불일치를 막는다. 웹은 `import type { paths } from '@repo/api-types'`로 직접 가져온다.

## FSD 규칙

상세 가이드(레이어 판단, slice 설계, `@x`, 예시)는 [`nextjs-fsd-architecture`](.agents/skills/nextjs-fsd-architecture/SKILL.md) 스킬에 있다. 여기에는 늘 적용되는 핵심만 둔다.

- import 방향은 `_app → _pages → widgets → features → entities → shared`뿐이다. 같은 레이어의 다른 slice와 slice 내부 경로 import도 금지다. `pnpm lint:fsd`(steiger)가 검사한다.
- slice 밖에서는 공개 `index.ts`로만 import한다. 서버 전용 코드는 `index.server.ts`로 따로 공개하고 클라이언트 배럴에 섞지 않는다.
- 루트 `app/`의 라우트 파일은 얇게 둔다. 페이지 구현은 `src/_pages/<slice>`에 두고 라우트는 재수출이나 조합만 한다. **steiger는 루트 `app/`을 검사하지 않으므로** 라우트 파일에 비즈니스 로직을 넣지 않는 것은 직접 지킨다.

```ts
// app/page.tsx
export { HomePage as default } from '@/_pages/home';
```

- 오류 화면도 같은 방식이다. `app/error.tsx`·`not-found.tsx`·`global-error.tsx`는 재수출만 하고 구현은 `src/_pages/error`, `src/_pages/not-found`, `src/_app/global-error`에 둔다. 화면에는 `error.message`를 노출하지 않고 `digest`만 오류 코드로 보여 준다.
- 세그먼트는 필요할 때만 만든다: `ui/` 컴포넌트 · `model/` 타입·훅·스키마·상수 · `api/` 요청 함수·query 팩토리·mutation 훅 · `lib/` slice 전용 유틸 · `config/` 설정.
- feature 전용 코드를 `shared/`에 넣지 않는다.

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

- Tailwind CSS v4다. 진입점과 디자인 토큰은 `src/_app/styles/globals.css`가 소유한다. 토큰은 `@theme`에 추가하고(`--color-background` → `bg-background`), 다른 전역 스타일 진입점을 만들지 않는다.
- 정적 클래스는 문자열 하나로 쓴다. `cn()`(`@/shared/lib`)은 조건부 클래스나 외부 `className` 병합이 있을 때만 쓴다.
- 여러 곳에서 반복되는 클래스 조합은 컴포넌트로 뽑는다. 클래스 문자열을 상수로 빼지 않는다.
- 크기·색 같은 variant가 있는 컴포넌트는 `cva`(class-variance-authority)로 정의하고 `VariantProps`로 props 타입을 만든다. 외부 `className`은 `cn(variants({ ... }), className)`으로 병합한다.
- 클래스 순서는 Prettier(`prettier-plugin-tailwindcss`)가 정렬한다. `cn(...)`과 `cva(...)` 안의 문자열도 `tailwindFunctions` 설정으로 정렬된다.

```tsx
// ❌ 조건이 없는데 cn()
className={cn('flex items-center gap-2')}

// ✅ 정적 클래스
className="flex items-center gap-2"

// ✅ 조건부 클래스, 외부 className 병합
className={cn('flex gap-2', isActive && 'bg-foreground text-background')}
className={cn('rounded-lg px-4', className)}
```

```tsx
// variant가 있는 컴포넌트
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/shared/lib';

const buttonVariants = cva('inline-flex items-center rounded-md font-medium', {
  variants: {
    variant: { primary: 'bg-foreground text-background', outline: 'border border-foreground' },
    size: { sm: 'h-8 px-3 text-sm', md: 'h-10 px-4' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

interface ButtonProps extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {}

export const Button = ({ variant, size, className, ...props }: ButtonProps) => (
  <button className={cn(buttonVariants({ variant, size }), className)} {...props} />
);
```

## API

상세 규칙은 [`api-client`](.agents/skills/api-client/SKILL.md) 스킬에 있다. 요청 코드를 쓰거나 에러 처리·인증을 붙이기 전에 읽는다.

- 브라우저 요청은 `@/shared/api`, 서버(RSC, Server Function) 요청은 `@/shared/api/index.server`의 `get / post / patch / put / del`로 보낸다.
- 요청 실패는 모두 `ApiError`로 던져진다. 401 응답에 연결할 동작은 `setOnUnauthorized`로 등록한다.

## 환경 변수

- 서버 환경 변수는 `src/shared/config/env.ts`의 zod 스키마 한 곳에서 검증하고 `env`로 꺼내 쓴다. `process.env`를 다른 곳에서 직접 읽지 않는다.
- 새 변수를 추가하면 스키마, `.env.example`, CI의 `env`를 함께 고친다.
- 웹 변수는 `API_BASE_URL`(필수, http(s) URL, 로컬 API는 `http://localhost:4000`)이다. 값이 없으면 `dev`, `build`, `check-types`가 바로 실패한다.
- `env`는 서버에서만 읽는다. 클라이언트 컴포넌트에서 import하지 않는다.

## 보안 헤더와 배포

- `apps/web/next.config.ts`의 `headers()`가 모든 경로에 기본 보안 헤더(HSTS, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`)를 붙이고 `X-Powered-By`를 끈다. CSP는 넣지 않았다. 헤더를 바꾸거나 CSP를 더하면 `apps/web/e2e/security-headers.spec.ts`도 함께 고친다.
- `apps/web/Dockerfile`과 `apps/api/Dockerfile`은 프로젝트 루트를 build context로 쓰는 다단계 빌드다. 웹의 `API_BASE_URL`은 rewrite에 들어가 빌드 시 고정되므로 `--build-arg`로 넘기고, 주소가 바뀌면 이미지를 다시 만든다. DB 마이그레이션은 서버 시작과 분리한다. 배포할 때 API 이미지로 `pnpm exec prisma migrate deploy`를 따로 실행한다. 빌드·실행 명령은 README에 있다.

## 데이터와 폼

상세 패턴은 [`data-and-forms`](.agents/skills/data-and-forms/SKILL.md) 스킬에 있다.

- TanStack Query: 조회는 entity `api/`의 `<리소스>Queries` 팩토리(`queryOptions`, key는 `all()` 루트의 계층 배열)를 컴포넌트에서 `useQuery` 등에 바로 넘긴다. 로직이 없는 조회 훅으로 감싸지 않는다. mutation은 훅으로 두고 동작으로 이름 짓는다(`useUpdateProfile`, HTTP 메서드 이름 아님). QueryClient는 `@/shared/api`의 `getQueryClient`로 얻는다. 서버 prefetch는 `src/_pages`의 페이지 컴포넌트에서 하고 루트 `app/` 라우트는 얇게 둔다.
- 폼: zod 스키마(`...Schema`)와 react-hook-form(`zodResolver`)을 쓰고, 요청 타입은 `z.infer`로 만든 `...Request`이다. 제출은 mutation으로 한다.

## 테스트

- 웹 단위 테스트는 대상 파일 옆에 `*.test.ts(x)`로 둔다(Vitest, jsdom, Testing Library).
- 웹 홈 E2E는 `apps/web/e2e/*.spec.ts`, API e2e는 `apps/api/test/`, 풀스택 스모크는 루트 `e2e/`에 둔다. 루트 `test:e2e`는 앱별 E2E 뒤에 풀스택을 실행해 웹 포트 경합을 막는다. 풀스택에는 Compose DB가 필요하며 외부 API에는 의존하지 않는다.
- 동작을 바꾸면 그 동작을 확인하는 테스트를 함께 고치거나 추가한다.

## 검증

변경 후 이 폴더 루트에서 범위에 맞는 검사를 실행한다. CI(`.github/workflows/ci.yml`)도 같은 순서로 전부 실행한다.

```bash
pnpm openapi:check # 생성된 API 타입이 코드와 같은지 검사
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

상세 기준과 예시(모듈 구조, 이름, REST, DTO 검증, 예외 필터, JWT 인증, env 검증, 로깅, Prisma, health·Swagger·CORS)는 [`nestjs-api`](.agents/skills/nestjs-api/SKILL.md) 스킬에 있다. API 코드를 바꾸기 전에 읽는다. 여기에는 늘 적용되는 핵심만 둔다.

- NestJS ESM이다. 로컬 import에는 `.js` 확장자를 쓴다. FSD와 steiger는 웹 전용이다.
- 설정은 `ConfigService`로만 읽는다. `NODE_ENV`도 `process.env`가 아니라 `ConfigService`로 읽는다. `NODE_ENV`는 `.env.example`과 CI에 값을 두지 않는다. 이 값들은 셸 환경으로 주입되어 `next build`까지 바꾸기 때문이다.
- 로깅은 주입한 nestjs-pino `Logger`/`PinoLogger`만 사용한다(`console` 금지).
- 인증 가드와 `@Public()` 범위, ValidationPipe 옵션, helmet, 운영 Swagger 차단, 로그 redact, CORS 설정 같은 전역 보안 기본값은 사용자 요청 없이 약하게 바꾸지 않는다.

## 에이전트 작업 규칙

- 커밋, 푸시, PR 생성, 리뷰 답글은 사용자가 요청한 경우에만 한다. 기존 브랜치와 작업 트리의 변경을 보존한다.
- `.env.local`을 비롯한 환경·자격 증명 파일은 열거나 출력하지 않는다. 필요한 값은 `.env.example`과 `src/shared/config/env.ts`에서 확인한다.
- 이 파일의 규칙 중 도구가 검사하는 것(ESLint, Prettier, steiger, tsc)은 도구 결과를 근거로 판단한다.
- 작업 절차는 `.agents/skills/`에 있다. `.claude/skills`와 `.hermes/skills`는 같은 폴더를 가리키는 링크다.

| 스킬                         | 쓰는 때                                                             |
| ---------------------------- | ------------------------------------------------------------------- |
| `git-commit`                 | 변경을 논리 단위로 나눠 커밋할 때                                   |
| `write-pr`                   | 커밋을 바탕으로 PR을 만들 때                                        |
| `resolve-reviews`            | PR 리뷰 코멘트를 판단하고 반영할 때                                 |
| `nextjs-fsd-architecture`    | 레이어·slice를 정하거나 구조를 바꿀 때                              |
| `api-client`                 | API 요청 코드·에러 처리를 쓰거나 401 처리에 인증을 붙일 때          |
| `data-and-forms`             | 서버 데이터 조회·변경, 폼을 만들 때                                 |
| `frontend-convention-review` | 변경을 도구가 못 잡는 컨벤션 기준으로 볼 때                         |
| `nestjs-api`                 | API 모듈·엔드포인트·DTO·Prisma 모델을 만들거나 API 인프라를 바꿀 때 |
| `backend-convention-review`  | API 변경을 도구가 못 잡는 컨벤션 기준으로 볼 때                     |
