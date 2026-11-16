# Project Template · fullstack

Next.js 웹(`apps/web`)과 NestJS API(`apps/api`), PostgreSQL을 함께 실행하는 Turborepo 템플릿이다. 도메인 화면·API·Prisma 모델·토큰 발급은 없고, 홈 화면과 인프라만 있다.

## 시작

Node.js 24 이상, pnpm 12.18.0, Docker와 Docker Compose가 필요하다. 새 프로젝트에서 템플릿 선택을 마친 뒤 이 폴더가 프로젝트 루트가 된다.

```bash
corepack enable
pnpm install --frozen-lockfile
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
# 출력한 값을 apps/api/.env의 JWT_SECRET에 넣는다. 예제 자리표시자는 부팅 시 거부된다.
docker compose up -d --wait
pnpm dev
```

- 웹: `http://localhost:3000`
- API health(DB 포함): `http://localhost:4000/health`
- Swagger: `http://localhost:4000/docs` (운영 `NODE_ENV=production`에서는 꺼짐)
- 웹을 거친 health: `http://localhost:3000/backend/health`

`pnpm dev`는 Turbo로 web과 api를 함께 실행한다. 웹의 `/backend/*`는 `API_BASE_URL`로 rewrite한다. `CORS_ORIGINS`는 API를 직접 교차 출처로 호출할 때만 의미가 있다. 로컬 DB 접속 정보는 `docker-compose.yml`과 API 예제 환경에 맞춰져 있으며 운영용 비밀이 아니다. 운영 환경에서는 접속 정보와 JWT 비밀을 별도로 관리한다.

종료할 때 `Ctrl+C`로 앱을 멈추고 `docker compose down`으로 DB를 멈춘다. `docker compose down --volumes`는 로컬 DB 데이터까지 삭제하므로 초기화할 때만 쓴다. 3000·4000·5432 포트는 비워 둔다.

## 구조

```text
apps/web/                    Next.js App Router + Feature-Sliced Design
  app/                       얇은 라우트 재수출과 layout, 오류 화면(error, not-found, global-error)
  src/_app/                  Provider와 전역 스타일
  src/_pages/home/           홈 화면
  src/{widgets,features,entities}/  도메인 코드가 생기면 slice 추가
  src/shared/{api,config,lib}/   axios, ApiError, getQueryClient, env 검증, cn
apps/api/                    NestJS ESM 모듈, config, auth, logging, health, Prisma
packages/api-types/          API에서 생성한 OpenAPI 명세와 타입 (타입 전용)
packages/{eslint-config,typescript-config}/  공용 설정 프리셋
e2e/                         web → api → DB 풀스택 스모크
```

웹의 `@/*`는 `apps/web/src/*`다. `getQueryClient`는 `@/shared/api`에서 가져온다. 서버 prefetch와 `HydrationBoundary`는 `_pages`의 페이지 컴포넌트에 두고 `app/`은 재수출만 한다. `cn`은 `@/shared/lib`에서 가져온다.

Prisma CLI·client·adapter는 7.10.1로 고정하고 모델은 없다. 모델을 추가할 때 API의 `prisma/schema.prisma`를 수정하고 `pnpm --filter @repo/api exec prisma migrate dev --name <name>`과 `pnpm --filter @repo/api exec prisma generate`를 실행한다.

## API 타입

`packages/api-types`(`@repo/api-types`)는 API의 Swagger 메타데이터에서 만든 OpenAPI 명세(`openapi.json`)와 TypeScript 타입(`openapi.d.ts`)을 담는다. 생성물은 커밋한다.

```bash
pnpm openapi         # 컨트롤러·DTO를 바꾼 뒤 명세와 타입을 다시 생성한다
pnpm openapi:check   # 생성물이 현재 코드와 같은지 확인한다 (덮어쓰지 않는다)
```

- 두 명령은 API를 빌드한 뒤 모듈 메타데이터만 읽는다. DB, 서버 실행, 환경 파일이 필요 없다.
- 생성물을 손으로 고치지 않는다. 코드와 다르면 `openapi:check`가 실패하고 다시 생성하라고 알려 준다. CI가 설치 직후 이 검사를 실행한다.
- 웹에서는 패키지에서 타입을 직접 가져온다.

```ts
import type { paths } from '@repo/api-types';

type HealthResponse = paths['/health']['get']['responses'][200]['content']['application/json'];
```

## 오류 화면과 보안 헤더

- 웹에 라우트 오류(`error.tsx`), 404(`not-found.tsx`), 루트 layout 오류(`global-error.tsx`) 화면이 들어 있다. 오류 화면은 안내 문구, 다시 시도 버튼, 홈 링크를 보여 주고 `digest`가 있으면 오류 코드로 표시한다. `error.message`는 화면에 내보내지 않는다.
- 문구와 디자인은 `apps/web/src/_pages/error/ui/ErrorPage.tsx`와 `apps/web/src/_pages/not-found/ui/NotFoundPage.tsx`에서 바꾼다. `app/`의 세 파일은 재수출만 한다.
- 모든 응답에 `Strict-Transport-Security`, `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options`, `Permissions-Policy`가 붙고 `X-Powered-By`는 꺼져 있다. 값은 `apps/web/next.config.ts`의 `headers()`에 있다.
- CSP는 서비스마다 허용 출처가 달라 넣지 않았다. 추가할 때는 `headers()`에 `Content-Security-Policy`를 더하고 `apps/web/e2e/security-headers.spec.ts`의 CSP 부재 검사를 함께 바꾼다.

## 컨테이너와 마이그레이션

프로젝트 루트를 build context로 쓴다.

```bash
docker build -f apps/web/Dockerfile --build-arg API_BASE_URL=https://api.example.com -t my-web .
docker build -f apps/api/Dockerfile -t my-api .

# 마이그레이션은 서버 시작과 따로 실행한다
docker run --rm -e DATABASE_URL="$DATABASE_URL" my-api pnpm exec prisma migrate deploy

docker run --rm -p 4000:4000 -e DATABASE_URL="$DATABASE_URL" -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ORIGINS=https://app.example.com -e PORT=4000 my-api
docker run --rm -p 3000:3000 -e API_BASE_URL=https://api.example.com my-web
```

- 웹의 `API_BASE_URL`은 `/backend/*` rewrite에 들어가 빌드할 때 고정된다. API 주소가 바뀌면 웹 이미지를 다시 만든다. 실행할 때도 환경 변수 검증에 필요하므로 같은 값을 넘긴다. 웹 컨테이너 안에서 접근할 수 있는 주소여야 한다.
- API 서버는 시작할 때 마이그레이션을 실행하지 않는다. 배포할 때 위 `prisma migrate deploy`를 먼저 실행한다. 모델을 추가하기 전에는 적용할 마이그레이션이 없다고 나오고 끝난다.
- 두 이미지 모두 Node 24, pnpm 12.18.0 기반 다단계 빌드(`turbo prune --docker`)이며 `node` 사용자로 `pnpm start`를 실행한다. `output: 'standalone'`은 쓰지 않는다.

## 검증

먼저 DB를 띄우고 위 환경 파일을 준비한다. 브라우저는 최초 한 번 설치한다(Linux에서 시스템 의존성이 없으면 `--with-deps` 추가).

```bash
pnpm exec playwright install chromium
pnpm openapi:check
pnpm lint
pnpm lint:fsd
pnpm format:check
pnpm check-types
pnpm test
pnpm test:e2e
pnpm build
```

- 루트 게이트는 Turbo가 각 패키지로 위임한다. FSD 검사는 웹에만 적용한다.
- `test:e2e`는 웹 홈 스모크와 API e2e를 실행하고, 둘이 끝나면 루트 `test:fullstack`을 실행한다. 웹 서버 포트가 겹치지 않도록 순서를 보장한다.
- 풀스택 Playwright는 먼저 빌드된 API를 시작해 `/health`를 기다리고, 웹을 빌드·시작한 뒤 `/backend/health`의 200과 DB up을 확인한다. 별도로 실행하려면 `pnpm build && pnpm test:fullstack`을 쓴다. DB는 계속 필요하며 기존 앱 서버는 종료해야 한다.
- `.env` 파일 없는 CI는 `.env.example`의 값들을 환경으로 주입하고 테스트용 JWT 비밀을 매번 생성한다. `.github/workflows/ci.yml`은 PR과 main push에서 동일한 게이트를 돌리고 DB를 항상 정리한다.
- 모든 외부 의존성은 정확한 버전으로 고정한다. 공통 버전은 `pnpm-workspace.yaml`의 `catalog`에서 관리하고 각 package.json은 `catalog:`로 참조한다. `minimumReleaseAge: 10080`(7일) 정책을 유지하며, 버전을 바꾸면 lockfile도 함께 갱신한다.
- `.github/dependabot.yml`이 매주 월요일 09:00(Asia/Seoul)에 npm(pnpm) 의존성과 GitHub Actions 업데이트를 검사한다. 설정 파일이 기본 브랜치에 있으면 별도 앱 설치 없이 동작한다(저장소에서 Dependabot 사용이 허용되어 있어야 한다).
- minor·patch는 생태계별 PR 하나로 묶이고 major는 의존성마다 개별 PR로 온다. 자동 병합은 없다. CI 통과를 확인하고 직접 병합한다.
- `typescript`와 `@types/node`의 major PR은 열리지 않는다(`ignore`). TypeScript는 typescript-eslint와 openapi-typescript가 새 메이저를 지원한 뒤에, `@types/node`는 `.nvmrc`·`engines`·CI의 Node 메이저를 올릴 때 함께 직접 올린다.
- 출시 후 7일이 지나지 않은 버전은 건너뛴다(`cooldown`, `minimumReleaseAge`와 같은 기준). cooldown은 정기 버전 업데이트에만 적용된다.
- 정확한 버전 표기는 그대로 유지된다(`versioning-strategy: increase`).

## 에이전트 하네스

상시 규칙은 `AGENTS.md` 하나, `CLAUDE.md`는 `@AGENTS.md` 포인터다. 작업별 절차(백엔드용 `nestjs-api`, `backend-convention-review` 포함)는 `.agents/skills/`에만 두고 `.claude/skills`, `.hermes/skills`가 같은 원본으로 연결된다. Windows에서는 Git 심볼릭 링크 지원 설정이 없으면 링크가 일반 파일이 될 수 있다. 지원 대상인 macOS·Linux에서 사용하거나 Windows에서 링크를 직접 확인한다.
