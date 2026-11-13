---
name: frontend-convention-review
description: 바뀐 프런트엔드 코드를 이 프로젝트 컨벤션 중 도구(ESLint, steiger, tsc, Prettier)가 잡지 못하는 판단 항목 기준으로 검토하고 근거와 함께 보고한다. 파일은 고치지 않는다. 사용자가 컨벤션 검토나 리뷰를 요청했을 때 쓴다.
---

# frontend-convention-review

이 문서의 `src/`, `app/` 경로는 웹 앱 기준이다. 단일 앱에서는 프로젝트 루트, 모노레포에서는 각 웹 앱 폴더(`apps/web/`, `apps/client/`, `apps/admin/`) 아래에 대응한다. 검증 명령은 프로젝트 루트에서 실행한다.

읽기 전용 검토다. 파일을 고치거나 커밋하지 않는다. 고칠지는 보고를 본 사용자가 정한다.

## 1. 범위 정하기

```bash
git diff HEAD --name-only --diff-filter=ACMR
git status --short
```

사용자가 범위(브랜치, PR, 파일)를 지정했으면 그것을 쓴다. PR이면 `git diff origin/<base>...HEAD --name-only`. 대상 파일이 없으면 그렇게 보고하고 끝낸다.

## 2. 도구 결과 모으기

기계적으로 검사되는 규칙은 직접 판단하지 않고 도구 결과를 인용한다.

```bash
pnpm lint
pnpm lint:fsd
pnpm format:check
pnpm check-types   # API_BASE_URL 필요
```

| 도구     | 맡는 규칙                                                                                                        |
| -------- | ---------------------------------------------------------------------------------------------------------------- |
| ESLint   | import 정렬, `import type`, `enum` 금지, `src`의 default export 금지, floating·misused Promise, React hooks 규칙 |
| steiger  | `src/` 안의 레이어 방향, slice 공개 API 우회, 세그먼트 이름                                                      |
| tsc      | 타입, `PageProps` 등 라우트 타입                                                                                 |
| Prettier | 포맷, Tailwind 클래스 순서                                                                                       |

실패한 도구는 그 출력을 보고서에 그대로 옮긴다. 실행하지 못한 도구는 이유와 함께 적는다.

## 3. 판단 항목

바뀐 파일마다 해당하는 항목만 본다. 위반이라고 하려면 파일과 줄, 근거 규칙을 댈 수 있어야 한다.

### 라우트와 구조

- [ ] 루트 `app/`의 라우트 파일에 비즈니스 로직이 없다. 페이지 재수출이나 얇은 조합만 있다. params 처리, prefetch와 `HydrationBoundary`는 `_pages`의 페이지 컴포넌트에 있다. **steiger가 `app/`을 검사하지 않으므로 반드시 본다.**
- [ ] 코드가 맞는 레이어에 있다. 동작 하나는 feature, 도메인 개념은 entity, 도메인을 모르는 것만 shared (`nextjs-fsd-architecture §레이어 고르기`).
- [ ] feature 전용 코드가 `shared/`에 들어가지 않았다.
- [ ] 소비처가 하나뿐인데 미리 쪼갠 slice·세그먼트가 없다.
- [ ] slice 공개 API(`index.ts`)가 밖에서 쓰는 것만 내보낸다.
- [ ] `@x`를 꼭 필요한 타입 참조에만 썼다.

### 서버와 클라이언트

- [ ] `'use client'`가 필요한 가장 작은 컴포넌트에만 있다.
- [ ] 서버 전용 코드가 `index.server.ts`로만 공개되고, 클라이언트 쪽 `index.ts`에 섞이지 않았다.
- [ ] 클라이언트 코드가 `@/shared/config`의 `env`나 `process.env`를 읽지 않는다. 환경 변수는 `env.ts` 스키마 한 곳에서만 읽는다. 예외는 AGENTS.md에 적힌 MSW 연결 파일의 `NEXT_PUBLIC_API_MOCKING` 빌드 시점 분기뿐이다.
- [ ] 새 환경 변수가 스키마, `.env.example`, CI `env`에 함께 추가됐다.

### API와 에러

- [ ] 요청이 `@/shared/api`·`@/shared/api/index.server`의 메서드를 쓴다. 인스턴스 직접 호출이나 새 axios 인스턴스는 이유가 있다.
- [ ] 응답·body 타입이 제네릭으로 명시됐다.
- [ ] URL 상수가 소유 slice의 `api/`에 있고, 근거 없는 `/api`·버전 prefix가 없다.
- [ ] 에러 처리가 `ApiError`로 좁혀 `status`·`code`로 분기하고, 다른 에러를 삼키지 않는다.
- [ ] `setOnUnauthorized` 훅을 바꿨다면, 훅 안의 요청은 인터셉터가 없는 인스턴스로 보낸다.

### 데이터와 폼 (`data-and-forms`)

- [ ] 조회는 `<리소스>Queries` 팩토리(`queryOptions`)를 거치고 key는 `all()`에서 시작한다. 문자열 배열 key를 직접 쓰지 않는다.
- [ ] 컴포넌트가 팩토리 옵션을 `useQuery` 등에 직접 넘긴다. 로직 없이 `useQuery` 한 줄만 감싼 조회 훅을 만들지 않았다. mutation 훅 이름은 HTTP 메서드가 아니라 동작이다(`useUpdateProfile`).
- [ ] 서버 prefetch가 팩토리 옵션을 펼치고 `queryFn`만 서버 함수로 바꾼다. prefetch는 `await`한다.
- [ ] mutation의 무효화 범위가 영향받는 가장 좁은 key다.
- [ ] 폼 스키마가 `...Schema`, 요청 타입이 `z.infer`로 만든 `...Request`이다. 같은 타입을 손으로 다시 쓰지 않았다.
- [ ] 폼 제출이 mutation을 거치고, `ApiError`를 필드 또는 `root` 에러로 보여 준다.

### 컴포넌트와 스타일

- [ ] 네이밍: 컴포넌트 파일 PascalCase, 그 밖의 파일 camelCase, slice 폴더 kebab-case, props 타입은 `...Props`, 그 밖의 타입은 `Type` 같은 종류 접미사 없음.
- [ ] 컴포넌트가 화살표 함수다. (named export는 ESLint가 검사한다.)
- [ ] 필요 없는 상태·`useEffect`·메모이제이션이 없다(React Compiler가 켜져 있다).
- [ ] 정적 클래스는 문자열이고, `cn()`은 조건부 클래스나 외부 `className` 병합에만 쓴다.
- [ ] 반복되는 클래스 조합은 컴포넌트로 뽑았고, 크기·색 같은 variant는 `cva`로 정의했다. 클래스 문자열 상수(`styles.ts` 등)를 만들지 않았다. 외부 `className`은 `cn(variants(...), className)`으로 병합한다.
- [ ] 색·간격 같은 값이 하드코딩되지 않고 `globals.css`의 `@theme` 토큰을 쓴다. 새 토큰은 `@theme`에 추가됐다.
- [ ] 접근성: 입력에 라벨이 연결되고, 버튼·링크가 맞는 요소이며, 이미지에 `alt`가 있다.

### 테스트

- [ ] 바뀐 동작을 확인하는 단위 테스트(`*.test.ts(x)`, 대상 옆)나 E2E(`e2e/*.spec.ts`)가 있다.
- [ ] 테스트가 외부 API나 네트워크에 의존하지 않는다.

## 4. 보고

```text
## 프런트엔드 컨벤션 검토

### 도구 결과
- pnpm lint: 통과
- pnpm lint:fsd: 실패 — <출력 요약>
- ...

### 위반
- `app/users/[id]/page.tsx:12` — 라우트 파일에 데이터 가공 로직 (nextjs-fsd-architecture §라우트 파일). `_pages/user`로 옮긴다.

### 확인 필요
- `src/features/edit-profile/api/useUpdateProfile.ts:20` — `all()` 무효화. 목록 외 영향이 있는지 확인 필요.

### 통과
- 확인한 항목과 근거

### 해당 없음
- 바뀐 파일에 해당하지 않아 보지 않은 항목
```

- 위반마다 가장 작은 수정 방향을 한 줄로 적는다.
- 근거를 댈 수 없는 취향 문제는 위반이 아니라 "확인 필요"에 둔다.
