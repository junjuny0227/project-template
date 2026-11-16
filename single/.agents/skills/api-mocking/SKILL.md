---
name: api-mocking
description: MSW API 모킹을 다룰 때 쓴다. mock handler를 추가·수정할 때, 모킹을 켜고 끌 때, MockProvider·`instrumentation.ts`·`next.config.ts`의 모킹 배선이나 모킹 E2E를 바꿀 때, MSW 버전을 올려 worker 파일을 다시 만들 때 읽는다.
---

# api-mocking

경로는 프로젝트 루트 기준이다. MSW가 브라우저 요청과 Node 서버 요청을 함께 모킹해서 백엔드 없이 개발할 수 있다.

## 켜고 끄기

- `.env.example`의 `NEXT_PUBLIC_API_MOCKING=enabled`가 기본값이다. 백엔드 없이 개발하려면 `.env.local`로 복사한 뒤 `pnpm dev`를 실행한다. 실제 백엔드에 붙을 때는 `disabled`로 바꾸거나 변수를 지운다. 운영에서는 설정하지 않는다.

## handler

- handler는 `src/shared/api/mocks/handlers.ts`의 `createHandlers(baseUrl)`에 둔다. 브라우저는 `/backend`, 서버는 `API_BASE_URL`을 앞에 붙인다. 환경 변수는 handler에서 읽지 않는다.

## 배선과 env 접근 예외

- `_app/providers/MockProvider.tsx`가 `@/shared/api/index.mocks`(브라우저 모킹 공개 진입점, 클라이언트 배럴에 msw를 섞지 않으려고 분리)를 동적 import해 worker 준비를 기다리고, `instrumentation.ts`가 Node 서버 요청 모킹을 시작한다.
- 두 곳과 `HomePage.tsx`의 `process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'` 비교는 env 접근 규칙의 예외다. Next가 빌드할 때 분기를 제거하도록 그대로 유지한다. MockProvider의 `typeof window` 검사와 `next.config.ts`의 기본값 `disabled`도 유지한다.

## worker 파일

- `public/mockServiceWorker.js`는 생성 파일이다. MSW 버전을 바꾼 뒤 `pnpm exec msw init`으로 다시 만들고 포맷 검사를 통과시킨다. 생성 경로는 package.json의 `msw.workerDirectory`에 있다.

## 확인용 화면

- 홈의 `MockingStatus`와 `BrowserMockingStatus`, `/health` handler는 모킹 동작 확인용이다. 실제 화면과 API를 붙일 때 함께 바꾸고 `e2e/mocking-on.spec.ts`도 갱신한다. 서버 표시의 `await connection()`은 빌드 중 실제 API 요청을 막는다.

## E2E

- E2E는 모킹을 끈 운영 빌드(3000)와 모킹을 켠 개발 서버(3100)를 각각 띄운다. 브라우저·서버의 handler 응답, 모킹을 껐을 때 worker 미등록과 브라우저 번들에 MSW 코드가 없음을 확인한다.
