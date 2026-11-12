# project-template

개인 웹 프로젝트를 시작하기 위한 두 가지 자립형 템플릿이다. 도메인 기능 대신 공통 라이브러리 설정, 테스트, 품질 게이트와 에이전트 작업 규칙을 제공한다.

| 템플릿 | 구성 |
| --- | --- |
| `single` | Next.js 웹 앱, FSD 구조, TanStack Query, axios, zod·react-hook-form, Tailwind CSS |
| `fullstack` | Turborepo, Next.js `apps/web`, NestJS `apps/api`, 공용 설정 패키지, Prisma·PostgreSQL |

두 템플릿 모두 ESLint, steiger, Prettier, 타입 검사, Vitest, Playwright와 CI를 포함한다. 모노레포는 웹 → API → DB 풀스택 스모크도 검사한다. 로그인·토큰 발급과 도메인 모델은 포함하지 않는다.

## 새 프로젝트 시작

1. GitHub에서 **Use this template**으로 새 저장소를 만든다.
2. 만든 저장소를 clone하고 해당 디렉터리로 이동한다.
3. 둘 중 하나를 실행한다. 작업 트리는 깨끗해야 한다.

```bash
./setup.sh single
# 또는
./setup.sh fullstack
```

실행 전에 확인을 받는다. 비대화식 실행에서는 `--yes`가 필수다.

```bash
./setup.sh single --yes
# 또는
./setup.sh fullstack --yes
```

**현재 템플릿 저장소 자체가 아니라 새로 만든 프로젝트에서 실행한다.** 선택한 폴더의 숨김 파일을 포함한 내용이 루트로 복사된다. 모든 템플릿 폴더(선택한 원본과 존재하는 미선택 폴더), 기존 루트의 `scripts/`, `.github/`, `docs/`, `README.md`, `.gitignore`, 그리고 `setup.sh` 자신이 삭제된다. 루트 README·GitHub 설정 등은 선택한 템플릿의 것으로 바뀐다. `.git`은 보존된다.

스크립트는 프로젝트명 치환, 의존성 설치, Git 초기화를 하지 않는다. 완료 후 새 루트의 README를 따라 환경 변수를 설정하고 의존성을 설치한다.

### 실행 환경

- Node.js 24 이상, pnpm 12.18.0, Git이 필요하다. pnpm 버전은 각 템플릿의 `packageManager`에 고정되어 있다.
- 모노레포 개발·검증에는 Docker와 Docker Compose가 필요하다. 템플릿의 `docker compose up -d --wait`로 PostgreSQL을 시작한다.
- `setup.sh`는 macOS 기본 `/bin/bash` 3.2와 호환된다. Linux에서도 bash로 실행한다.
- Windows 네이티브 환경은 지원 범위 밖이다. 특히 `.claude/skills`와 `.hermes/skills` 심볼릭 링크가 checkout 설정·권한에 따라 깨질 수 있다. 링크를 보존할 수 있는 WSL/Linux 환경을 사용한다.

## 템플릿 저장소 검증

아래는 **setup 실행 전의 이 저장소 루트**에서 실행한다. Node.js, pnpm, Git, shellcheck가 필요하며 전체 모노레포 검증에는 Docker가 실행 중이어야 한다.

```bash
# macOS 기본 bash 3.2에서 setup 안전장치와 복사·삭제 동작 검사
/bin/bash scripts/test-setup.sh
shellcheck --shell=bash setup.sh scripts/*.sh

# 공통 소스·스킬·이슈/PR 양식·CI web 게이트 드리프트 검사
node scripts/check-template-drift.mjs

# 저장소 밖 복사본에서 setup → 파일 목록·하네스 검사 → 설치 → 전체 게이트
scripts/verify-template.sh single
scripts/verify-template.sh fullstack
```

검증 스크립트는 추적 파일과 무시되지 않은 새 파일(`git ls-files -co --exclude-standard`)을 복사한다. 복사본에서만 Git 초기화와 검증용 커밋을 수행한 뒤 `setup.sh --yes`를 실행한다. 실제 저장소를 변환하지 않으며 임시 복사본과 검증용 DB를 정리한다. 깨끗한 CI checkout에서는 이 복사 목록이 추적 파일 목록과 같다.

전체 게이트는 `lint`, `lint:fsd`, `format:check`, `check-types`, `test`, `test:e2e`, `build`다. 예제 환경 변수와 임의 테스트용 JWT 비밀을 검증 과정에서 주입하고 Playwright Chromium을 설치한다. Linux에서는 Playwright 시스템 의존성도 필요하다(루트 CI가 설치한다).

루트 `.github/workflows/verify-templates.yml`은 PR과 `main` push에서 setup 테스트·shellcheck, 드리프트 검사, `[single, fullstack]` 복사 검증을 실행한다. CI의 bash는 macOS 3.2 호환성 검증을 대신하지 않는다.
