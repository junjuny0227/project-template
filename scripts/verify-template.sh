#!/bin/bash
# 템플릿 하나를 사용자가 밟는 경로 그대로 검증한다.
#   레포 복사 → git init → setup.sh → 결과물 목록 검사 → 하네스 검사 → 의존성 설치 → (DB 기동)
#   → 환경 변수 → steiger 음성 대조 → 게이트
# 사용법: scripts/verify-template.sh <템플릿>
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
# 세 템플릿의 루트 package.json이 공통으로 제공하는 스크립트 이름이다.
GATES="lint lint:fsd format:check check-types test test:e2e build"
# 하네스 단계가 확인하는 스킬 목록과, 남아 있으면 안 되는 예전 구조·도구 이름이다.
SKILLS="git-commit write-pr resolve-reviews nextjs-fsd-architecture data-and-forms frontend-convention-review"
REMOVED_NAMES='views|check-fsd-dependencies|shadcn|tanstack-query-zod|AskUserQuestion'

TEMPLATE=
WORK=
PROJECT=
COMPOSE_STARTED=false

log() {
  printf '[verify] %s\n' "$1"
}

fail() {
  printf '[verify] %s FAILED%s\n' "$1" "${2:+: $2}" >&2
  exit 1
}

usage() {
  printf '사용법: %s <템플릿>\n' "$0" >&2
  exit 2
}

cleanup() {
  local status=$?
  trap - EXIT
  if [ "$COMPOSE_STARTED" = true ]; then
    (cd "$PROJECT" && docker compose down --volumes --remove-orphans) > /dev/null 2>&1 || true
  fi
  if [ -n "$WORK" ]; then
    rm -rf "$WORK"
  fi
  exit "$status"
}

# 결과물 폴더에서 명령을 실행한다.
in_project() {
  (cd "$PROJECT" && "$@")
}

# 추적 중인 파일과 무시되지 않은 새 파일을 NUL로 구분해 출력한다. 방금 clone한 상태와 같은 목록이다.
# 지웠지만 아직 스테이징하지 않은 파일은 작업 트리에 없으므로 뺀다.
list_repo_files() {
  local path
  git -C "$ROOT" ls-files -co --exclude-standard -z -- "$@" | while IFS= read -r -d '' path; do
    if [ -e "$ROOT/$path" ] || [ -L "$ROOT/$path" ]; then
      printf '%s\0' "$path"
    fi
  done
}

# 커밋하기 전의 작업 트리도 검증할 수 있도록 git archive 대신 파일 목록으로 복사한다.
copy_repo() {
  WORK=$(mktemp -d "${TMPDIR:-/tmp}/verify-template.XXXXXX")
  PROJECT="$WORK/verify-$TEMPLATE"
  mkdir "$PROJECT"

  list_repo_files \
    | (cd "$ROOT" && COPYFILE_DISABLE=1 tar -cf - --null -T -) \
    | (cd "$PROJECT" && tar -xf -) \
    || fail 'copy'

  # setup.sh는 깨끗한 Git 저장소에서만 실행된다.
  git -C "$PROJECT" init -q
  git -C "$PROJECT" add -A
  git -C "$PROJECT" \
    -c user.name=verify-template \
    -c user.email=verify-template@example.invalid \
    -c commit.gpgsign=false \
    -c core.hooksPath=/dev/null \
    commit -qm 'chore: 검증용 복사본' \
    || fail 'copy' '복사본을 커밋하지 못했습니다'

  log 'copy OK'
}

run_setup() {
  in_project ./setup.sh "$TEMPLATE" --yes || fail 'setup'
  log 'setup OK'
}

# 결과물이 템플릿 폴더의 내용과 정확히 같은지 본다. 레포 전용 파일이 남거나 템플릿 파일이 빠지면 실패한다.
check_file_list() {
  local expected="$WORK/expected-files" actual="$WORK/actual-files"

  list_repo_files "$TEMPLATE" | tr '\0' '\n' | sed "s|^$TEMPLATE/||" | LC_ALL=C sort > "$expected"
  in_project find . -path ./.git -prune -o \( -type f -o -type l \) -print \
    | sed 's|^\./||' | LC_ALL=C sort > "$actual"

  if ! diff -u "$expected" "$actual"; then
    fail 'list check' '위 diff에서 -는 결과물에 없는 템플릿 파일, +는 결과물에만 있는 파일입니다'
  fi
  log 'list check OK'
}

# 링크가 스킬 원본을 가리키는지, 스킬이 모두 있는지,
# 예전 이름이 문서에 남지 않았는지 확인한다.
check_harness() {
  local link skill found status=0

  [ -f "$PROJECT/AGENTS.md" ] || fail 'harness' 'AGENTS.md가 없습니다'
  [ -f "$PROJECT/CLAUDE.md" ] || fail 'harness' 'CLAUDE.md가 없습니다'
  [ "$(cat "$PROJECT/CLAUDE.md")" = '@AGENTS.md' ] || fail 'harness' 'CLAUDE.md 포인터가 다릅니다'

  for link in .claude/skills .hermes/skills; do
    [ -L "$PROJECT/$link" ] || fail 'harness' "$link 심볼릭 링크가 없습니다"
    [ -e "$PROJECT/$link" ] || fail 'harness' "$link 링크가 가리키는 폴더가 없습니다"
    [ "$(readlink "$PROJECT/$link")" = '../.agents/skills' ] \
      || fail 'harness' "$link 링크가 스킬 원본을 가리키지 않습니다"
  done

  local skills=$SKILLS
  if [ "$TEMPLATE" = fullstack ]; then skills="$skills nestjs-api backend-convention-review"; fi
  for skill in $skills; do
    [ -f "$PROJECT/.agents/skills/$skill/SKILL.md" ] \
      || fail 'harness' ".agents/skills/$skill/SKILL.md가 없습니다"
  done

  # -w: 'reviews' 같은 단어 안의 'views'는 잡지 않는다.
  found=$(cd "$PROJECT" && grep -rnwE "$REMOVED_NAMES" AGENTS.md .agents) || status=$?
  case "$status" in
    0)
      printf '%s\n' "$found" >&2
      fail 'harness' '제거한 이름이 남아 있습니다'
      ;;
    1) ;;
    *) fail 'harness' '제거한 이름을 검색하지 못했습니다' ;;
  esac

  log 'harness OK'
}

install_dependencies() {
  in_project pnpm install --frozen-lockfile || fail 'install'
  log 'install OK'
}

start_services() {
  if [ ! -f "$PROJECT/docker-compose.yml" ]; then
    return 0
  fi
  COMPOSE_STARTED=true
  in_project docker compose up -d --wait || fail 'compose up'
  log 'compose up OK'
}

# KEY=VALUE 줄을 이 셸의 환경 변수로 내보낸다. 값을 파일에 쓰지 않는다.
load_env_file() {
  local file=$1 line key value
  while IFS= read -r line || [ -n "$line" ]; do
    key=${line%%=*}
    value=${line#*=}
    case "$key" in
      "$line" | '' | [0-9]* | *[!A-Za-z0-9_]*) continue ;;
    esac
    case "$value" in
      \"*\")
        value=${value#\"}
        value=${value%\"}
        ;;
      \'*\')
        value=${value#\'}
        value=${value%\'}
        ;;
    esac
    export "$key=$value"
  done < "$file"
}

prepare_env() {
  # CI와 같은 조건으로 돌린다. 떠 있는 개발 서버를 재사용하지 않고 test.only를 막는다.
  export CI=true

  # 사용자는 .env.example을 복사해 쓰므로 같은 값으로 게이트를 돌린다.
  if [ -f "$PROJECT/.env.example" ]; then
    load_env_file "$PROJECT/.env.example"
  fi
  if [ -d "$PROJECT/apps/api" ]; then
    load_env_file "$PROJECT/apps/api/.env.example"
    load_env_file "$PROJECT/apps/web/.env.example"
    # 예제 자리표시자를 쓰지 않는다. 실행마다 새 테스트 전용 값을 만들고 파일에는 남기지 않는다.
    JWT_SECRET=$(node -e "process.stdout.write(require('node:crypto').randomBytes(32).toString('hex'))")
    export JWT_SECRET
  fi

  # multi-web은 앱마다 예제를 복사본의 .env에 둔다. 서로 다른 baseURL도 덮어쓰지 않는다.
  if [ "$TEMPLATE" = multi-web ]; then
    local app
    for app in client admin; do
      cp "$PROJECT/apps/$app/.env.example" "$PROJECT/apps/$app/.env"
      log "env apps/$app OK"
    done
  fi
  # 예제는 개발용 enabled다. 운영 빌드 게이트는 끄고, E2E는 자체 서버별 on/off를 쓴다.
  if [ "$TEMPLATE" != fullstack ]; then
    export NEXT_PUBLIC_API_MOCKING=disabled
  fi

  log 'env OK'
}

# steiger가 조용히 아무것도 검사하지 않는 상태를 잡는다. 경계 위반을 심으면 lint:fsd가 실패해야 한다.
negative_control() {
  local relative src planted entity output status
  case "$TEMPLATE" in
    single) set -- src ;;
    fullstack) set -- apps/web/src ;;
    multi-web) set -- apps/client/src apps/admin/src packages/core/src ;;
  esac
  for relative in "$@"; do
    src="$PROJECT/$relative"
    output="$WORK/negative-control.log"
    status=0
    entity=
    [ -d "$src/shared/api" ] || fail 'negative control' "$relative/shared/api 폴더가 없습니다"
    planted="$src/shared/api/verifyNegativeControl.ts"
    if [ "$relative" = packages/core/src ]; then
      entity="$src/entities/verify-negative-control"
      mkdir -p "$entity/model"
      printf '%s\n' 'export const verifyEntity = true;' > "$entity/model/probe.ts"
      printf '%s\n' "export { verifyEntity } from './model/probe';" > "$entity/index.ts"
      printf '%s\n' \
        "import { verifyEntity } from '../../entities/verify-negative-control';" \
        'export const verifyNegativeControl = verifyEntity;' > "$planted"
    else
      printf '%s\n' \
        "import { HomePage } from '@/_pages/home';" \
        'export const verifyNegativeControl = HomePage;' > "$planted"
    fi
    in_project pnpm run lint:fsd > "$output" 2>&1 || status=$?
    rm -f "$planted"
    if [ -n "$entity" ]; then rm -rf "$entity"; fi
    if [ "$status" -eq 0 ]; then
      cat "$output" >&2
      fail 'negative control' "$relative 경계 위반을 심었는데 lint:fsd가 통과했습니다"
    fi
    if ! grep -q 'forbidden-imports' "$output" || ! grep -q "$relative/shared/api/verifyNegativeControl.ts\|shared/api/verifyNegativeControl.ts" "$output"; then
      cat "$output" >&2
      fail 'negative control' "$relative 경계 위반이 아닌 다른 이유로 실패했습니다"
    fi
    log "negative control $relative OK"
  done
}

install_browsers() {
  # test:e2e가 쓰는 브라우저다. 이미 받아 둔 버전이면 바로 끝난다.
  in_project pnpm exec playwright install chromium || fail 'playwright browsers'
  log 'playwright browsers OK'
}

run_gates() {
  local gate
  for gate in $GATES; do
    in_project pnpm run "$gate" || fail "$gate"
    log "$gate OK"
  done
}

main() {
  [ "$#" -eq 1 ] || usage
  TEMPLATE=$1
  # 다른 앱이나 병렬 에이전트가 남긴 환경 변수를 사용하지 않는다.
  unset PORT DATABASE_URL JWT_SECRET CORS_ORIGINS API_BASE_URL NEXT_PUBLIC_API_MOCKING COMPOSE_PROJECT_NAME
  case "$TEMPLATE" in
    '' | */* | .* | -*) usage ;;
  esac
  [ -d "$ROOT/$TEMPLATE" ] || fail 'template' "$TEMPLATE 폴더가 없습니다"
  case "$TEMPLATE" in
    single | fullstack | multi-web) ;;
    *) usage ;;
  esac

  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  copy_repo
  run_setup
  # 결과물만 보는 정적 검사는 설치 전에 둔다.
  check_file_list
  check_harness
  install_dependencies
  start_services
  prepare_env
  negative_control
  install_browsers
  run_gates

  log "$TEMPLATE 템플릿 검증을 모두 통과했습니다"
}

main "$@"
