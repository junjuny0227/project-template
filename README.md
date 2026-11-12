# project-template

개인 웹 프로젝트를 시작하기 위한 세 가지 자립형 템플릿이다. 도메인 기능 대신 공통 라이브러리 설정, 테스트, 품질 게이트와 에이전트 작업 규칙을 제공한다.

| 템플릿 | 구성 |
| --- | --- |
| `single` | Next.js 웹 앱, FSD 구조, TanStack Query, axios, zod·react-hook-form, Tailwind CSS, MSW |
| `fullstack` | Turborepo, Next.js `apps/web`, NestJS `apps/api`, 공용 설정 패키지, Prisma·PostgreSQL |
| `multi-web` | Turborepo, Next.js `apps/client`·`apps/admin`, 공용 core·UI·Tailwind·MSW 패키지, 외부 백엔드 |

세 템플릿 모두 ESLint, steiger, Prettier, 타입 검사, Vitest, Playwright와 CI를 포함한다. `single`·`multi-web`은 MSW로 백엔드 없이 개발하고 브라우저·서버 모킹의 켜짐/꺼짐을 E2E로 검사한다. `fullstack`은 웹 → API → DB 풀스택 스모크를 검사하며 MSW는 넣지 않는다. 로그인·토큰 발급과 도메인 모델은 포함하지 않는다.

## 새 프로젝트 시작

1. GitHub에서 **Use this template**으로 새 저장소를 만든다.
2. 만든 저장소를 clone하고 해당 디렉터리로 이동한다.
3. `./setup.sh`를 실행하고 ↑/↓로 템플릿을 고른 뒤 Enter를 누른다. 숫자 키(1–3)로 바로 고를 수 있고 q나 Esc로 취소한다. 작업 트리는 깨끗해야 한다.

```bash
./setup.sh
```

템플릿을 인자로 바로 지정할 수도 있다.

```bash
./setup.sh single
# 또는
./setup.sh fullstack
# 또는
./setup.sh multi-web
```

어느 방식이든 삭제할 항목을 보여 주고 확인을 받는다. 비대화식 실행에서는 템플릿 인자와 `--yes`가 필수다.

```bash
./setup.sh single --yes
# 또는
./setup.sh fullstack --yes
# 또는
./setup.sh multi-web --yes
```

**현재 템플릿 저장소 자체가 아니라 새로 만든 프로젝트에서 실행한다.** 선택한 폴더의 숨김 파일을 포함한 내용이 루트로 복사된다. 모든 템플릿 폴더(선택한 원본과 고르지 않은 두 폴더), 기존 루트의 `scripts/`, `.github/`, `docs/`, `README.md`, `.gitignore`, 그리고 `setup.sh` 자신이 삭제된다. 루트 README·GitHub 설정 등은 선택한 템플릿의 것으로 바뀐다. `.git`은 보존된다. 고르지 않은 폴더가 이미 없어도 실행할 수 있지만 선택한 폴더는 반드시 있어야 한다.

스크립트는 프로젝트명 치환, 의존성 설치, Git 초기화를 하지 않는다. 완료 후 새 루트의 README를 따라 환경 변수를 설정하고 의존성을 설치한다. `multi-web`의 환경 변수는 `apps/client`·`apps/admin`마다 설정한다. `single`·`multi-web`의 예제는 `NEXT_PUBLIC_API_MOCKING=enabled`이며 실제 백엔드를 사용할 때는 끈다. 모킹 플래그는 빌드 시 고정되므로 변경 후에는 다시 빌드해야 한다.

### 실행 환경

- Node.js 24 이상, pnpm 12.18.0, Git이 필요하다. pnpm 버전은 각 템플릿의 `packageManager`에 고정되어 있다. `fullstack`·`multi-web`의 공통 의존성 버전은 pnpm catalog로 관리한다.
- `fullstack` 개발·검증에는 Docker와 Docker Compose가 필요하다. 템플릿의 `docker compose up -d --wait`로 PostgreSQL을 시작한다. 다른 두 템플릿에는 DB가 필요하지 않다.
- `setup.sh`는 macOS 기본 `/bin/bash` 3.2와 호환된다. Linux에서도 bash로 실행한다.
- Windows 네이티브 환경은 지원 범위 밖이다. 특히 `.claude/skills`와 `.hermes/skills` 심볼릭 링크가 checkout 설정·권한에 따라 깨질 수 있다. 링크를 보존할 수 있는 WSL/Linux 환경을 사용한다.

## 템플릿 저장소 검증

아래는 **setup 실행 전의 이 저장소 루트**에서 실행한다. Node.js, pnpm, Git, shellcheck, actionlint가 필요하며 `fullstack` 전체 검증에는 Docker가 실행 중이어야 한다.

```bash
# macOS 기본 bash 3.2에서 세 선택의 복사·삭제 동작과 안전장치 검사
/bin/bash scripts/test-setup.sh
shellcheck --shell=bash setup.sh scripts/*.sh
actionlint

# 공통 소스·스킬·이슈/PR 양식·CI web 게이트와 범위별 음성 대조
node scripts/check-template-drift.mjs
node scripts/test-template-drift.mjs

# 저장소 밖 복사본에서 setup → 파일 목록·하네스 검사 → 설치 → 전체 게이트
scripts/verify-template.sh single
scripts/verify-template.sh fullstack
scripts/verify-template.sh multi-web
```

드리프트 검사는 `single` ↔ `fullstack/apps/web` 공통 코드, `single` ↔ `multi-web/apps/client` 모킹 연결 코드(import 지정자만 정규화), client ↔ admin의 providers·env·steiger, 세 템플릿의 스킬·이슈/PR 양식과 CI 게이트를 비교한다. MSW가 없는 fullstack과의 차이는 파일별 한국어 사유로만 예외 처리한다. 음성 대조는 임시 복사본에서 각 범위의 파일을 변경해 실패와 해당 경로 출력을 확인한다.

검증 스크립트는 추적 파일과 무시되지 않은 새 파일(`git ls-files -co --exclude-standard`)을 복사한다. 복사본에서만 Git 초기화와 검증용 커밋을 수행한 뒤 `setup.sh --yes`를 실행한다. 실제 저장소를 변환하지 않으며 임시 복사본과 검증용 DB를 정리한다. 깨끗한 CI checkout에서는 이 복사 목록이 추적 파일 목록과 같다.

전체 게이트는 `lint`, `lint:fsd`, `format:check`, `check-types`, `test`, `test:e2e`, `build`다. 예제 환경 변수와 fullstack의 임의 테스트용 JWT 비밀을 주입하고 Playwright Chromium을 설치한다. multi-web은 각 앱의 예제를 복사본에만 복사하며, 운영 빌드 게이트에서는 모킹을 끈다. E2E는 각 템플릿의 설정이 서버별로 모킹을 켜고 끈다. steiger 음성 대조는 각 웹 앱과 multi-web core를 따로 확인한다. Linux에서는 Playwright 시스템 의존성도 필요하다(루트 CI가 설치한다).

루트 `.github/workflows/verify-templates.yml`은 PR과 `main` push에서 setup 테스트·shellcheck, 드리프트와 음성 대조, `[single, fullstack, multi-web]` 복사 검증을 실행한다. CI의 bash는 macOS 3.2 호환성 검증을 대신하지 않는다.
