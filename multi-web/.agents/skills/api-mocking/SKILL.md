---
name: api-mocking
description: MSW API 모킹을 다룰 때 쓴다. `@repo/mocks`에 mock handler를 추가·수정할 때, 모킹을 켜고 끌 때, 앱의 MockProvider·`instrumentation.ts`·`next.config.ts` 모킹 배선이나 모킹 E2E를 바꿀 때, MSW 버전을 올려 worker 파일을 다시 만들 때 읽는다.
---

# api-mocking

`src/`, `instrumentation.ts`, `next.config.ts`, `e2e/` 경로는 각 앱(`apps/client/`, `apps/admin/`) 기준이다. MSW가 브라우저 요청과 Node 서버 요청을 함께 모킹해서 백엔드 없이 개발할 수 있다. `@repo/mocks`가 공통 handler와 시작 함수를 제공하고, 앱이 그것을 배선한다.

## 켜고 끄기

- 각 앱 `.env.example`의 기본값은 `NEXT_PUBLIC_API_MOCKING=enabled`다. 백엔드 없이 개발할 수 있다. 미설정 또는 `disabled`일 때 모킹을 끈다.
- 이 플래그는 빌드 시 고정된다. 운영에서는 변수를 빼거나 `disabled`로 설정한 뒤 다시 빌드한다. 실행 시점 변경만으로 기존 브라우저 번들이 바뀌지 않는다.

## handler

- handler는 `packages/mocks/src/handlers.ts`에 둔다. 모킹할 endpoint마다 handler를 추가한다. 기본 예시는 `GET /health` 하나다. 패키지는 env를 읽지 않고 base URL을 인자로 받는다(브라우저는 `/backend`, 서버는 `API_BASE_URL`).

## 배선과 env 접근 예외

- env 접근의 예외: MockProvider, `instrumentation.ts`, `next.config.ts`의 모킹 배선과 HomePage의 모킹 표시 분기는 `process.env.NEXT_PUBLIC_API_MOCKING`을 직접 읽는 빌드 시 분기를 허용한다. 현재 next.config.ts는 검증한 env 값을 `env` 옵션에 고정한다. MockProvider와 instrumentation.ts, HomePage의 literal 비교를 env 객체나 조건 변수로 우회하지 않는다. Next가 분기를 제거해야 운영 브라우저 번들에 MSW가 남지 않는다. `NEXT_RUNTIME`은 instrumentation의 Node 런타임 가드용이다.
- MockProvider는 worker 시작을 기다린 뒤 children을 렌더한다. 브라우저 동적 import에는 `typeof window !== 'undefined'` 가드를 유지한다. instrumentation은 Node 런타임에서만 서버 모킹을 시작한다.

## worker 파일

- MSW를 올리면 `pnpm --filter @repo/mocks exec msw init`으로 두 앱의 worker 파일을 재생성한다.

## 확인용 화면

- 모킹된 요청을 보내는 서버 컴포넌트는 빌드 중 실제 백엔드를 호출하지 않도록 먼저 `await connection()`을 호출한다. 홈의 두 mocked 표시는 배선 확인용이며 실제 화면으로 교체할 때 `mocking-on.spec.ts`도 함께 수정한다.

## E2E

- E2E의 `mocking` 프로젝트는 `enabled`인 `pnpm dev`(client 3100, admin 3101), `chromium` 프로젝트는 `disabled`로 빌드한 운영 서버(3000, 3001)를 쓴다. 모킹 켠 브라우저·서버 응답, 모킹 끈 worker 미등록·번들 MSW 부재를 확인한다.
