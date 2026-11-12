#!/bin/bash
# 템플릿 하나를 사용자가 밟는 경로 그대로 검증한다.
#   레포 복사 → git init → setup.sh → 결과물 목록 검사 → 의존성 설치 → (DB 기동)
#   → 환경 변수 → steiger 음성 대조 → 게이트
# 사용법: scripts/verify-template.sh <템플릿>
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)
# 두 템플릿의 루트 package.json이 공통으로 제공하는 스크립트 이름이다.
GATES="lint lint:fsd format:check check-types test test:e2e build"

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
  # 템플릿에 따라 더 필요한 값(앱별 .env.example, 테스트용 값)은 여기에서 내보낸다.

  log 'env OK'
}

# steiger가 조용히 아무것도 검사하지 않는 상태를 잡는다. 경계 위반을 심으면 lint:fsd가 실패해야 한다.
negative_control() {
  local src="$PROJECT/src" planted output="$WORK/negative-control.log" status=0

  if [ -d "$PROJECT/apps/web" ]; then
    src="$PROJECT/apps/web/src"
  fi
  [ -d "$src/shared/api" ] || fail 'negative control' "${src#"$PROJECT"/}/shared/api 폴더가 없습니다"

  planted="$src/shared/api/verifyNegativeControl.ts"
  printf '%s\n' \
    "import { HomePage } from '@/_pages/home';" \
    '' \
    'export const verifyNegativeControl = HomePage;' > "$planted"
  in_project pnpm run lint:fsd > "$output" 2>&1 || status=$?
  rm -f "$planted"

  if [ "$status" -eq 0 ]; then
    cat "$output" >&2
    fail 'negative control' 'shared → _pages import를 심었는데 lint:fsd가 통과했습니다'
  fi
  if ! grep -q 'forbidden-imports' "$output"; then
    cat "$output" >&2
    fail 'negative control' 'lint:fsd가 경계 위반이 아닌 다른 이유로 실패했습니다'
  fi
  log 'negative control OK'
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
  case "$TEMPLATE" in
    '' | */* | .* | -*) usage ;;
  esac
  [ -d "$ROOT/$TEMPLATE" ] || fail 'template' "$TEMPLATE 폴더가 없습니다"

  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' TERM

  copy_repo
  run_setup
  # 결과물만 보는 정적 검사는 설치 전에 둔다.
  check_file_list
  install_dependencies
  start_services
  prepare_env
  negative_control
  install_browsers
  run_gates

  log "$TEMPLATE 템플릿 검증을 모두 통과했습니다"
}

main "$@"
