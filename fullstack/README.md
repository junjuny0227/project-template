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
  app/                       얇은 라우트 재수출과 layout
  src/_app/                  Provider와 전역 스타일
  src/_pages/home/           홈 화면
  src/{widgets,features,entities}/  도메인 코드가 생기면 slice 추가
  src/shared/{api,config,lib}/   axios, ApiError, getQueryClient, env 검증, cn
apps/api/                    NestJS ESM 모듈, config, auth, logging, health, Prisma
packages/{eslint-config,typescript-config}/  공용 설정 프리셋
e2e/                         web → api → DB 풀스택 스모크
```

웹의 `@/*`는 `apps/web/src/*`다. `getQueryClient`는 `@/shared/api`에서 가져온다. 서버 prefetch와 `HydrationBoundary`는 `_pages`의 페이지 컴포넌트에 두고 `app/`은 재수출만 한다. `cn`은 `@/shared/lib`에서 가져온다.

Prisma CLI·client·adapter는 7.10.1로 고정하고 모델은 없다. 모델을 추가할 때 API의 `prisma/schema.prisma`를 수정하고 `pnpm --filter @repo/api exec prisma migrate dev --name <name>`과 `pnpm --filter @repo/api exec prisma generate`를 실행한다.

## 검증

먼저 DB를 띄우고 위 환경 파일을 준비한다. 브라우저는 최초 한 번 설치한다(Linux에서 시스템 의존성이 없으면 `--with-deps` 추가).

```bash
pnpm exec playwright install chromium
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

## 에이전트 하네스

상시 규칙은 `AGENTS.md` 하나, `CLAUDE.md`는 `@AGENTS.md` 포인터다. 작업별 절차 8개(백엔드용 `nestjs-api`, `backend-convention-review` 포함)는 `.agents/skills/`에만 두고 `.claude/skills`, `.hermes/skills`가 같은 원본으로 연결된다. Windows에서는 Git 심볼릭 링크 지원 설정이 없으면 링크가 일반 파일이 될 수 있다. 지원 대상인 macOS·Linux에서 사용하거나 Windows에서 링크를 직접 확인한다.
