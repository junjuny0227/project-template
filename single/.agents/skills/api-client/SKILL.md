---
name: api-client
description: 웹 앱에서 API 요청 코드를 쓰거나 고칠 때, 요청 에러를 처리할 때, 401 처리 지점(`setOnUnauthorized`)에 인증·토큰 갱신을 붙일 때 쓴다. 브라우저·서버 axios 인스턴스의 경계, 요청 메서드와 제네릭, URL 상수 위치, `ApiError` 필드, 401 훅의 동작 규칙을 담는다.
---

# api-client

이 문서의 `src/`, `@/` 경로와 `next.config.ts`는 웹 앱 기준이다. 단일 앱에서는 프로젝트 루트, 모노레포에서는 각 웹 앱 폴더(`apps/web/`, `apps/client/`, `apps/admin/`) 아래에 대응한다.

요청 위에서 데이터를 다루는 방법(query 팩토리, mutation, 폼)은 `data-and-forms` 스킬에 있다. 아래 예의 `UserResponse`, `UpdateProfileRequest`는 설명용 이름이며 템플릿에 없는 코드다.

## 인스턴스와 경계

| 용도                       | import                      | 인스턴스              | baseURL        |
| -------------------------- | --------------------------- | --------------------- | -------------- |
| 브라우저                   | `@/shared/api`              | `axiosInstance`       | `/backend`     |
| 서버(RSC, Server Function) | `@/shared/api/index.server` | `serverAxiosInstance` | `API_BASE_URL` |

- 브라우저의 `/backend/*` 요청은 `next.config.ts`의 rewrite가 `API_BASE_URL`로 넘긴다. `/api/*`는 Route Handler용으로 비워 둔다.
- 서버 인스턴스는 `server-only`를 import한다. 클라이언트 코드에서 `index.server`를 import하면 빌드가 실패한다.
- 요청에는 두 공개 모듈의 `get / post / patch / put / del`을 쓴다. `createApiMethods`가 만든 함수이며 응답의 `.data`를 돌려준다. 인스턴스를 직접 호출하면 `AxiosResponse`가 돌아오므로 일반 요청에는 쓰지 않는다.
- 응답 타입은 첫 번째 제네릭, body 타입은 두 번째 제네릭이다. 응답 타입을 적으면서 body도 검사하려면 둘 다 적는다: `post<UserResponse, UpdateProfileRequest>(url, body)`.
- URL 상수는 해당 entity·feature의 `api/`에 둔다. 서버 API의 실제 경로를 따르고 근거 없이 `/api`나 버전 prefix를 붙이지 않는다.

## 에러

- 모든 요청 실패는 인터셉터가 `ApiError { status, code, message, requestId? }`로 바꿔서 던진다. 원본 에러는 `cause`에 있다.
- 응답이 없는 실패(네트워크 오류, 타임아웃, 취소)는 `status: 0`이다.
- `requestId`는 응답 헤더 `X-Request-Id` 값이다. 에러를 보고하거나 로그를 찾을 때 함께 남긴다.
- 화면에서는 `error instanceof ApiError`로 좁힌 뒤 `status`·`code`로 분기한다.

## 401 처리 지점

`setOnUnauthorized(handler)`로 401 응답 때 실행할 함수를 등록한다. 기본값은 아무것도 하지 않는다. 토큰 저장·갱신·로그인 흐름은 템플릿에 없으며, 인증을 붙일 때 여기에 연결한다.

- 동시에 들어온 401은 진행 중인 훅 호출 하나를 함께 기다린다. 훅이 끝나면 원래 요청은 `ApiError`로 실패한다(자동 재시도는 없다).
- 훅 안에서 보내는 요청(토큰 갱신 등)은 이 인터셉터가 없는 별도 axios 인스턴스로 보낸다. 같은 인스턴스로 보내 401을 받으면 그 요청이 훅을 기다리며 끝나지 않는다.
- 훅이 에러를 던지면 요청은 `ApiError`가 아니라 그 에러로 실패한다.
- 서버 인스턴스는 모듈 상태가 요청 사이에 공유된다. 서버 쪽에 사용자별 동작을 하는 훅을 등록하지 않는다.
