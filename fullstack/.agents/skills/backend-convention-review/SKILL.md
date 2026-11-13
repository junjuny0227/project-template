---
name: backend-convention-review
description: 바뀐 NestJS API 코드(`apps/api`)를 이 프로젝트 컨벤션 중 도구(ESLint, tsc, 테스트, Prettier)가 잡지 못하는 판단 항목 기준으로 검토하고 근거와 함께 보고한다. 파일은 고치지 않는다. 사용자가 백엔드 컨벤션 검토나 리뷰를 요청했을 때 쓴다.
---

# backend-convention-review

이 문서의 경로는 `apps/api/` 기준이다. 검증 명령은 프로젝트 루트에서 실행한다. 판단 기준은 `nestjs-api` 스킬과 `AGENTS.md`의 백엔드 절이다.

읽기 전용 검토다. 파일을 고치거나 커밋하지 않는다. 고칠지는 보고를 본 사용자가 정한다.

## 1. 범위 정하기

```bash
git diff HEAD --name-only --diff-filter=ACMR -- apps/api
git status --short -- apps/api
```

사용자가 범위(브랜치, PR, 파일)를 지정했으면 그것을 쓴다. PR이면 `git diff origin/<base>...HEAD --name-only -- apps/api`. `src/generated/`는 생성 파일이라 보지 않는다. 대상 파일이 없으면 그렇게 보고하고 끝낸다.

## 2. 도구 결과 모으기

기계적으로 검사되는 규칙은 직접 판단하지 않고 도구 결과를 인용한다.

```bash
pnpm --filter @repo/api lint
pnpm --filter @repo/api check-types
pnpm --filter @repo/api test
pnpm --filter @repo/api test:e2e   # Compose DB 필요
pnpm format:check
```

| 도구     | 맡는 규칙                                                            |
| -------- | -------------------------------------------------------------------- |
| ESLint   | `console` 금지, import 정렬, `import type`, floating·misused Promise |
| tsc      | 타입, `.js` 확장자 누락 등 ESM import 오류                           |
| 테스트   | 예외 필터 응답 형식, 가드·검증·Swagger 운영 비활성화, health         |
| Prettier | 포맷                                                                 |

실패한 도구는 그 출력을 보고서에 그대로 옮긴다. 실행하지 못한 도구(DB 없음 등)는 이유와 함께 적는다.

## 3. 판단 항목

바뀐 파일마다 해당하는 항목만 본다. 위반이라고 하려면 파일과 줄, 근거 규칙을 댈 수 있어야 한다.

### 보안 (가장 먼저 본다)

- [ ] 새 `@Public()`이 정말 로그인 없이 열어야 하는 엔드포인트에만 붙었다. 이유가 코드나 PR에 있다.
- [ ] 사용자 ID를 본문·쿼리·경로가 아니라 `@CurrentUser()`에서 얻는다.
- [ ] 수정·삭제처럼 남의 리소스를 건드릴 수 있는 동작에 서비스의 소유자(권한) 확인이 있다.
- [ ] 응답이 Prisma `select` 또는 응답 DTO로 필드를 골라, 비밀번호 해시·토큰·내부 필드가 나가지 않는다.
- [ ] 로그에 쿠키, 토큰, 비밀번호, 개인 정보 원문이 없다.
- [ ] Swagger 등록 조건(`NODE_ENV !== 'production'`), helmet, CORS `credentials`·`exposedHeaders` 설정을 약하게 바꾸지 않았다.

### 구조와 이름 (`nestjs-api §1, §2`)

- [ ] 기능이 `src/<resource>/`에 모듈·컨트롤러·서비스·`dto/`로 모여 있고, 새 모듈이 `app.module.ts`의 `imports`에 있다.
- [ ] 파일은 kebab-case `<이름>.<종류>.ts`, 클래스는 PascalCase + 종류 접미사(`PostsService`, `CreatePostDto`)다.
- [ ] 컨트롤러에 비즈니스 규칙, Prisma 호출, try/catch가 없다. 서비스가 `Request`·`Response`를 다루지 않는다.
- [ ] 다른 모듈의 기능은 그 모듈의 `exports`된 서비스를 주입받아 쓴다. 다른 모듈 파일을 직접 import하지 않는다. 새 `forwardRef`가 없다.

### REST (`nestjs-api §3`)

- [ ] 경로가 복수형 kebab-case 명사이고 동사가 없다(CRUD 밖의 동작은 `/:id/<동작>` 하위 경로).
- [ ] 상태 코드가 맞다: 생성 201, 삭제 204(`@HttpCode(HttpStatus.NO_CONTENT)`, 본문 없음), 나머지 200.
- [ ] 부분 수정이 `PATCH`다. `PUT`은 전체 교체에만 쓴다.
- [ ] 목록에 페이지네이션과 `limit` 최댓값이 있다.

### DTO와 검증 (`nestjs-api §4`)

- [ ] DTO의 모든 필드에 class-validator 데코레이터가 있다(없으면 그 필드를 보낸 요청이 400이 된다). 선택 필드는 `@IsOptional()`.
- [ ] 숫자·불리언 쿼리에 `@Type(() => Number)` 등 변환이 있다(암묵 변환이 꺼져 있다).
- [ ] 경로 파라미터를 `ParseUUIDPipe`·`ParseIntPipe`로 검증한다.
- [ ] 수정 DTO가 `@nestjs/swagger`의 `PartialType`으로 만들어졌다.
- [ ] 문서에 나올 필드에 `@ApiProperty`가 있고 컨트롤러에 `@ApiTags`가 있다.
- [ ] Prisma 생성 타입을 요청 DTO로 쓰지 않는다.
- [ ] 전역 `ValidationPipe` 옵션(`whitelist`, `forbidNonWhitelisted`, `transform`, 암묵 변환 끔)을 바꾸지 않았다.

### 예외 (`nestjs-api §5`)

- [ ] 서비스가 Nest 내장 HTTP 예외를 던지고, 메시지가 클라이언트에 보여도 되는 문장이다.
- [ ] 예상 가능한 Prisma 오류(`P2002`, `P2025`, `P2003`)를 409·404·400으로 바꾼다. 그 밖의 오류를 삼키지 않는다.
- [ ] 예외를 잡아 로그만 남기고 성공처럼 응답하는 코드가 없다.

### 설정과 로깅 (`nestjs-api §7`)

- [ ] 설정을 `ConfigService.getOrThrow`로 읽고 `process.env`를 직접 읽지 않는다.
- [ ] 새 환경 변수가 `validateEnv`, `.env.example`, CI `env`에 함께 추가됐다.
- [ ] 로그가 주입한 `PinoLogger`/`Logger`로 남고, 맥락이 객체로 전달된다.

### Prisma (`nestjs-api §8`)

- [ ] 스키마를 바꿨다면 새 migration이 함께 있고, 이미 커밋된 migration 파일을 고치지 않았다.
- [ ] 모델 이름이 PascalCase 단수, 필드가 camelCase이고 `createdAt`·`updatedAt`이 있다.
- [ ] 자주 조회하는 필드와 외래 키에 `@@index`가 있다.
- [ ] 여러 테이블을 함께 쓰는 변경이 `$transaction`으로 묶여 있다.
- [ ] `src/generated/prisma`를 직접 고치지 않았다.

### 테스트 (`nestjs-api §10`)

- [ ] 서비스의 분기(404, 403, 409 등)를 확인하는 단위 테스트(`*.spec.ts`)가 있다.
- [ ] 새 엔드포인트마다 e2e에 성공 1건, 검증 실패 1건, 공개 여부(401 또는 `@Public()`) 확인이 있다.

## 4. 보고

```text
## 백엔드 컨벤션 검토

### 도구 결과
- pnpm --filter @repo/api lint: 통과
- pnpm --filter @repo/api test:e2e: 실행 못 함 — Compose DB가 꺼져 있음
- ...

### 위반
- `src/posts/posts.controller.ts:31` — 삭제가 200과 본문을 돌려줌 (nestjs-api §3). `@HttpCode(HttpStatus.NO_CONTENT)`를 붙이고 본문을 돌려주지 않는다.

### 확인 필요
- `src/posts/posts.controller.ts:18` — 목록에 `@Public()`. 비로그인 공개가 의도인지 확인 필요.

### 통과
- 확인한 항목과 근거

### 해당 없음
- 바뀐 파일에 해당하지 않아 보지 않은 항목
```

- 보안 항목 위반은 맨 위에 둔다.
- 위반마다 가장 작은 수정 방향을 한 줄로 적는다.
- 근거를 댈 수 없는 취향 문제는 위반이 아니라 "확인 필요"에 둔다.
