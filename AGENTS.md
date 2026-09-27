# Project Template

Next.js 16 App Router 기반의 **단일 프런트엔드 앱**이다. Feature-Sliced Design(FSD)을 사용하며, 모든 응답과 문서는 한국어로 작성한다.

## 스택

pnpm / Next.js 16 (App Router) / React 19 / TypeScript 5.9 / Tailwind CSS 4 / TanStack Query v5 / axios / ESLint + Prettier.

React Hook Form, zod, shadcn은 현재 의존성이 아니다. 실제 요구가 생기기 전에는 추가하거나 사용하지 않는다.

## 단일 앱 구조

```text
src/
├── app/       Next 라우팅, layout, metadata, Provider, 전역 스타일 (FSD app 겸용)
├── views/     페이지 조합 (FSD pages — Next Pages Router와 충돌해 개명)
├── widgets/   재사용 페이지 섹션
├── features/  사용자 액션, 폼, mutation
├── entities/  도메인 엔티티
└── shared/    공통 API client·server, 설정, 유틸, UI
public/        정적 에셋
scripts/       FSD 의존성 검사
```

- 루트가 `package.json`, `next.config.ts`, `tsconfig.json`, Tailwind·PostCSS·ESLint·Prettier 설정을 소유한다.
- `src/widgets`, `src/features`, `src/entities`는 현재 비어 있다. 실제 도메인 코드가 생길 때만 slice를 추가한다.
- 앱의 `public/`과 로컬 `.env.local`은 루트에 둔다. 실제 환경·자격 증명 파일을 읽거나 커밋하지 않는다.
- 기존 라우트·공개 API를 사용자 요청 없이 삭제하거나 이름을 바꾸지 않는다.

## 아키텍처 — Feature-Sliced Design

FSD 레이어는 하나의 `src/` 안에 둔다. 세그먼트는 필요한 경우에만 만든다: `ui/` 컴포넌트 · `model/` 타입·훅·스키마·상수 · `api/` 요청 함수 · `lib/` slice 전용 유틸 · `config/` 설정.

- 도메인 엔티티는 `src/entities/<slice>`에 둔다.
- 범용 primitive는 `src/shared/ui`, 도메인 UI는 해당 entity·feature의 `ui/`가 소유한다. `src/shared/ui/index.ts`는 아직 비어 있으므로 없는 컴포넌트를 import하지 않는다.
- feature 전용 코드를 `shared/`에 넣지 않는다.

### 의존성 규칙

- `app → views → widgets → features → entities → shared` 방향으로만 import한다.
- 같은 레이어의 다른 비즈니스 slice를 import하지 않는다. 불가피한 entity 관계만 `entities/<slice>/@x/<consumer>` 공개 API를 통해 허용한다.
- `app`·`shared`는 비즈니스 slice로 나뉘지 않으므로 각 레이어 내부 세그먼트 간 import가 가능하다.
- `src/app/**/page.tsx`는 얇은 라우트로 유지하고 페이지 구현은 `src/views`에 둔다. Server Component라는 이유로 비즈니스 로직을 라우트에 넣지 않는다.
- 다른 slice의 내부 경로를 직접 import하지 않는다. 공개 `index.ts`, 서버 전용인 경우 `index.server.ts`를 사용한다.
- `pnpm lint:fsd`는 Steiger와 `scripts/check-fsd-dependencies.mjs`를 함께 실행한다. 후자가 비표준 `views` 레이어, 같은 레이어 slice 참조와 동적 `import()`도 검사한다.

## 빌드 모델

- Next.js 앱을 루트 `pnpm dev`·`pnpm build`로 실행한다.
- 전역 Provider는 `src/app/providers.tsx`, layout·metadata는 `src/app/layout.tsx`, 전역 Tailwind 진입점은 `src/app/globals.css`에 있다. 새 앱이나 중복 전역 스타일 진입점을 만들지 않는다.

## 네이밍

| 구분                   | 규칙                 | 예                                    |
| ---------------------- | -------------------- | ------------------------------------- |
| slice 폴더             | kebab-case           | `sample-feature/` (예시)              |
| 컴포넌트·에셋 컴포넌트 | PascalCase           | `ui/HomeView.tsx`, `Logo.tsx`         |
| 유틸·훅·타입 파일      | camelCase            | `useDebounce.ts`, `cn.ts`             |
| props                  | PascalCase + `Props` | `SampleCardProps`                     |
| 응답·요청 타입         | PascalCase + `Type`  | `SampleResponseType`, `SampleReqType` |

예시 이름은 구현돼 있는 모듈이나 API 계약을 뜻하지 않는다.

## Import / Export

- 각 비즈니스 slice는 외부 API를 `index.ts`에서 공개하고, 서버 전용 코드는 `index.server.ts`로 분리한다. 클라이언트 배럴에 `server-only`를 섞지 않는다.
- 브라우저 API는 `@/shared/api`, 서버 API는 `@/shared/api/index.server`에서 import한다. `@/*`는 `tsconfig.json`에 따라 루트 `src/*`를 가리킨다.
- `cn`은 `@/shared/lib`의 공개 export를 사용한다. 아직 존재하지 않는 UI 컴포넌트를 가정하지 않는다.
- import 정렬은 ESLint `simple-import-sort`가 관리한다. 현재 설정의 그룹은 `react` → `next/*` → 그 밖의 외부 패키지 → `@/*` → 상대경로다.

```ts
// src/views/home/index.ts — 실제 공개 진입점
export { default as HomeView } from './ui/HomeView';

// 소비처: src/app/page.tsx
import { HomeView } from '@/views/home';
```

## 타입

- 객체 형태는 `interface`, 단순 유니온은 `type`을 사용한다.
- 타입명은 PascalCase다. props는 `...Props`, 나머지 도메인 타입은 `...Type`으로 끝낸다.
- `enum`은 사용하지 않는다. 유니온과 `Record` const 객체로 메타데이터를 정의한다.

```ts
// 상태 모델이 필요할 때의 예시
export type LoadStateType = 'idle' | 'loading' | 'success';

const LOAD_STATE_META: Record<LoadStateType, { label: string }> = {
  idle: { label: '대기' },
  loading: { label: '로딩 중' },
  success: { label: '완료' },
};
```

## 컴포넌트

- 화살표 함수와 props 구조 분해를 사용한다. 도메인 컴포넌트는 default export하고 소유 slice의 `index.ts`에서 공개한다. 범용 UI primitive가 생기면 named export를 사용한다.
- 컴포넌트 내부 순서는 변수·훅 → 핸들러·기타 로직 → `useEffect`(필요할 때만) → return이다. 상태나 effect가 필요 없는데 관례를 맞추기 위해 추가하지 않는다.

```tsx
// src/views/home/ui/HomeView.tsx의 현재 형태
const HomeView = () => {
  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <h1 className="text-2xl font-semibold">Project Template</h1>
    </main>
  );
};

export default HomeView;
```

## 스타일링

- 조건부 클래스 또는 외부 `className` 병합이 있을 때만 `cn()`을 사용한다. 정적 클래스는 문자열로 작성한다.
- 클래스명은 가능한 한 하나의 문자열로 유지한다. 반복되는 클래스만 소유 slice의 `ui/styles.ts` 상수로 분리한다.
- 토큰과 공통 CSS는 실제 전역 스타일인 `src/app/globals.css`가 소유한다. 현재는 Tailwind `@import 'tailwindcss'`만 있다. 앱 전역 글꼴도 앱 레이어에서 관리한다.

```tsx
// ❌ 조건이 없는데 cn()
className={cn('flex items-center gap-2')}

// ✅ 정적 클래스
className="flex items-center gap-2"

// ✅ 조건부 클래스 또는 외부 className 병합
className={cn('flex gap-2', isActive && 'bg-primary')}
className={cn('rounded-lg px-4', className)}
```

## API

### 인스턴스와 경계

| 용도                    | 모듈                        | baseURL        | 인증                                                             |
| ----------------------- | --------------------------- | -------------- | ---------------------------------------------------------------- |
| 브라우저                | `@/shared/api`              | `/backend`     | 현재 토큰·refresh 인터셉터 없음                                  |
| 서버(RSC·Server Action) | `@/shared/api/index.server` | `API_BASE_URL` | `server-only`로 클라이언트 import 차단, 현재 쿠키·인증 처리 없음 |

브라우저의 `/backend/*`는 루트 `next.config.ts` rewrite를 통해 `API_BASE_URL`로 전달한다. Next Route Handler에는 `/api/*` 경로를 남겨 둔다. 실제 백엔드 계약 없이 인증·쿠키 전달·401 재시도·리다이렉트를 추가하지 않는다.

### 메서드 래퍼

`@/shared/api`와 `@/shared/api/index.server`의 `get / post / patch / put / del`을 사용한다. 각 래퍼는 Axios 응답의 `.data`를 반환한다. **응답 인터셉터가 아니라 메서드 구현**에서 데이터를 꺼내므로, 일반 요청에 Axios 인스턴스를 직접 호출해 반환 타입을 혼동하지 않는다. 직접 호출이 필요하면 그 반환값은 `AxiosResponse`라는 차이를 확인한다.

`Parameters<typeof ...>` 기반 메서드의 body 인자는 엄격히 추론되지 않는다. 요청 타입은 실제 검증 스키마나 명시적 `...ReqType` 변수로 관리한다.

### URL 상수

URL 상수는 해당 entity 또는 feature의 `api/`에 둔다. 서버 API의 실제 path 규약을 따르며, 근거 없이 `/api` 또는 버전 prefix를 추가하지 않는다. 현재 도메인 API URL·공용 인증 URL은 정의돼 있지 않다.

## TanStack Query

훅은 `useGet<리소스>` / `usePost<리소스>` / `usePatch<리소스>` / `usePut<리소스>` / `useDelete<리소스>`로 이름 짓는다. Query key는 계층 배열과 `all()` 루트를 사용해 필요한 범위만 무효화한다. 현재는 `src/app/providers.tsx`에 QueryClient만 있고 도메인 query hook은 없다.

```ts
// 도메인 쿼리 추가 시의 예시
export const resourceQueryKeys = {
  all: () => ['resources'] as const,
  list: () => ['resources', 'list'] as const,
  detail: (id?: number) => ['resources', 'detail', id] as const,
} as const;
```

## zod

zod는 설치되지 않았다. 도입이 승인되면 스키마는 `<이름>Schema`, 추론 요청 타입은 `...ReqType`으로 이름 짓는다. 스키마를 도입하기 전에는 이를 전제로 한 폼·API 추상화를 만들지 않는다.

## 검증

변경 후 루트에서 범위에 맞는 검증을 실행한다. Next 설정이 환경값을 요구하므로 type check와 build에는 `API_BASE_URL`이 필요할 수 있다. CI도 peer·lint·FSD·포맷·타입·빌드 검사를 실행한다.

```bash
pnpm peers check
pnpm lint
pnpm lint:fsd
pnpm format:check
API_BASE_URL=http://localhost:8080 pnpm check-types
API_BASE_URL=http://localhost:8080 pnpm build
```

FSD 경계·공개 API·서버/클라이언트 경계를 바꿨다면 최소한 `lint:fsd`, type check, build를 확인한다. 검사 실행 실패나 생략은 그대로 보고한다.

## 에이전트 작업 규칙

- 커밋·푸시·PR 생성·리뷰 답글은 사용자가 요청한 경우에만 수행한다. 기존 브랜치와 작업 트리의 변경을 보존한다.
- 토큰·자격 증명 파일을 열거나 노출하지 않는다. 로컬 `.env.local`도 작업 대상에서 제외한다.
- Hermes를 사용할 때 관련 작업은 `.hermes/skills/`의 절차와 연결된 `references/`, `scripts/`를 확인한다.

## 알려진 트레이드오프

- 아직 토큰 저장·갱신과 인증 리다이렉트가 없다. 인증 도입 시 쿠키와 Route Handler/BFF 경계가 필요한지 실제 요구에 따라 검토한다.
- FSD `app` 레이어를 Next `src/app`과 합쳤고, FSD `pages`는 `views`로 이름을 바꿨다. 라우팅·layout·Provider를 한곳에 유지하기 위한 선택이다.
- FSD `shared`의 API·config·lib·UI는 모두 `src/shared`에 있다.
