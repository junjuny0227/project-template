# Project Template

Next.js App Router와 Feature-Sliced Design(FSD)을 사용하는 **단일 앱** 템플릿입니다. 참고한 DataGSM 모노레포의 앱 내부 경계와 검증 방식을 단일 앱에 맞게 적용했습니다.

## 구조

```text
src/
├── app/       Next.js 라우팅, 전역 스타일, Provider
├── views/     페이지 구성 (FSD pages 레이어)
├── widgets/   독립적인 화면 블록
├── features/  사용자 기능
├── entities/  도메인 엔티티
└── shared/    공통 API, 환경 설정, 유틸리티, UI
```

의존성은 `app → views → widgets → features → entities → shared` 방향으로만 흐릅니다. `widgets`, `features`, `entities`는 아직 비어 있으며, 도메인 코드가 생길 때만 채웁니다. 페이지 구현은 `views`에, 라우트 파일은 `app`에 둡니다.

## 시작하기

```sh
pnpm install
API_BASE_URL=http://localhost:8080 pnpm dev
```

`API_BASE_URL`은 필수입니다. 로컬에서는 루트 `.env.local`에 설정해도 됩니다. 브라우저의 `/backend/*` 요청은 Next.js rewrite를 통해 해당 서버로 전달되며, `/api/*`는 Next.js Route Handler용으로 남겨 둡니다.

## API 경계

- 브라우저 API: `@/shared/api`의 `get`, `post`, `patch`, `put`, `del`을 사용합니다. Axios base URL은 `/backend`입니다.
- 서버 전용 API: `@/shared/api/index.server`의 같은 메서드를 사용합니다. `API_BASE_URL`에 직접 요청하며 `server-only`로 클라이언트 번들 import를 막습니다.
- 현재 인증·토큰 갱신이나 실제 도메인 API는 구현하지 않았습니다. 백엔드 계약이 생기면 해당 slice의 `api/`에 요청 함수와 URL을 둡니다.

## 검증

```sh
pnpm peers check
pnpm lint
pnpm lint:fsd
API_BASE_URL=http://localhost:8080 pnpm check-types
pnpm format:check
API_BASE_URL=http://localhost:8080 pnpm build
```

PR CI는 같은 검사를 실행합니다. CI의 `API_BASE_URL`은 빌드 검증용 로컬 주소이며 실제 서버에 접속하지 않습니다. 실제 배포 환경에는 백엔드 주소를 별도로 설정해야 합니다.

## Hermes Agent 하네스

공통 프로젝트 규칙은 루트 `AGENTS.md`에 있으며 Hermes도 이 파일을 자동으로 읽습니다. 저장소 전용 스킬은 `.hermes/skills/`에 있습니다. `.claude/skills/`의 커밋·PR 작성·리뷰 대응·FSD·UI·데이터 계층 규칙과 프론트엔드 검증 에이전트를 원본 단계·예시와 함께 이식했습니다. 원본 `references/`와 `scripts/` 파일 10개도 같은 상대 경로로 보존했습니다. 단, 리뷰 수집 임시 파일은 Hermes 스크래치 디렉터리에 두고, 커밋·푸시·원격 답글은 사용자의 명시적 요청이 있을 때만 수행합니다. 새 Hermes 세션에서 로드하려면 이 저장소를 한 번 신뢰하세요.

```sh
hermes skills trust "$(git rev-parse --show-toplevel)"
hermes
```

`.claude/hooks/`의 작성 후 자동 수정은 Hermes에 적용되지 않습니다. 변경 뒤에는 위 검증을 직접 실행하세요. 기존 `.claude` 구성은 유지합니다.
