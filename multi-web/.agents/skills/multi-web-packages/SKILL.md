---
name: multi-web-packages
description: 두 앱(`apps/client`, `apps/admin`)과 공용 패키지(`packages/*`) 사이에서 코드를 공유하거나 옮길 때, `@repo/core`에 slice를 만들거나 앱에서 import할 때, 패키지의 `exports`·ESLint·Tailwind·`transpilePackages` 설정이나 두 앱의 `next.config.ts`를 바꿀 때 쓴다. core의 공개 경로, 레이어별 import 제한, `@x`, core로 옮기는 순서, 패키지별 설정 규칙을 담는다.
---

# multi-web-packages

`AGENTS.md §패키지 경계`의 핵심 규칙을 전제로 한 상세 가이드다. 아래 예의 `user` 같은 이름은 설명용이며 템플릿에 없는 코드다.

## core의 공개 경로

- core는 두 앱 이상이 함께 쓰는 FSD 레이어 `widgets → features → entities → shared`를 가진다. `widgets`, `features`, `entities`는 `.gitkeep`만 있는 빈 레이어로 시작한다.

  | import                               | 대상                                                      |
  | ------------------------------------ | --------------------------------------------------------- |
  | `@repo/core/shared/<segment>`        | shared 세그먼트의 `index.ts`(예: `@repo/core/shared/api`) |
  | `@repo/core/shared/<segment>/server` | shared 세그먼트의 `index.server.ts`(서버 전용)            |
  | `@repo/core/entities/<slice>`        | entity의 `index.ts`(클라이언트 안전)                      |
  | `@repo/core/entities/<slice>/server` | entity의 `index.server.ts`(서버 전용)                     |
  | `@repo/core/features/<slice>`        | feature의 `index.ts`(`/server`는 `index.server.ts`)       |
  | `@repo/core/widgets/<slice>`         | widget의 `index.ts`(`/server`는 `index.server.ts`)        |

- shared 세그먼트(`api`, 이후 `config`·`lib` 등)와 entity·feature·widget slice는 앱과 같은 공개 API 구조(`index.ts`, 필요할 때 `index.server.ts`)를 따르므로 새로 만들어도 `exports`를 고칠 필요가 없다. 공개 파일 안쪽 경로(`@repo/core/entities/user/model` 등)는 import하지 않는다. 와일드카드가 여러 단계 경로도 받으므로 하위 폴더에 `index.ts`를 만들면 그 경로도 열린다는 점에 주의한다.
- core의 slice도 앱과 같은 slice 구조(세그먼트, `index.ts`, 필요할 때 `index.server.ts`)를 따른다. 서버 전용 구현에는 `import 'server-only'`를 붙이고 `index.ts`에 섞지 않는다.
- core에는 env를 넣지 않는다. 앱별 `shared/api`가 core 팩토리에 baseURL을 넣고 `get`, `post`, `getQueryClient` 등을 같은 이름으로 공개한다.

## 앱에서 core를 import할 때

- 같은 레이어 금지의 뜻: 앱 feature는 core feature를 쓸 수 없고 widgets 이상에서 조합하며, 앱 widget은 core widget을 쓸 수 없고 `_pages` 이상에서 조합한다. steiger는 패키지 import를 보지 않으므로 이 규칙은 `@repo/eslint-config/next`가 레이어별로 막는다. core 안의 레이어 규칙은 core의 `lint:fsd`(steiger)가 검사한다.
- 앱 entity가 core entity를 참조할 때만 `@x`를 쓴다. core entity가 `entities/<slice>/@x/<소비 slice>/index.ts`를 공개하고 앱 entity는 `@repo/core/entities/<slice>/@x/<소비 slice>`로 import한다. 그 밖의 `@repo/core/entities/*` import는 앱 entity에서 ESLint가 막는다.

## core로 옮길 때

- slice를 core로 옮길 때는 slice 폴더를 core의 같은 레이어로 옮기고 import를 `@/<layer>/<slice>`에서 `@repo/core/<layer>/<slice>`로 바꾼다. core slice는 core 안의 아래 레이어만 쓸 수 있으므로(패키지는 앱을 import하지 못한다) 위젯을 옮기려면 그 위젯이 쓰는 feature·entity를 먼저 옮긴다.
- 데이터 없이 생김새만 같은 것(버튼 같은 기본 컴포넌트, 레이아웃 틀, 슬롯을 받는 셸)은 core의 `shared/ui` 세그먼트에 컴포넌트별 폴더로 두고(`@repo/core/shared/ui/<component>`) 내용은 각 앱이 props·children으로 넣는다. 상태·이벤트가 있는 컴포넌트 파일에만 `'use client'`를 붙인다. 테스트는 옆에 `*.test.tsx`로 두며 core의 Vitest도 앱과 같은 jsdom·Testing Library 환경이다. 도메인 데이터나 동작이 들어가면 shared가 아니라 entity·feature·widget이다. 별도 UI 패키지는 두지 않는다. 다른 레포와 디자인 시스템을 공유하거나 빌드 산출물로 배포해야 할 때만 분리를 다시 검토한다.

## 패키지별 설정

- ESLint는 앱이 `@repo/eslint-config/next`, React 코드를 담는 패키지(core)가 `@repo/eslint-config/react`를 쓴다. `react`는 Next 전용 규칙과 앱 전용 FSD 규칙을 빼고 React·hooks·접근성 규칙을 `next`와 같게 켠다. 두 설정의 규칙 집합은 `packages/eslint-config/react.test.mjs`가 비교하므로, 한쪽만 바꾸면 테스트가 실패한다. React가 없는 패키지(mocks)는 `base`를 쓴다.
- `cn`은 `@repo/core/shared/lib`가 제공한다(single의 `@/shared/lib`과 같은 위치). 앱에서 소스를 그대로 쓰는 패키지는 `transpilePackages`에 넣는다(현재 core, mocks).
- 공통 토큰과 core 소스 수집(`@source '../core/src'`)은 `@repo/tailwind-config/shared-styles.css`, PostCSS는 `@repo/tailwind-config/postcss`를 쓴다. 앱의 globals.css는 공통 CSS를 먼저 import하고 그 뒤에 앱 전용 `@theme`만 덮어쓴다.
- `@repo/mocks`는 공통 handler와 시작 함수를 제공한다. 앱의 모킹 배선과 환경 변수는 `api-mocking` 스킬을 따른다.

## 두 앱의 설정 맞추기

- 두 앱의 `next.config.ts`는 같게 유지한다. 모킹 플래그 고정, `/backend` rewrite, 보안 헤더가 들어 있어 한쪽만 바꾸면 두 앱의 동작이 어긋난다. 앱 전용 설정이 필요하면 해당 앱 파일에만 추가하고, 공통 부분은 두 파일에 똑같이 고친다.
