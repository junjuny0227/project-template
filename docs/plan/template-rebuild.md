# project-template 재구축 기획

> 상태: 요구사항 확정. 구현 계획은 [template-rebuild-implementation.md](./template-rebuild-implementation.md)에 있고 2026-11-12에 승인됐다. 기존 구성은 커밋 `b07e62f`에 보존되어 있다.

## 목표

- 개인 사이드 웹 프로젝트를 시작할 때 쓰는 템플릿이다.
- 한 저장소에 두 템플릿을 각각 별도 폴더로 담는다.
  - Next.js 기반 단일 웹 앱 템플릿 (현재 구성과 같은 형태)
  - turborepo 기반 모노레포 템플릿: `apps/web`(Next.js)과 `apps/api`(NestJS)를 함께 담는다.

## 제약과 비목표

- 기본 포함 범위는 얇은 골격과 강한 품질 게이트다. 단위 테스트, E2E 테스트, 아키텍처 경계 검사, CI를 처음부터 갖춘다.
- 얇은 골격의 뜻(Q36): 도메인 코드는 넣지 않는다. 다만 어느 프로젝트에서든 결국 쓰게 되고 설정이 필요한 라이브러리(axios 인스턴스와 인터셉터, TanStack Query, Prisma 등)는 설치와 설정까지 끝낸 상태로 기본 제공한다.
- 비목표: 도메인 기능은 템플릿에 넣지 않는다. 화면, 도메인 API, Prisma 모델, 토큰 발급·로그인 흐름이 해당한다.
  - 폼과 검증(zod, react-hook-form)은 Q38에 따라 기본으로 넣는다.
  - JWT 검증 가드 골격은 Q39에 따라 모노레포 api에 넣는다.
  - shadcn/ui, zustand, sonner, throttler는 넣지 않는다.
  - 예외(Q31): 모노레포 `apps/api`에는 인프라를 넣는다. DB(Prisma + PostgreSQL), 전역 예외 필터, 로깅, Swagger, health다. 도메인 모델은 넣지 않는다.
- 배포 방식: 새 프로젝트는 GitHub "Use this template" 또는 clone으로 레포 전체를 가져온 뒤 루트의 `setup.sh`를 실행해 시작한다.
  - 스크립트는 두 템플릿 중 하나를 고르게 한다. 고른 폴더의 내용(숨김 파일 포함)을 루트로 옮기고, 고르지 않은 폴더와 템플릿 레포 전용 파일을 삭제한 뒤, 스크립트 자신도 삭제한다.
  - 템플릿 레포 전용 파일은 스크립트 안의 명시적 목록으로만 지운다. 와일드카드로 지우지 않는다.
  - 안전장치:
    - 템플릿 레포 상태에서만 실행된다(두 템플릿 폴더가 모두 있을 때).
    - 작업 트리가 깨끗하지 않으면 거부한다.
    - 실행 전에 확인을 받는다. 비대화식 실행은 `--yes`로 한다.
    - `.git`은 건드리지 않는다.
  - macOS 기본 bash 3.2와 호환되게 작성한다.
- 각 템플릿 폴더는 레포 루트나 다른 폴더의 파일을 참조하지 않는 자립형이어야 한다. 선택한 폴더가 루트로 올라온 뒤 혼자 동작해야 하기 때문이다.
- 레포 루트는 `setup.sh`, 두 폴더를 검증하는 CI와 스크립트, 기획 문서만 가진다.
- 비목표: 템플릿 선택·정리 외의 일을 하는 create CLI는 만들지 않는다. 프로젝트명 치환, 의존성 설치, `git init` 같은 일은 하지 않는다.
- 스택은 현재 구성을 유지한다: Next.js, React, TypeScript, Tailwind CSS, TanStack Query, axios, FSD, ESLint + Prettier. 여기에 Vitest(단위)와 Playwright(E2E)를 추가한다.
  - axios를 유지하므로 두 가지를 따로 챙긴다. 렌더링 중 중복 요청 제거는 `'use cache'`나 React `cache()`로 처리한다. 공급망 리스크는 axios 버전 고정과 pnpm `minimumReleaseAge` 7일(Q27)로 완화한다.
- 에이전트 하네스: 각 템플릿 폴더 안에 `AGENTS.md`와 스킬을 한 벌만 둔다. 도구별 파일(`CLAUDE.md` 등)은 그 원본을 가리키는 얇은 링크로만 둔다.
- 비목표: 외부 harness sync, 그리고 도구별로 스킬 사본을 따로 두는 방식은 쓰지 않는다.

## 가정 (계획 단계에서 확정)

- 모노레포 템플릿은 `apps/web`(Next.js, FSD)과 `apps/api`(NestJS) 두 앱과 공용 패키지 세 개(`typescript-config`, `eslint-config`, `ui`)로 시작한다(Q26, Q31).
- FSD 경계 검사는 steiger만 쓴다(Q8). 모노레포에서는 `apps/web`에만 적용한다.
- E2E 테스트는 외부 서비스 없이 돌아가야 한다. `single`은 홈 화면 스모크 테스트를, 모노레포는 web → api → DB 풀스택 스모크 테스트를 둔다. DB는 템플릿에 포함된 docker compose로 띄운다.

## 성공 기준

- 루트 CI가 레포 전체를 레포 바깥의 빈 디렉터리로 복사한다(추적 중인 파일만). 복사본에서 `setup.sh <템플릿> --yes`를 실행하고, 그 결과물에서 의존성 설치 후 lint, 아키텍처 경계 검사, 타입 검사, 단위 테스트, E2E 테스트, 빌드가 모두 통과하면 완성으로 본다.
- 이 검사는 두 템플릿 각각에 대해 실행한다.
- `setup.sh` 실행 뒤에는 고르지 않은 폴더, 템플릿 레포 전용 파일, `setup.sh` 자신이 남아 있지 않아야 한다.

## 확인 내역

- Q1. 이 템플릿으로 주로 어떤 프로젝트를 시작하는가? → 개인 사이드 웹 프로젝트. Next.js 단일 웹 템플릿과 turborepo 모노레포 템플릿을 각각 폴더에 담는다.
- Q2. 새 프로젝트를 시작할 때 처음부터 들어 있어야 하는 범위는? → 얇은 골격과 강한 품질 게이트(단위·E2E 테스트, 경계 검사, CI). 인증·폼 같은 기능은 넣지 않는다.
- Q3. 새 프로젝트는 템플릿을 어떻게 가져가는가? → degit·tiged로 폴더 하나를 복사한다. 각 폴더는 자립형이고, 루트는 검증 CI만 가진다. **(Q7로 대체됨)**
- Q4. 완성 기준은? → 루트 CI가 각 폴더를 레포 밖으로 복사한 뒤 설치, lint, 경계 검사, 타입 검사, 단위·E2E 테스트, 빌드가 모두 통과해야 한다. (Q7에 따라 "레포 전체를 복사한 뒤 `setup.sh` 실행"으로 바뀌었다.)
- Q5. 기술 스택은? → axios를 포함해 현재 스택을 그대로 유지하고, Vitest와 Playwright만 추가한다. (axios를 fetch로 바꾸는 안은 장단점을 검토한 뒤 채택하지 않았다.)
- Q6. 에이전트 규칙과 스킬은 어떻게 관리하는가? → 폴더별로 원본을 하나만 둔다. 각 템플릿에 `AGENTS.md`와 스킬 한 벌을 두고, 도구별 파일은 그것을 가리키는 얇은 링크로 둔다.
- Q7. tiged 대신 루트 `setup.sh`로 템플릿을 고르게 할까? → 채택한다. bash 3.2와 호환되게 쓰고, 위 안전장치를 모두 둔다. Node 스크립트(`setup.mjs`)와 기존 tiged 방식은 채택하지 않았다.
- Q8. FSD 의존성 검사 스크립트를 유지할까? → 제거한다. FSD 공식 문서를 거의 그대로 따르고(Next 라우트는 루트 `app/`, FSD 레이어는 `src/_app`·`src/_pages`), 경계 검사는 steiger만 쓴다. 스크립트를 유지하는 안과 eslint-plugin-boundaries로 교체하는 안은 채택하지 않았다.
- Q9. steiger 설정은? → 예외 없이 `recommended` + `--fail-on-warnings`로 시작하고 0.10으로 올린다. 예외는 실제 위반이 나왔을 때 이유 주석과 함께만 추가한다.
- Q10. `shared/api`는? → 유지하되 정리한다. 인스턴스 2개와 `index`/`index.server` 경계는 유지하고, `createApiMethods` 팩토리로 중복을 없애고, 시그니처를 명시하고, 서버 env를 필수로 검증한다.
- Q11. `/backend` rewrite와 `API_BASE_URL`은? → 필수로 유지한다. env 검증은 `shared/config` 한 곳에서 하고, `.env.example` 값은 `http://localhost:8080`으로 둔다. 선택형과 rewrite 제거안은 채택하지 않았다.
- Q12. `cn` 유틸은? → 유지한다. 모노레포에서는 `@repo/ui`가 제공하고, 사용 규칙과 단위 테스트를 포함한다.
- Q13. 앱 레이어(layout·providers·globals.css)는? → 공식 구조로 옮긴다. 루트 `app/layout`은 얇게 두고 `src/_app/providers`·`styles`를 쓴다. QueryClient는 `getQueryClient` 패턴(서버는 요청별, 브라우저는 싱글턴)으로 만들고, Devtools와 `staleTime` 60초는 유지한다. `useState` 방식을 유지하는 안과 Devtools를 빼는 안은 채택하지 않았다.
- Q14. 홈 페이지 slice는? → 유지하고 이름을 바꾼다. `src/_pages/home`의 `HomePage`로 옮기고, 루트 `app/page.tsx`는 공식 재수출 패턴으로 둔다.
- Q15. ESLint 설정은? → 현재 구성을 유지하고 `no-floating-promises`, `no-misused-promises`, `consistent-type-imports`를 추가한다. 그대로 옮기는 안과 strictTypeChecked 전체를 켜는 안은 채택하지 않았다.
- Q16. Prettier 설정은? → 옵션 값은 유지한다. `tailwindStylesheet`를 `src/_app/styles/globals.css`로 지정하고, `.agents/`를 포맷 대상에 넣고 링크 폴더만 제외한다.
- Q17. `.editorconfig`와 커밋 hook은? → 그대로 유지한다(husky pre-commit + lint-staged). pre-push로 강화하는 안과 hook을 제거하는 안은 채택하지 않았다.
- Q18. 이슈·PR 템플릿은? → 각 템플릿의 `.github/`로 옮긴다. PR 체크리스트에 단위 테스트와 E2E를 추가하고, 드리프트 검사 대상에 포함한다. 루트에만 두는 안과 제거하는 안은 채택하지 않았다.
- Q19. `git-commit` 스킬은? → 규칙과 Git Flow 분기를 유지한다. 컨벤션 문서는 한 벌로 합쳐 `write-pr`이 참조하게 하고, 예시는 프런트엔드 도메인으로 바꾼다.
- Q20. `write-pr` 스킬은? → GitHub 기본 라벨(bug·enhancement·documentation)을 쓰고, base는 `develop`이 있으면 `develop` 아니면 기본 브랜치로 한다. 컨벤션 문서는 `git-commit`을 참조하고 예시를 바꾼다. 라벨 단계를 제거하는 안과 커스텀 라벨을 유지하는 안은 채택하지 않았다.
- Q21. `resolve-reviews` 스킬은? → 유지하되 정리하고 확인 단계를 둔다(판단 기준을 프런트엔드 기준으로, `--paginate`, 임시 파일은 레포 밖, 도구 중립 문구, push·답글 전 확인). 자동 흐름을 유지하는 안과 제거하는 안은 채택하지 않았다.
- Q22. `nextjs-fsd-architecture` 스킬은? → 공식 구조 기준으로 다시 쓴다. 상세 가이드는 스킬에 두고 AGENTS.md에는 핵심 규칙과 링크만 두며, references·scripts 사본은 삭제한다. AGENTS.md로 흡수하는 안과 양쪽에 중복으로 두는 안은 채택하지 않았다.
- Q23. `tailwind-shadcn` 스킬은? → AGENTS.md 스타일링 절로 흡수하고 shadcn 부분과 스킬은 삭제한다. 축소해서 별도 스킬로 남기는 안과 데이터 스킬과 합치는 안은 채택하지 않았다.
- Q24. `tanstack-query-zod` 스킬은? → `tanstack-query` 스킬로 다시 쓴다. zod는 빼고 key 팩토리, 훅 네이밍, RSC prefetch + `HydrationBoundary`, 무효화 범위를 담는다. AGENTS.md에는 네이밍 한 줄과 링크만 두고, `enum` 규칙은 AGENTS.md로 옮긴다. AGENTS.md로 흡수하는 안과 축소해서 그대로 옮기는 안은 채택하지 않았다. **(Q38로 바뀜: 폼이 기본 포함이 되어 `data-and-forms` 스킬로 다시 쓰고 zod·react-hook-form 패턴을 함께 담는다.)**
- Q25. `frontend-convention-validator`는? → `frontend-convention-review` 스킬 하나로 합친다. 도구별 에이전트 정의는 삭제하고, `enum` 금지는 ESLint 규칙으로 옮기며, 스킬에는 판단이 필요한 항목만 남긴다. 도구별 에이전트를 유지하는 안과 제거하는 안은 채택하지 않았다.
- Q26. 모노레포 공용 패키지 구성은? → `typescript-config`, `eslint-config`, `ui`(`cn` 제공) 세 개로 한다. 설정 패키지만 두는 안과 `api`까지 패키지로 분리하는 안은 채택하지 않았다.
- Q27. `minimumReleaseAge`는? → 7일(10080분)로 둔다.
- Q28. 각 템플릿에 들어가는 CI는 언제 실행하는가? → PR과 main push 때 실행한다.
- Q29. §8 판단 중 바꿀 것은? → 폴더 이름만 바꾼다. hook을 옮기지 않는 것, 도구별 설정 파일을 옮기지 않고 Gemini를 빼는 것, 빈 레이어 폴더를 만들지 않는 것은 그대로 확정한다.
- Q30. 두 템플릿 폴더 이름은? → `single`과 `monorepo`로 한다. 도구 이름이 아니라 구조로 지어서 도구를 바꿔도 이름이 유지되게 한다. `next`·`turbo` 안과 `nextjs-single`·`nextjs-monorepo` 안은 채택하지 않았다.
- Q31. 모노레포 앱 구성과 api 범위는? → `apps/web`(Next.js)과 `apps/api`(NestJS)로 구성한다. api에는 최소 골격(health, env 검증, 단위·e2e 테스트)에 더해 DB(Prisma + PostgreSQL, docker compose)와 공통 인프라(전역 예외 필터, 로깅, Swagger)를 넣는다. 도메인 모델은 넣지 않는다. 단, `prisma`와 `@prisma/client`는 7.10.1로 정확히 고정한다(CLI의 `latest` 태그가 RC를 가리키기 때문).
- Q32. web과 api는 어떻게 연결하는가? → `turbo dev`로 두 앱을 함께 띄우고, web의 `API_BASE_URL`은 로컬 api를 가리킨다. 풀스택 스모크 테스트에서 web의 `/backend/health`를 호출해 api와 DB까지 응답이 오는지 확인한다.
- Q33. web과 api가 공유하는 타입 패키지는? → 지금은 두지 않고, API 계약이 생기면 추가한다.
- Q34. api 로깅은? → `nestjs-pino`를 쓴다. 로그는 JSON으로 구조화하고 요청 로그를 남기며, 개발 환경에서는 `pino-pretty`로 출력한다. Nest 내장 Logger는 쓰지 않는다.
- Q35. health는 어디까지 확인하는가? → `@nestjs/terminus`로 Prisma DB 연결까지 확인한다. 프로세스만 확인하는 안과 두 단계로 나누는 안은 채택하지 않았다.
- Q36. 얇은 골격이 어디까지인가? → 도메인 코드는 넣지 않는다. 대신 프로젝트를 하다 보면 어차피 쓰게 되는, 설정이 필요한 라이브러리(axios 인스턴스·인터셉터, TanStack Query, Prisma 등)는 기본으로 모두 갖춘다. Q2의 "인증·폼은 넣지 않는다"는 이 기준으로 다시 판단한다(Q37 이후).
- Q37. axios 인터셉터에 넣을 것은? → 에러 정규화(`AxiosError`를 공통 `ApiError` {status, code, message}로 바꾼다)와 401 처리 지점(인증을 붙일 때 refresh와 재시도를 꽂을 훅)을 넣는다. 클라이언트가 요청 ID 헤더를 만들어 보내는 것과 개발 환경 로깅은 넣지 않는다(응답 헤더의 요청 ID를 읽는 것은 Q42에서 추가).
- Q38. web에 기본으로 넣을 라이브러리는? → zod, react-hook-form, @hookform/resolvers를 넣는다. 이에 따라 Q2의 "폼과 zod는 넣지 않는다"를 뒤집는다. shadcn/ui, zustand, sonner는 넣지 않는다.
- Q39. api에 기본으로 넣을 것은? → 다음 세 가지를 넣는다. 전역 `ValidationPipe`(class-validator, class-transformer, whitelist, transform), helmet과 CORS(허용 origin은 env로 받는다), JWT 인증 골격(passport-jwt 가드와 데코레이터, 토큰 발급은 제외). throttler는 넣지 않는다.
- Q40. JWT 가드는 토큰을 어디서 읽는가? → httpOnly 쿠키에서 읽는다(`cookie-parser`를 쓴다). 같은 출처 프록시 구조와 맞고, XSS가 생겨도 토큰이 노출되지 않는다. Bearer 헤더 방식과 둘 다 받는 방식은 채택하지 않았다.
- Q41. 비어 있는 FSD 레이어 폴더를 미리 만드는가? → 만든다. 기존 템플릿처럼 `src/widgets`, `src/features`, `src/entities`를 미리 두고 각각 `.gitkeep`을 넣는다(모노레포는 `apps/web/src` 아래). Q29의 "빈 레이어 폴더를 만들지 않는다"는 이 결정으로 뒤집는다.
- Q42. web과 api 로그를 요청 ID로 어떻게 연결하는가? → 서버에서만 처리한다. api가 nestjs-pino의 `genReqId`에서 `crypto.randomUUID()`로 ID를 만들어 `X-Request-Id` 응답 헤더로 돌려준다. web 인터셉터는 이 헤더를 읽어 `ApiError.requestId`에 담는다(값이 없으면 `undefined`). 클라이언트가 ID를 생성해 보내는 안과 pino-http 기본 증가 숫자를 그대로 쓰는 안은 채택하지 않았다. pino-http 11.0.0의 기본 ID는 프로세스별 증가 숫자임을 소스로 확인했다.
- Q43. Sentry를 넣는가? → 넣지 않는다. 외부 계정·DSN·소스맵 토큰이 프로젝트마다 필요하고, Next 설정 래핑과 instrumentation 파일이 여러 곳에 퍼지기 때문이다. 대신 api 전역 예외 필터(5xx 단일 경로)와 `X-Request-Id`를 연결 지점으로 두고, 붙이는 절차는 모노레포 AGENTS.md 백엔드 절에 한 줄로 적는다.
- Q44. 백엔드를 따로 두는 프런트엔드 모노레포 템플릿도 두는가? → 둔다(2026-11-12). 세 번째 템플릿으로 추가하고 기존 web + api 모노레포는 유지한다. 앱은 `apps/client`, `apps/admin`이다.
- Q45. 폴더 이름은? → 기존 `monorepo`(web + api)를 `fullstack`으로 바꾸고, 새 프런트엔드 모노레포는 `multi-web`으로 한다. 두 템플릿 모두 모노레포라 `monorepo`라는 이름으로는 구분되지 않기 때문이다. `single`(웹 하나)·`fullstack`(웹 + API)·`multi-web`(웹 여러 개)이 구조를 바로 드러낸다. Q30의 이름 결정은 이것으로 바뀐다. `web-apps`, `frontend`, `multi-app`, 새 것을 `monorepo`로 두는 안은 채택하지 않았다.
- Q46. client와 admin의 공통 API 레이어는? → 공용 패키지 `@repo/api`에 둔다. **(Q49로 바뀜: `@repo/core/src/shared/api`)** axios 인스턴스 팩토리, 인터셉터(ApiError, onUnauthorized), `createApiMethods`, `getQueryClient`를 담는다. 각 앱의 `shared/api`는 env를 연결하는 얇은 층만 둔다. 앱마다 복사하고 drift 검사로 맞추는 안은 채택하지 않았다. 두 앱은 모두 Next.js(FSD)다. admin을 Vite SPA로 두는 안은 채택하지 않았다.
- Q47. 백엔드 없이 개발·E2E를 어떻게 하는가? → MSW(API 모킹)를 기본으로 넣는다. 화면 개발과 E2E를 백엔드 없이 할 수 있게 한다. 홈 스모크만 두는 안은 채택하지 않았다.
- Q48. multi-web의 Tailwind 설정을 공통 패키지로 빼는가? → 뺀다. `@repo/tailwind-config`에 `shared-styles.css`(공통 `@theme` 토큰, `@source` ui)와 PostCSS 설정을 두고 client·admin이 import한다. 앱 전용 토큰은 각 앱 `globals.css`에서 덮어쓴다. 웹 앱이 하나인 `fullstack`에는 적용하지 않는다.
- Q49. multi-web의 공용 코드 패키지는? → `packages/core`(`@repo/core`)에 FSD 하위 레이어(`entities → shared`)를 둔다. Q46의 `@repo/api` 내용은 `core/src/shared/api`로 들어간다. **(공개 경로는 Q54로 바뀜: `@repo/core/shared/api` 등 slice 단위)** entity는 두 앱 이상이 쓰면 core로 올리고, steiger로 core도 검사한다. datagsm-client-v2에서 쓰던 구조를 가져온 것이다. `@repo/api`만 두는 안은 채택하지 않았다.
- Q50. 의존성 버전을 pnpm catalog로 관리하는가? → multi-web과 fullstack 둘 다 catalog를 쓴다. single은 패키지가 하나라 쓰지 않는다. multi-web에만 쓰는 안과 아예 쓰지 않는 안은 채택하지 않았다.
- Q51. fullstack에 `packages/ui`를 두는가? → 두지 않는다. 웹 앱이 하나라 공유 대상이 없고 내용은 `cn` 하나뿐이다. `cn`은 single처럼 `apps/web/src/shared/lib`에 두고, `@source`와 ui CSS 검사도 함께 없앤다. Q26의 공용 패키지 3개는 fullstack에서 `typescript-config`·`eslint-config` 2개가 된다. multi-web은 `packages/ui`를 유지한다.
- Q52. single에도 MSW를 넣는가? → 넣는다. single도 백엔드를 따로 두는 프런트엔드 앱이라 multi-web과 같은 이유(백엔드 없이 화면 개발·E2E)가 적용된다. 패키지가 없으므로 `src/shared/api/mocks/`에 두고, multi-web U4에서 검증한 구성을 그대로 옮긴다. fullstack은 실제 api가 같이 뜨므로 넣지 않는다.
- Q53. `setup.sh`를 템플릿 인자 없이 실행하면? → 터미널에서는 방향키(↑/↓)와 Enter로 고르는 메뉴를 띄운다(2026-11-12). 숫자 키 1–3으로 바로 고르고 q·Esc로 취소한다. 고른 뒤에는 삭제할 항목을 보여 주고 기존 확인 단계를 그대로 거친다. 메뉴는 작업 트리·저장소 상태 검사를 통과한 뒤에 띄운다. `./setup.sh <template> [--yes]` 인자 방식은 CI·검증용으로 유지하고, 비TTY에서 인자 없이 실행하면 사용법을 출력하고 거부한다. 확인 단계 없이 바로 실행하는 안과 인자 방식만 두는 안은 채택하지 않았다.
- Q54. multi-web `@repo/core`의 공개 진입점은? → 루트 배럴(`@repo/core`)과 `@repo/core/server`를 없애고 FSD slice·세그먼트 단위 서브패스로 공개한다(2026-11-12): `./shared/*`, `./shared/*/server`, `./entities/*`, `./entities/*/server`. shared도 와일드카드로 두어 `config`·`lib` 같은 세그먼트를 추가할 때 `exports`를 고치지 않게 한다. 루트 배럴은 entity가 올라오면 레이어 구분 없이 한 이름으로 섞이고, 앱의 shared가 core의 entity를 가져오는 위반을 잡을 수 없기 때문이다. 앱의 `src/shared`에서 `@repo/core/entities/*` import를 ESLint로 막는다. 기존 `/server`는 서버 전용 코드 없이 이름만 바꾼 재수출이라 없앴고, `applyInterceptors`는 내부로 돌렸다. core의 steiger는 앱에서 오는 참조를 볼 수 없어 `fsd/insignificant-slice`를 core entities에서만 끈다. 루트 진입점을 유지하고 일부만 정리하는 안은 채택하지 않았다.
