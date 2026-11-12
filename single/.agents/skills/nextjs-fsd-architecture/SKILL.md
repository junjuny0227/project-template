---
name: nextjs-fsd-architecture
description: 이 프로젝트의 Next.js App Router + Feature-Sliced Design 구조 상세 가이드. 코드를 어느 레이어·slice·세그먼트에 둘지 정하고, 공개 API와 서버·클라이언트 경계를 설계하고, 라우트 파일을 얇게 유지하고, steiger 결과를 해석할 때 쓴다.
---

# nextjs-fsd-architecture

`AGENTS.md §FSD 규칙`의 핵심 규칙을 전제로 한 상세 가이드다. 구조는 FSD 공식 Next.js 가이드를 따른다.

## 전체 구조

```text
app/                      Next 라우트 (FSD 밖, steiger 검사 대상 아님)
src/
├── _app/                 app 레이어: Provider, 전역 스타일
├── _pages/               pages 레이어: 라우트 하나에 대응하는 화면
├── widgets/              화면의 큰 독립 블록
├── features/             사용자 동작 하나 (폼, 버튼과 그 mutation)
├── entities/             도메인 개념 (사용자, 게시글)과 그 조회
└── shared/               도메인을 모르는 공통 코드 (api, config, lib, ui)
```

- Next는 `src/app`과 `src/pages`를 라우터 폴더로 읽는다. 그래서 FSD `app`·`pages` 레이어 폴더에 밑줄을 붙였고, steiger(`@feature-sliced/filesystem`)는 밑줄을 떼고 레이어로 인식한다.
- 루트 `app/`은 Next 라우팅 전용이다. FSD 관점에서는 `_app` 위에서 모든 레이어를 조합하는 자리다.

## 레이어 고르기

위에서부터 물어보고 처음 맞는 레이어에 둔다.

| 질문                                                           | 레이어     |
| -------------------------------------------------------------- | ---------- |
| 앱 전체에 한 번 적용되는가? (Provider, 전역 CSS, 전역 설정)    | `_app`     |
| 라우트 하나의 화면 전체인가?                                   | `_pages`   |
| 여러 화면에 들어가는 큰 블록이고 여러 feature·entity를 묶는가? | `widgets`  |
| 사용자가 하는 동작 하나인가? (프로필 수정, 좋아요, 로그아웃)   | `features` |
| 도메인 개념과 그 표시·조회인가? (사용자 카드, 사용자 조회)     | `entities` |
| 도메인을 전혀 모르는가?                                        | `shared`   |

- 처음에는 `_pages` 안에 두고 시작해도 된다. 두 번째 화면이 같은 코드를 쓰게 될 때 아래 레이어로 내린다. 미리 쪼개지 않는다.
- steiger의 `fsd/insignificant-slice`는 소비처가 하나뿐인 slice를 알린다. 이 경고가 나오면 그 소비처 안으로 합칠지 먼저 검토한다.
- feature가 다른 feature를 써야 한다면 둘을 묶는 widget이나 page에서 조합한다.

## slice와 세그먼트

- slice 이름은 kebab-case 도메인 이름이다(`user`, `edit-profile`). `_app`과 `shared`는 slice 없이 세그먼트만 둔다.
- 세그먼트는 목적으로 이름 짓는다. `components`, `hooks`, `utils`, `types` 같은 종류 이름은 쓰지 않는다(steiger `fsd/segments-by-purpose`).

| 세그먼트  | 담는 것                                           |
| --------- | ------------------------------------------------- |
| `ui/`     | 컴포넌트, `styles.ts`(반복 클래스 상수)           |
| `model/`  | 타입, 스키마, 상수, 상태 훅                       |
| `api/`    | URL 상수, 요청 함수, query key, query·mutation 훅 |
| `lib/`    | 그 slice 전용 유틸                                |
| `config/` | 설정 값                                           |

## 공개 API

- slice마다 `index.ts`를 두고 밖에서 쓰는 것만 이름을 붙여 export한다. 밖에서는 이 파일로만 import한다(steiger `fsd/no-public-api-sidestep`).
- 서버 전용 코드(`server-only`, `@/shared/api/index.server` 사용)는 `index.server.ts`로 따로 공개한다. 클라이언트 컴포넌트가 import하는 `index.ts`에 섞으면 빌드가 실패한다.
- 같은 slice 안에서는 상대 경로로 import한다.

```ts
// src/entities/user/index.ts
export { useGetUser } from './api/useGetUser';
export { userQueryKeys } from './api/userQueryKeys';
export type { UserResponseType } from './model/types';

// src/entities/user/index.server.ts
export { getUserOnServer } from './api/getUserOnServer';
```

### entity 사이 참조 (`@x`)

entity끼리는 원칙적으로 import하지 않는다. 한 entity의 타입이 다른 entity에 꼭 필요할 때만 제공하는 쪽에 `@x/<소비 slice>.ts`를 만든다.

```ts
// src/entities/user/@x/post.ts — post entity만 쓰는 공개 API
export type { UserResponseType } from '../model/types';

// src/entities/post/model/types.ts
import type { UserResponseType } from '@/entities/user/@x/post';
```

`@x`가 늘어나면 entity 경계가 잘못 그어졌다는 신호다. 두 entity를 합치거나 조합을 위 레이어로 올린다.

## 라우트 파일

루트 `app/`의 파일은 Next가 요구하는 것만 한다.

| 파일                                        | 하는 일                                                            |
| ------------------------------------------- | ------------------------------------------------------------------ |
| `layout.tsx`                                | `<html>`·`<body>`, `metadata`, Provider와 전역 CSS import          |
| `page.tsx`                                  | `_pages`의 페이지 컴포넌트를 재수출                                |
| `loading.tsx`, `error.tsx`, `not-found.tsx` | `_pages`나 `widgets`의 컴포넌트를 렌더                             |
| `route.ts`                                  | Route Handler. `/api/*` 아래에 둔다(`/backend/*`는 rewrite가 쓴다) |

```tsx
// 재수출만 하는 경우
export { HomePage as default } from '@/_pages/home';

// app/users/[id]/page.tsx — params 처리는 _pages의 async Server Component에서 한다
export { UserPage as default } from '@/_pages/user';
```

- `PageProps<'/경로'>`, `LayoutProps`는 `next typegen`(`pnpm check-types`에 포함)이 만드는 전역 타입이다.
- 데이터 prefetch와 `HydrationBoundary`는 `src/_pages/<slice>/ui/`의 async Server Component가 맡는다. `getQueryClient`는 서버·클라이언트에서 모두 쓸 수 있는 `@/shared/api`의 공개 API다. 루트 `app/` 라우트는 재수출만 한다. 절차는 `data-and-forms` 스킬에 있다.
- 라우트 파일에 넣지 않는 것: 데이터 가공, 조건 분기, 상태, 이벤트 핸들러, 스타일 마크업. **steiger는 루트 `app/`을 검사하지 않으므로** 리뷰에서 직접 본다.

## 서버와 클라이언트

- 기본은 Server Component다. `'use client'`는 상태·이벤트·브라우저 API가 필요한 가장 작은 컴포넌트(보통 feature의 `ui/`)에만 붙인다.
- `@/shared/config`의 `env`는 서버에서만 읽는다. 클라이언트 번들에 들어가면 검증이 실패한다.
- 브라우저 요청은 `@/shared/api`(`/backend` 경유), 서버 요청은 `@/shared/api/index.server`를 쓴다.

## steiger

- `pnpm lint:fsd`는 `steiger ./src --fail-on-warnings`다. 경고도 실패로 본다.
- 현재 설정(`steiger.config.mjs`)은 `recommended`에 예외 두 개를 둔다.
  - `fsd/typo-in-layer-name`: `src/_app/**`, `src/_pages/**`에서 끈다. 규칙이 밑줄 붙은 폴더 이름을 오타로 본다.
  - `fsd/segments-by-purpose`: `src/_app/providers/**`에서 끈다. app 레이어에서 관례로 쓰는 이름이다.
- 예외는 실제 위반이 나왔고 구조를 바꾸는 것이 더 나쁠 때만, 가장 좁은 `files` 범위와 한국어 이유 주석을 달아 추가한다.
- 자주 보는 규칙:

| 규칙                         | 뜻                                          | 보통의 해결                          |
| ---------------------------- | ------------------------------------------- | ------------------------------------ |
| `fsd/forbidden-imports`      | 위 레이어나 같은 레이어 다른 slice를 import | 조합을 위 레이어로 올리거나 `@x`     |
| `fsd/no-public-api-sidestep` | slice 내부 경로를 직접 import               | `index.ts`에서 export하고 그걸 쓴다  |
| `fsd/insignificant-slice`    | 소비처가 하나뿐인 slice                     | 소비처 안으로 합친다                 |
| `fsd/segments-by-purpose`    | 종류 이름 세그먼트(`hooks` 등)              | 목적 이름(`model`, `lib`)으로 바꾼다 |

## 새 기능을 넣는 순서 (예: 프로필 수정)

1. 화면이 없으면 `src/_pages/<slice>`와 `app/<경로>/page.tsx`를 만든다.
2. 조회할 도메인 데이터가 있으면 `src/entities/<slice>`에 타입, URL, query key, 조회 훅을 둔다.
3. 사용자 동작은 `src/features/<slice>`에 스키마(`model/`), mutation 훅(`api/`), 폼(`ui/`)으로 둔다.
4. 각 slice의 `index.ts`(필요하면 `index.server.ts`)에서 공개한다.
5. `_pages`에서 조합하고, 라우트 파일은 얇게 둔다.
6. `pnpm lint:fsd`, `pnpm check-types`, 관련 테스트를 돌린다.
