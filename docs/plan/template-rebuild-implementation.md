# project-template 재구축 구현 계획

> 상태: **승인됨 (2026-11-12, 사용자가 "더 수정 필요한 곳은 없어보여. 이제 작업 시작할까?"로 승인).** 5차 초안이다. 4차 이후에 범위 원칙(Q36, "결국 쓰게 될 라이브러리는 설정까지 끝내서 제공한다")과 그 뒤의 결정(Q37–Q43)을 반영했다. 요구사항은 [template-rebuild.md](./template-rebuild.md)를 따른다.
> 이 계획은 승인 전까지 어떤 실행도 시작하지 않는다.

## 1. 목표와 그 너머

- **요청**: 두 템플릿을 처음부터 다시 만든다.
  - `single/`: Next.js 단일 웹 앱
  - `monorepo/`: Next.js 웹 앱(`apps/web`)과 NestJS API(`apps/api`)를 함께 담은 저장소

  사용자는 레포를 받은 뒤 루트의 `setup.sh`로 둘 중 하나를 고른다. 루트 CI는 사용자가 밟는 이 경로를 그대로 따라가며 결과물을 검증한다.
- **요청 너머의 목표**: "Use this template → clone → `./setup.sh`" 세 단계를 거치면 설정을 고치지 않고 바로 기능 개발에 들어갈 수 있어야 한다. 모노레포는 web → api → DB 경로가 처음부터 연결된 상태여야 한다. 시간이 지나도 두 템플릿이 조용히 망가지거나 서로 어긋나지 않아야 한다. 이를 위해 요청에는 없던 검사 네 가지를 넣는다.
  - `setup.sh` 결과물의 파일 목록이 정확한지 확인한다 (T3)
  - steiger가 경계 위반을 실제로 잡는지 음성 대조로 확인한다 (T3)
  - web의 `/backend/health`가 api를 거쳐 DB까지 닿는지 풀스택 스모크로 확인한다 (T10)
  - 두 템플릿 사이의 드리프트를 검사한다 (T11)
- **동사로 다시 쓴 산출물**:
  - 템플릿을 고르면 그대로 동작하는 골격을 **만든다**.
  - 사용자가 실제로 밟는 경로를 기준으로 품질 게이트를 **강제한다**.
  - 레포 전용 파일이 새어 나가는지, 두 템플릿이 어긋나는지 **감시한다**.

## 2. 비목표

- 도메인 기능은 만들지 않는다. 화면, 도메인 API, Prisma 모델, 토큰 발급, 로그인 흐름이 여기에 해당한다.
- 범위 원칙(Q36): 결국 쓰게 될 라이브러리는 설치와 설정을 끝낸 상태로 제공한다. 해당 라이브러리는 다음과 같다.
  - web: axios 인스턴스와 인터셉터, TanStack Query, zod, react-hook-form
  - api: Prisma, ValidationPipe, helmet, CORS, JWT 검증 가드, 로깅, 예외 필터, Swagger
- 넣지 않는 라이브러리: shadcn/ui, zustand, sonner, throttler, Sentry(Q43, 예외 필터와 `X-Request-Id`를 연결 지점으로 둔다), 클라이언트 요청 ID 생성, 개발 환경 요청 로깅
- `setup.sh`는 템플릿을 고르고 정리하는 일만 한다. 다음 일은 하지 않는다.
  - 프로젝트명 치환
  - 의존성 설치
  - `git init`이나 `.git` 조작
  - 원격 다운로드
- 다음은 쓰지 않는다.
  - 외부 harness sync
  - tiged·degit
  - 커스텀 FSD 검사 스크립트
  - 도구별 에이전트 정의 파일
- web과 api가 공유하는 타입 패키지는 계약이 생길 때 추가한다(Q35).
- axios를 fetch로 교체하지 않는다(Q5).
- 도구별 PostToolUse hook과 pre-push hook은 두지 않는다(Q17).
- 의존성 자동 갱신은 하지 않는다.
- 비어 있는 FSD 레이어 폴더는 미리 만들고 `.gitkeep`을 넣어 둔다(Q41).

## 3. 결정한 구조

### 템플릿 레포

```text
project-template/                 # 템플릿 레포 (setup.sh 실행 전)
├── setup.sh                      # 템플릿 선택 → 루트로 이동 → 나머지 정리 → 자기 삭제
├── single/                       # 템플릿 1
├── monorepo/                     # 템플릿 2
├── scripts/                      # 레포 전용: setup 테스트, 결과물 검증, 드리프트 검사
├── .github/workflows/            # 레포 전용: 검증 CI
├── docs/plan/                    # 레포 전용
└── README.md                     # 레포 전용: 사용법
```

- **레포 전용 파일 목록**: `setup.sh`는 스크립트 안에 명시한 목록에 있는 것만 지운다. 목록은 `scripts/`, `.github/`, `docs/`, `README.md`, `setup.sh` 자신, 고르지 않은 템플릿 폴더다.
- **루트에는 `package.json`과 `pnpm-workspace.yaml`을 두지 않는다.** 이 파일이 있으면 템플릿 안의 pnpm이 루트를 workspace로 잡아 숨은 결합이 생긴다.
- **`setup.sh` 제약**:
  - `/bin/bash` 3.2에서 동작해야 한다.
  - `set -euo pipefail`을 쓴다.
  - 숨김 파일까지 옮긴다(`cp -R <폴더>/. .`).
  - 안전장치를 둔다.
    - 템플릿 레포 상태일 때만 실행한다.
    - 작업 트리가 dirty면 거부한다.
    - 알 수 없는 템플릿이면 거부한다.
    - TTY가 아니면서 `--yes`가 없으면 거부한다.
    - `.git`은 건드리지 않는다.

### 템플릿 1: `single/` (FSD 공식 Next.js 가이드 구조)

```text
single/
├── app/                          # Next 라우트만 둔다 (얇게)
│   ├── layout.tsx                # html·body·metadata, Provider와 전역 CSS import
│   └── page.tsx                  # export { HomePage as default } from '@/_pages/home'
├── src/
│   ├── _app/{providers,styles}/  # TanStackProvider + getQueryClient, globals.css
│   ├── _pages/home/              # ui/HomePage.tsx, index.ts
│   ├── widgets/.gitkeep          # 빈 레이어를 미리 만들어 둔다 (Q41)
│   ├── features/.gitkeep
│   ├── entities/.gitkeep
│   └── shared/{api,config,lib}/  # api: 인스턴스 2개·createApiMethods·인터셉터(ApiError 정규화, 401 훅), config: zod env 스키마, lib: cn
├── e2e/                          # Playwright 스모크
├── .github/                      # ci.yml, ISSUE_TEMPLATE/, PULL_REQUEST_TEMPLATE.md
├── .agents/skills/               # 스킬 원본 (6개)
├── .claude/skills → ../.agents/skills
├── .hermes/skills → ../.agents/skills
├── AGENTS.md  CLAUDE.md(@AGENTS.md)
├── next.config.ts  steiger.config.mjs  eslint.config.mjs  vitest.config.ts  playwright.config.ts
├── .prettierrc  .prettierignore  .editorconfig  .husky/pre-commit  .gitignore  .env.example  .nvmrc
└── package.json  pnpm-lock.yaml  pnpm-workspace.yaml  tsconfig.json  postcss.config.mjs  README.md
```

### 템플릿 2: `monorepo/`

```text
monorepo/
├── apps/
│   ├── web/                      # single과 같은 구조. cn은 @repo/ui에서, transpilePackages 사용
│   │                             # .env.example: API_BASE_URL=http://localhost:4000
│   └── api/                      # NestJS 12 (ESM, Vitest + unplugin-swc)
│       ├── src/
│       │   ├── main.ts           # nestjs-pino, helmet, cookie-parser, CORS(env), 전역 ValidationPipe·예외 필터, Swagger(/docs)
│       │   ├── app.module.ts
│       │   ├── config/           # @nestjs/config + 필수 env 검증 (DATABASE_URL, PORT, JWT_SECRET, CORS_ORIGINS)
│       │   ├── common/filters/   # 전역 예외 필터 (에러 응답 형식을 web의 ApiError와 맞춤)
│       │   ├── auth/             # JwtStrategy(httpOnly 쿠키에서 추출), 전역 JwtAuthGuard, @Public(), @CurrentUser() — 토큰 발급은 없음
│       │   ├── prisma/           # PrismaModule·PrismaService (driver adapter)
│       │   └── health/           # @nestjs/terminus, GET /health(@Public) — DB 연결까지 확인
│       ├── prisma/schema.prisma  # generator + datasource만 둔다 (모델 0개)
│       ├── prisma.config.ts
│       ├── test/                 # e2e (supertest)
│       └── .env.example          # DATABASE_URL, PORT=4000, JWT_SECRET(자리표시자), CORS_ORIGINS
├── packages/
│   ├── typescript-config/        # base, nextjs, nestjs
│   ├── eslint-config/            # base, next(+타입 규칙 3개, enum 금지), nest
│   └── ui/                       # cn
├── e2e/                          # 풀스택 스모크 (Playwright webServer 배열로 api와 web을 함께 띄움)
├── docker-compose.yml            # PostgreSQL (로컬·CI 공용)
├── turbo.json                    # dev, build, lint, lint:fsd(web), check-types, test, test:e2e
├── .github/ .agents/skills/ .claude/skills→ .hermes/skills→ AGENTS.md CLAUDE.md
└── .prettierrc .editorconfig .husky/ .gitignore .nvmrc package.json pnpm-lock.yaml pnpm-workspace.yaml README.md
```

- **web과 api 연결**: `turbo dev`로 두 앱을 함께 띄운다. web은 `/backend/*`를 rewrite로 api(`http://localhost:4000`)에 넘긴다.
- **DB**: 로컬과 CI 모두 `docker compose up -d --wait`로 PostgreSQL을 띄운다. CI도 GitHub Actions의 `services`가 아니라 같은 compose 파일을 쓴다. 그래야 실행 경로가 하나로 유지된다.
- **steiger**는 `apps/web`에만 적용한다. api는 NestJS 기본 모듈 구조를 따른다.
- **하네스**: AGENTS.md에 백엔드 절을 추가한다. 다룰 내용은 모듈 구조, config, Prisma, 로깅, 예외 처리, health다. 백엔드 전용 스킬은 지금 만들지 않는다. **(Q58로 바뀜: fullstack에 `nestjs-api`, `backend-convention-review`를 추가했고, drift 검사는 이 두 스킬만 예외로 둔다.)** 스킬 6개는 `single`과 같은 내용을 유지하되, 특정 프레임워크에 묶이지 않는 문구로 쓴다(드리프트 검사 대상).

### 설정과 규칙 요약 (자세한 근거는 §4)

| 영역 | 내용 |
|---|---|
| 경계 검사 | web에만 steiger를 적용한다. `recommended`에 `--fail-on-warnings`, 예외 없음, steiger 0.10. |
| web API | 인스턴스 2개(`/backend`, `server-only`), `createApiMethods`, 명시적 시그니처. 인터셉터는 두 가지를 한다. ① `AxiosError`를 `ApiError {status, code, message, requestId?}`로 정규화한다. `requestId`는 응답 헤더 `X-Request-Id`에서 읽는다(Q42). 헤더가 없는 백엔드라면 `undefined`가 된다. ② 401을 받으면 `onUnauthorized` 훅을 호출한다. 이 훅은 기본값이 아무것도 하지 않는 것이고, 인증을 붙일 때 refresh와 재시도를 여기에 꽂는다. |
| web env | `API_BASE_URL` 필수. `shared/config`의 zod 스키마로 검증한다. |
| 폼 | zod + react-hook-form + @hookform/resolvers. 전역 설정이 필요 없으므로 설치하고 사용 규칙을 정하는 것까지만 한다. 도메인 폼은 만들지 않는다. 스키마는 `...Schema`, 추론 타입은 `...ReqType`으로 이름 짓는다. 서버 `ApiError`를 폼 에러로 연결하는 패턴은 스킬에 둔다. |
| QueryClient | `getQueryClient` 패턴, Devtools 포함, `staleTime` 60초. |
| api | config 검증, nestjs-pino(개발은 pino-pretty, 요청마다 `genReqId`로 `crypto.randomUUID()`를 만들어 `X-Request-Id` 응답 헤더로 돌려준다, 쿠키·authorization 헤더는 redact, `/health` 요청은 `autoLogging.ignore`로 자동 로그에서 뺀다), 전역 예외 필터(5xx는 stack과 함께 pino로 error 로그, 4xx는 warn), api ESLint에 `no-console: error`(로그는 주입한 `Logger`로만 남긴다), 전역 `ValidationPipe`(whitelist, forbidNonWhitelisted, transform), helmet, CORS(`CORS_ORIGINS`), cookie-parser, JWT 가드(httpOnly 쿠키, 전역 적용, `@Public()`으로 제외), Swagger `/docs`, Prisma 7 + PostgreSQL, terminus health(DB 포함). |
| ESLint | 기존 구성 + 타입 기반 규칙 3개 + `enum` 금지. 모노레포는 `@repo/eslint-config`의 next·nest 프리셋으로 나눈다. |
| Prettier·커밋 | 기존 옵션 + `tailwindStylesheet`, husky `pre-commit` → lint-staged. |
| 스타일링 | Tailwind CSS v4(`@tailwindcss/postcss`)를 쓴다. 진입점은 `src/_app/styles/globals.css`의 `@import 'tailwindcss'`이고, 토큰은 `@theme`에 둔다. 클래스 규칙(정적 클래스는 문자열로 쓰고 `cn`은 조건부·외부 className에만 쓴다)은 AGENTS.md에 둔다. 모노레포는 `apps/web`의 globals.css에 `@source "../../../../packages/ui"`(실제 상대 경로는 T8에서 확정)를 추가한다. 이 지시가 없으면 `packages/ui`의 클래스가 빌드에 포함되지 않는다. |
| 하네스 | `AGENTS.md` 1개, `.agents/skills` 6개(`git-commit`, `write-pr`, `resolve-reviews`, `nextjs-fsd-architecture`, `data-and-forms`, `frontend-convention-review`). Claude·Hermes는 링크로 연결. |

### 버전 기준 (2026-11-12에 `npm view`로 확인)

- **web 관련**: next 16.4.6, tailwindcss 4.3.5, @tailwindcss/postcss 4.3.5, axios 1.21.1, turbo 2.11.10, vitest 5.1.0, @playwright/test 1.65.0, pnpm 12.18.0, steiger 0.10.0, @feature-sliced/steiger-plugin 0.8.2, prettier 3.10.0, prettier-plugin-tailwindcss 0.8.1, husky 9.1.7, lint-staged 17.6.0, typescript-eslint 8.72.2
- **api 관련**: @nestjs/core 12.4.2, @nestjs/cli 12.0.12, @nestjs/config 12.1.1, @nestjs/swagger 12.1.1, @nestjs/terminus 12.1.0, @nestjs/passport 12.0.1, @nestjs/jwt 12.0.4, passport 0.7.0, passport-jwt 4.0.1, class-validator 0.15.1, class-transformer 0.5.1, helmet 8.3.0, cookie-parser 1.4.7, nestjs-pino 5.3.1, unplugin-swc 2.0.0
- **폼 관련**: zod 4.6.7, react-hook-form 7.92.0, @hookform/resolvers 7.0.6
- **Prisma는 `prisma`와 `@prisma/client`를 모두 정확히 `7.10.1`로 고정한다.** 2026-11-12 기준 `prisma` CLI의 npm `latest` 태그가 `8.0.0-rc.33`(RC)을 가리키고 있다. 버전을 지정하지 않고 설치하면 CLI와 클라이언트의 메이저 버전이 어긋난다.
  - scratch에서 직접 확인한 사실: 7.10.1은 모델이 없는 스키마로도 `prisma generate`가 성공한다(exit 0).
  - `prisma init`은 `prisma7.config.ts`와 `skills-lock.json` 같은 부산물을 만든다. 구현할 때 정리한다.
- ESLint 9와 10 중 무엇을 쓸지는 T3에서 실제로 돌려 보고 정한다. 1순위는 eslint 10.14.0이다(`eslint-config-next` 16.4.6 peer `>=9`, typescript-eslint 8.72.2 peer `^10` 허용). 10에서 `eslint-config-next`가 실패하면 9.39.5로 내린다.
- **TypeScript는 6.0.3으로 고정한다.** npm `latest`는 7.0.2지만 typescript-eslint 8.72.2의 peer가 `>=4.8.4 <6.1.0`이라 7을 쓰면 lint가 깨진다(2026-11-12 `npm view`로 확인).
- react 19.3.1, eslint 10.14.0, typescript 6.0.3
- Node는 CI 기준 24 LTS(`engines >=24`)다.
- axios는 정확한 버전으로 고정한다. `minimumReleaseAge`는 7일로 둔다.

## 4. 원재료 결정 (기존 커밋 `b07e62f`에서)

| #    | 항목                                       | 결정                                                                                                                                                                                       | 근거·영향                                                                                                                           |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | FSD 의존성 검사 스크립트와 테스트                     | **제거.** 공식 FSD 구조를 쓰고 검사는 steiger로만 한다.                                                                                                                                                  | 공식 Next.js 가이드 구조는 루트 `app/`, `src/_app`·`src/_pages`를 쓴다. `@feature-sliced/filesystem` 3.1.1이 레이어 이름 앞의 `_`를 떼고 인식한다(소스에서 확인). |
| 2    | `steiger.config.mjs`                     | **예외 없이 새로 쓴다.** `recommended` + `--fail-on-warnings`, 0.10.                                                                                                                             | 기존 예외 6개는 새 구조에서 필요 없다. `apps/*`·`packages/core`는 예전 구조의 잔재다.                                                                   |
| 3    | `shared/api`                             | **유지하고 정리.** `createApiMethods`, 명시적 시그니처, 서버 env 필수.                                                                                                                                    | 복붙으로 두 벌이 있었고, body가 `any`로 추론됐다.                                                                                               |
| 4    | rewrite, `.env.example`, `shared/config` | **필수로 유지하고 정리.** 검증은 한 곳에서 한다. `single`은 `http://localhost:8080`, monorepo web은 `http://localhost:4000`.                                                                                 | 같은 출처 프록시 방식이고, 설정이 빠지면 즉시 실패한다.                                                                                                |
| 5    | `shared/lib/cn`                          | **유지.** 모노레포에서는 `@repo/ui`로 둔다.                                                                                                                                                          | className 병합 규칙을 한 곳에서 관리하고, 패키지 간 import 예시가 된다.                                                                               |
| 6    | `src/app/*`                              | **공식 구조로 옮기고 `getQueryClient` 패턴을 쓴다.**                                                                                                                                                  | TanStack 공식 Advanced SSR 가이드를 따랐다.                                                                                              |
| 7    | `views/home`                             | **`src/_pages/home`의 `HomePage`로 옮긴다.**                                                                                                                                                  | "라우트는 얇게"를 보여 주는 예시다.                                                                                                           |
| 8    | `eslint.config.mjs`                      | **유지하고 타입 기반 규칙 3개와 `enum` 금지를 추가한다.**                                                                                                                                                   | 비동기 실수와 `server-only` 누출을 막는다.                                                                                                  |
| 9    | Prettier                                 | **옵션 유지.** `tailwindStylesheet`를 추가하고 `.agents/`를 포맷 대상에 넣는다.                                                                                                                            | Tailwind v4에서 필요하다.                                                                                                             |
| 10   | editorconfig·husky·lint-staged           | **그대로 유지.**                                                                                                                                                                              | 비용이 작다.                                                                                                                         |
| 11   | 이슈·PR 양식                                 | **각 템플릿으로 옮긴다.** 체크리스트를 갱신하고 드리프트 검사 대상에 넣는다.                                                                                                                                            | 루트 `.github/`는 `setup.sh`가 지운다.                                                                                                 |
| 12-1 | `git-commit`                             | **유지하고 정리.** 문서는 한 벌만 두고 예시를 교체한다.                                                                                                                                                       | 실제로 쓰는 컨벤션이다. 문서가 중복돼 있었다.                                                                                                      |
| 12-2 | `write-pr`                               | **유지하고 정리.** GitHub 기본 라벨, `develop`·기본 브랜치를 base로.                                                                                                                                      | 커스텀 라벨이 없을 때 라벨이 빠지고, base를 하드코딩하던 문제를 고친다.                                                                                     |
| 12-3 | `resolve-reviews`                        | **유지하고 정리.** push·답글 전에 확인 단계를 넣는다.                                                                                                                                                      | 판단 기준이 Kotlin 기준이었고, 30개 제한, 확인 없는 외부 동작 문제가 있었다.                                                                               |
| 12-4 | `nextjs-fsd-architecture`                | **공식 구조 기준으로 다시 쓴다.** AGENTS.md와 역할을 나눈다.                                                                                                                                                | 폐기된 구조를 안내하고 있었다.                                                                                                               |
| 12-5 | `tailwind-shadcn`                        | **AGENTS.md로 흡수하고 삭제.**                                                                                                                                                                  | 짧고 늘 적용되는 규칙이다.                                                                                                                 |
| 12-6 | `tanstack-query-zod`                     | **`data-and-forms` 스킬로 다시 쓴다.** 다루는 내용은 key 팩토리, 훅 네이밍, RSC prefetch와 `HydrationBoundary`, 무효화 범위, 그리고 Q38에 따른 zod·react-hook-form 폼 패턴(스키마 네이밍, mutation으로 제출, `ApiError`를 폼 에러로 매핑)이다. | SSR 절차가 늘었고, 폼이 기본 포함으로 바뀌었다. 폼 제출은 보통 mutation을 거치므로 한 스킬에 둔다.                                                                 |
| 12-7 | `frontend-convention-validator`          | **`frontend-convention-review` 스킬 하나로 합친다.** lint로 옮길 수 있는 것은 옮긴다.                                                                                                                       | 세 벌로 중복돼 있었고, 일부는 기계적으로 검사할 수 있다.                                                                                               |

## 5. 작업

T3부터 완료 판정에는 `scripts/verify-template.sh <템플릿>`을 쓴다. 이 스크립트는 다음을 차례로 실행하며, 사용자가 실제로 밟는 경로를 그대로 따라간다.

1. 아카이브를 받는다.
2. git을 초기화한다.
3. `setup.sh --yes`를 실행한다.
4. `pnpm install --frozen-lockfile`을 실행한다.
5. compose 파일이 있으면 DB를 올린다.
6. 결과물 목록 검사, 음성 대조, 게이트를 실행한다.
7. DB를 정리한다.

| ID | 작업 | 의존 | 쓰기 범위 | 완료 판정 |
|---|---|---|---|---|
| **T1** | `rebuild/templates` 브랜치를 만든다. 기존 루트 앱과 루트 `.github/`를 `git rm`하고 `docs/`만 남긴다. | — | 루트 전체 (삭제) | `git ls-files`에 `docs/`만 남는다. `main`은 바뀌지 않는다. |
| **T2** | `setup.sh`와 `scripts/test-setup.sh`를 만든다. 테스트는 픽스처 레포를 쓴다. 템플릿 목록은 스크립트 상단 한 곳에서 정의한다. | T1 | `setup.sh`, `scripts/test-setup.sh` | `/bin/bash scripts/test-setup.sh`가 exit 0이다. 케이스 ①–⑪이 이름 그대로 통과한다: ① 일반·숨김 파일 이동 ② 미선택 폴더 삭제 ③ 레포 전용 파일 삭제 ④ 자기 삭제 ⑤ 재실행 거부 ⑥ dirty 거부 ⑦ 알 수 없는 템플릿 거부 ⑧ 비TTY에 `--yes` 없으면 거부 ⑨ `.git` 보존 ⑩ 공백 경로 ⑪ 하위 디렉터리에서 실행. `shellcheck --shell=bash setup.sh scripts/*.sh`가 통과한다. |
| **T3** | `single/` 골격(테스트·CI·하네스 제외)을 만들고 `setup.sh`에 등록한다. 골격에는 `src/{widgets,features,entities}/.gitkeep`이 포함된다. `scripts/verify-template.sh`를 만들고 **결과물 목록 일치**와 **steiger 음성 대조**(`shared → _pages` import를 심어 실패하는지 확인)를 넣는다. | T2 | `single/**`, `setup.sh`, `scripts/verify-template.sh` | `scripts/verify-template.sh single`이 exit 0이다. 출력에 목록 일치, 음성 대조 실패 확인, lint, lint:fsd, format:check, check-types, build 통과가 찍힌다. |
| **T4** | `single` 단위 테스트(Vitest + Testing Library + jsdom) | T3 | `single/**`, `scripts/verify-template.sh` | verify가 exit 0이다. `pnpm test` 출력에 다음 일곱 개가 나온다. ① `cn`이 충돌하는 클래스를 병합한다 ② `createApiMethods`가 `.data`를 반환하고 body 타입이 추론된다(`expectTypeOf`) ③ `HomePage`가 heading을 렌더한다 ④ `API_BASE_URL`이 없으면 throw한다 ⑤ `getQueryClient`가 서버에서는 새 인스턴스, 브라우저에서는 같은 인스턴스를 준다 ⑥ 인터셉터가 `AxiosError`를 `ApiError {status, code, message, requestId?}`로 바꾼다(네트워크 오류 포함, 응답에 `X-Request-Id`가 있으면 `requestId`에 담김) ⑦ 401 응답이면 `onUnauthorized` 훅이 한 번 호출되고, 그 뒤 에러가 그대로 전파된다 |
| **T5** | `single` E2E 스모크(Playwright chromium, build 후 start) | T4 | `single/**`, `scripts/verify-template.sh` | verify가 exit 0이고 `home renders heading`이 통과한다. |
| **T6** | `single/.github/`: `ci.yml`(PR과 main push), 이슈 양식 2개, PR 양식 | T5 | `single/.github/**` | `actionlint`가 통과한다. 내용이 일치하는지는 T11이 확인한다. |
| **T7** | `single` 하네스: AGENTS.md, `CLAUDE.md`, `.agents/skills` 6개, `.claude`·`.hermes` 링크 | T6 | `single/AGENTS.md`, `single/CLAUDE.md`, `single/.agents/**`, `single/.claude/**`, `single/.hermes/**`, `scripts/verify-template.sh` | verify에 하네스 단계를 추가한 상태로 exit 0이다. 하네스 단계는 링크 `test -e`, 스킬 6개의 `SKILL.md` 존재, 제거한 이름(`views`, `check-fsd-dependencies`, `shadcn`, `tanstack-query-zod`, `AskUserQuestion`)이 `grep`에서 0건인지 확인한다. |
| **T8** | `monorepo/` 웹 쪽 골격: `apps/web`(single에서 이식, `@repo/ui`의 `cn`, `transpilePackages`), `packages/{typescript-config,eslint-config,ui}`, `turbo.json`, 루트 설정, `.github/`, 하네스(AGENTS.md 백엔드 절은 T9에서 추가). `setup.sh`에 등록한다. | T7 | `monorepo/**`, `setup.sh`, `scripts/verify-template.sh` | `scripts/verify-template.sh monorepo`가 exit 0이다. 목록 일치, 음성 대조, 하네스 단계, 그리고 turbo로 돌린 lint, lint:fsd, format:check, check-types, build가 통과한다. |
| **T9** | `apps/api` 골격을 만든다. 구성: NestJS 12(ESM), config 검증, nestjs-pino, 전역 예외 필터, 전역 ValidationPipe, helmet, CORS, cookie-parser, JWT 가드(쿠키, 전역, `@Public`), Swagger `/docs`, Prisma 7.10.1(모델 0개, driver adapter), terminus `/health`(`@Public`, DB 포함), `docker-compose.yml`, `.env.example`, AGENTS.md 백엔드 절(에러 수집 도구를 붙일 때는 전역 예외 필터의 5xx 경로에 연결하고 `X-Request-Id`를 태그로 쓴다는 한 줄 포함). verify 스크립트에 compose up/down 단계를 넣는다. | T8 | `monorepo/**`, `scripts/verify-template.sh` | verify가 exit 0이다. turbo lint·check-types·build에 api가 포함된다. compose로 띄운 DB에서 쿠키 없이 `curl localhost:4000/health`를 호출하면 200과 `database: up`을 반환하고, 응답 헤더에 helmet 헤더가 있다. `/docs` Swagger UI가 helmet CSP에 막히지 않고 열린다(Playwright로 페이지 제목 확인). lockfile에서 `prisma`가 7.10.1이다. |
| **T10** | `monorepo` 테스트를 만든다. web은 T4·T5와 같고 ①은 `@repo/ui`로 옮긴다. api는 단위 테스트(Vitest + unplugin-swc)와 e2e(supertest), 루트에는 풀스택 스모크(Playwright `webServer`로 api와 web을 함께 띄운다)를 둔다. | T9 | `monorepo/**`, `scripts/verify-template.sh` | verify가 exit 0이다. `turbo run test test:e2e` 출력에 다음이 나온다. web: ①–⑦, `home renders heading`. api: `env 누락 시 부팅 실패`, `예외 필터가 표준 에러 형식을 반환`, `ValidationPipe가 정의되지 않은 필드를 400으로 거부`, `보호 라우트는 쿠키 없이 401·유효한 JWT 쿠키로 200`, `@Public 라우트는 쿠키 없이 200`, `응답의 X-Request-Id가 UUID이고 같은 요청의 로그 req.id와 같다`, `GET /health 200 (database up)`. 풀스택: `web /backend/health reaches api and database`. 보호 라우트는 테스트 모듈 안에만 둔다. |
| **T11** | 드리프트 검사 `scripts/check-template-drift.mjs`. 대상은 `shared/api/*`, `shared/config/*`, `_app/providers/*`, `_pages/home/*`, `steiger.config.mjs`, `.agents/skills/**`, 이슈·PR 양식, 템플릿 CI의 web 게이트 목록이다. | T10 | `scripts/check-template-drift.mjs` | 지금 상태에서 exit 0이다. 일부러 하나를 바꾸면 exit 1과 해당 경로가 나오는지 음성 대조로 확인한다. |
| **T12** | 루트 CI `verify-templates.yml`(PR과 main push): `test-setup.sh`, 드리프트 검사, `[single, monorepo]` 매트릭스로 verify 실행. 러너의 docker compose를 쓴다. 루트 README도 작성한다. | T11 | `.github/workflows/verify-templates.yml`, `README.md` | `actionlint`가 통과하고 PR CI 세 job이 모두 green이다. |
| **T13** | **종료 게이트 (검증 작업)** | T1–T12 | 없음 (읽기 전용) | §6 |

**같은 파일을 쓰는 작업의 순서** (모두 직접 의존으로 연결되어 있다)

| 파일 | 수정 순서 |
|---|---|
| `setup.sh` | T2 → T3 → T8 |
| `scripts/verify-template.sh` | T3 → T4 → T5 → T7 → T8 → T9 → T10 |
| `single/**` | T3 → T4 → T5 → T6 → T7 |
| `monorepo/**` | T8 → T9 → T10 |

## 6. 종료 게이트 (T13)

- **실행 주체**: 구현한 에이전트가 아닌 별도 리뷰어(서브에이전트 또는 사용자)가 실행한다.
- **실행할 명령**: 아래가 모두 exit 0이고 PR의 `verify-templates` CI가 green이어야 한다.
  1. `/bin/bash scripts/test-setup.sh` (macOS bash 3.2)
  2. `scripts/verify-template.sh single`
  3. `scripts/verify-template.sh monorepo` (로컬 docker 필요)
  4. `node scripts/check-template-drift.mjs`
  5. `shellcheck --shell=bash setup.sh scripts/*.sh`
- **리뷰 관점**:
  - 템플릿 밖을 참조하는 경로가 있는가
  - `setup.sh`가 목록 밖의 파일을 지우는가
  - 비목표 기능이 들어왔는가 (Prisma 모델, 인증 등)
  - AGENTS.md·스킬이 실제 구조와 맞고, 규칙이 중복되지 않는가
  - api 에러 응답과 로그에 민감 정보(env 값, 스택)가 운영 모드에서 새지 않는가
- 리뷰 결과가 clean이 아니면 수정 작업 `T14`를 만들고 게이트를 다시 실행한다. 최대 두 번까지 하고, 그 뒤에도 남은 문제는 보고한다.
- **`main` 머지와 "Template repository" 설정은 이 계획의 범위 밖이다.** 사용자가 결정한다.

## 7. 리스크와 검증 공백

| 리스크 | 대응 | 판정 주체 |
|---|---|---|
| 레포 전용 파일이 새 프로젝트로 샌다 | 결과물 목록 정확 일치(T3) | verify 스크립트 |
| `setup.sh`가 의도하지 않은 파일을 지운다 | 명시적 목록, dirty 거부, 픽스처 ①–⑪ | `test-setup.sh` |
| bash 3.2와 호환되지 않는다 | 로컬 `/bin/bash`와 shellcheck. **CI는 bash 5라서 3.2는 직접 검증하지 못한다.** | 로컬 실행 (CI 공백) |
| steiger가 조용히 아무것도 검사하지 않는다 | 음성 대조(T3) | verify 스크립트 |
| Prisma CLI `latest`가 RC를 가리킨다 | `prisma`·`@prisma/client`를 정확히 7.10.1로 고정하고 lockfile을 확인한다(T9) | T9 판정, lockfile |
| Prisma 7 구성(`prisma.config.ts`, driver adapter, 생성 경로)이 Nest ESM과 맞지 않는다 | T9에서 공식 문서를 기준으로 구성하고 build와 health로 확인한다 | T9 build·health |
| verify에 docker가 필요하다 | 로컬은 docker 29.9.2로 확인했다. CI는 ubuntu 러너의 docker compose를 쓴다. 템플릿 README에 docker가 필요하다고 적는다. | verify 실행 |
| 풀스택 E2E에서 api 기동 순서 때문에 flaky해진다 | Playwright `webServer` 배열에 api health URL로 대기를 건다 | T10 반복 실행 |
| ESLint 10과 `eslint-config-next`가 호환되지 않는다 | T3에서 실제로 돌려 보고 결정한다 | T3 |
| Windows에서 스킬 링크가 깨진다 | 범위 밖이다. README에 명시한다. | 공백 |
| 두 템플릿이 어긋난다 | T11 | 루트 CI |
| 공급망 사고 | 정확한 버전 고정(axios, prisma), `minimumReleaseAge` 7일, `--frozen-lockfile` | lockfile 리뷰 |
| `.env.example`의 `JWT_SECRET` 자리표시자가 운영 환경에 그대로 쓰인다 | config 검증에서 최소 길이(32자)와 자리표시자 문자열을 거부한다. 단, 테스트는 별도 값을 주입한다 | api 단위 테스트 `env 누락 시 부팅 실패`에 케이스 추가(T10) |
| 같은 출처 프록시라 CORS가 실제로 쓰이지 않아 설정이 잘못돼도 모른다 | `CORS_ORIGINS`는 api를 직접 호출하는 경우(Swagger, 외부 클라이언트)에만 의미가 있다고 AGENTS.md에 적는다. CORS 설정에 `exposedHeaders: ['X-Request-Id']`를 넣어, 교차 출처에서도 클라이언트가 요청 ID를 읽을 수 있게 한다. e2e에서 허용 origin의 preflight를 한 번 확인한다 | T10 api e2e |
| 쿠키 이름과 SameSite·Secure 값이 프로젝트마다 다르다 | 쿠키 이름은 config 상수 하나로 두고, 토큰을 발급하는 쪽(프로젝트에서 구현)이 같은 상수를 쓰도록 AGENTS.md에 적는다 | 리뷰(T13) |

## 8. 승인 범위

계획을 승인하면 다음까지 승인한 것으로 본다.

- T1: `rebuild/templates` 브랜치에서 기존 앱을 삭제하는 것. `main`은 건드리지 않는다.
- §3의 구조
- Q26–Q43의 결정

## 9. 리뷰 포커스 (계획한 테스트가 덮지 못하는 입력)

1. **루트 `app/`는 steiger가 검사하지 않는다.** 라우트 파일에 로직이 쌓여도 기계적으로 잡을 수 없다. 담당: T7. `frontend-convention-review`의 판단 항목에 넣는다.
2. **DB가 내려간 상태에서 `/health`를 호출하는 경우.** 503과 `database: down`을 반환해야 하고, 프로세스가 죽으면 안 된다. 담당: T10. api e2e에 DB 연결 실패 케이스(잘못된 `DATABASE_URL`로 띄운 모듈)를 추가한다.
3. **운영 모드에서 예외 필터가 스택이나 내부 메시지를 응답에 넣는 경우.** 담당: T10. `NODE_ENV=production`일 때 응답 본문에 `stack`이 없는지 확인하는 단위 테스트를 추가한다.
4. **`transpilePackages`가 빠진 경우.** 담당: T8. build로 검증한다.
4-1. **`packages/ui`에 Tailwind 클래스를 쓰는 컴포넌트가 생겼는데 `@source`가 빠진 경우.** 빌드는 성공하지만 스타일이 적용되지 않는다. 지금 `packages/ui`에는 `cn`만 있어서 기계적으로 잡을 방법이 없다. 담당: T8. `@source`를 설정하고, `packages/ui`에 Tailwind 클래스를 쓰는 테스트 전용 컴포넌트를 두고 빌드된 CSS에 그 클래스가 들어 있는지 grep으로 확인한다.
5. **`.env.local`이나 `.env` 없이 게이트를 실행하는 경우.** verify는 `.env.example`만 있는 상태에서 실행된다. monorepo api가 이 상태에서 뜨려면 `DATABASE_URL`과 테스트용 `JWT_SECRET`이 필요하므로 verify가 이 값을 주입한다. 담당: T9.
6. **동시에 여러 요청이 401을 받는 경우.** `onUnauthorized` 훅이 여러 번 동시에 호출된다. 나중에 refresh를 붙이면 refresh 요청이 중복으로 나간다. 담당: T4. 훅 계약을 "같은 시점에 발생한 401은 한 번만 처리하도록 직렬화한다"로 정한다. 동시에 들어온 401 두 건에 훅이 한 번만 호출되는지 확인하는 테스트를 ⑦ 옆에 추가한다.
7. **ValidationPipe의 `transform` 옵션이 쿼리 문자열을 암묵적으로 숫자로 바꾸는 경우.** `enableImplicitConversion`을 켜면 `"abc"`가 `NaN`으로 통과할 수 있다. 담당: T9. 암묵 변환은 끈다. 담당: T10. 타입이 틀린 쿼리가 400을 반환하는지 확인하는 e2e를 둔다.
8. **요청 로그에 JWT 쿠키가 그대로 찍히는 경우.** pino-http의 기본 요청 직렬화는 요청 헤더 전체를 로그에 남기므로 `cookie`와 `authorization` 헤더도 함께 기록된다. 담당: T9. nestjs-pino 설정에 `redact: ['req.headers.cookie', 'req.headers.authorization']`를 넣는다. 담당: T10. 인증 쿠키를 붙여 요청한 뒤 로그 출력에 토큰 값이 없는지 확인하는 api e2e `request log redacts auth cookie`를 추가한다.
9. **전역 예외 필터가 응답만 만들고 에러를 로그에 남기지 않는 경우.** 커스텀 필터가 응답을 직접 쓰면 원래 에러와 stack이 로그에서 사라진다. 담당: T9. 필터에서 5xx를 `logger.error(err)`로 남긴다. 담당: T10. 일부러 throw하는 테스트 라우트를 호출한 뒤, 같은 `req.id`의 error 로그에 stack이 있는지 확인하는 api e2e `unhandled error is logged with stack`을 추가한다.
