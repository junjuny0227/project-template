#!/bin/bash
set -euo pipefail

ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
WORK=$(mktemp -d "${TMPDIR:-/tmp}/test-setup.XXXXXX")
trap 'rm -rf "$WORK"' EXIT
PASS_COUNT=0
FAIL_COUNT=0
FIXTURE=

new_fixture() {
  FIXTURE="$WORK/$1"
  mkdir -p "$FIXTURE"
  local template
  for template in single fullstack multi-web; do
    mkdir -p "$FIXTURE/$template/.agents" "$FIXTURE/$template/scripts" "$FIXTURE/$template/.github"
    printf '%s\n' "$template" > "$FIXTURE/$template/app.txt"
    printf '%s\n' '숨김 파일' > "$FIXTURE/$template/.hidden"
    printf '%s\n' '템플릿 규칙' > "$FIXTURE/$template/.agents/rules.md"
    printf '%s\n' '템플릿 README' > "$FIXTURE/$template/README.md"
    printf '%s\n' '템플릿 ignore' > "$FIXTURE/$template/.gitignore"
    printf '%s\n' '템플릿 스크립트' > "$FIXTURE/$template/scripts/template.sh"
    printf '%s\n' '템플릿 CI' > "$FIXTURE/$template/.github/template.yml"
    ln -s .agents "$FIXTURE/$template/agent-link"
  done
  mkdir -p "$FIXTURE/scripts" "$FIXTURE/.github" "$FIXTURE/docs"
  printf '%s\n' '레포 전용' > "$FIXTURE/scripts/repo.sh"
  printf '%s\n' '레포 전용' > "$FIXTURE/.github/repo.yml"
  printf '%s\n' '레포 전용' > "$FIXTURE/docs/plan.md"
  printf '%s\n' '레포 전용 README' > "$FIXTURE/README.md"
  printf '%s\n' '레포 전용 ignore' > "$FIXTURE/.gitignore"
  cp "$ROOT/setup.sh" "$FIXTURE/setup.sh"
  git -C "$FIXTURE" init -q
  git -C "$FIXTURE" add .
  git -C "$FIXTURE" -c user.name=setup-test -c user.email=setup-test@example.invalid -c core.hooksPath=/dev/null commit -qm 'test: 픽스처'
}

run_setup() {
  (cd "$FIXTURE" && /bin/bash ./setup.sh "$@") > "$WORK/output" 2>&1
}

assert_refused() {
  local message=$1
  shift
  if run_setup "$@" < /dev/null; then
    printf '%s\n' '거부해야 하는 실행이 성공했습니다.' >&2
    return 1
  fi
  grep -q "$message" "$WORK/output"
  test -f "$FIXTURE/setup.sh"
  test -d "$FIXTURE/single"
  test -d "$FIXTURE/fullstack"
  test -f "$FIXTURE/docs/plan.md"
}

files_move() {
  local template
  for template in single fullstack; do
    new_fixture "files-$template"
    run_setup "$template" --yes
    test "$(cat "$FIXTURE/app.txt")" = "$template"
    test -f "$FIXTURE/.hidden"
    test -f "$FIXTURE/.agents/rules.md"
    test -L "$FIXTURE/agent-link"
    test "$(readlink "$FIXTURE/agent-link")" = .agents
    test -f "$FIXTURE/agent-link/rules.md"
    test ! -e "$FIXTURE/$template"
  done
}

other_removed() {
  new_fixture other-single
  run_setup single --yes
  test ! -e "$FIXTURE/fullstack"
  test ! -e "$FIXTURE/multi-web"
  new_fixture other-fullstack
  run_setup fullstack --yes
  test ! -e "$FIXTURE/single"
  test ! -e "$FIXTURE/multi-web"
}

repo_removed() {
  new_fixture repo
  run_setup single --yes
  test ! -e "$FIXTURE/docs"
  test ! -e "$FIXTURE/scripts/repo.sh"
  test ! -e "$FIXTURE/.github/repo.yml"
  test -f "$FIXTURE/scripts/template.sh"
  test -f "$FIXTURE/.github/template.yml"
  test "$(cat "$FIXTURE/README.md")" = '템플릿 README'
  test "$(cat "$FIXTURE/.gitignore")" = '템플릿 ignore'
}

self_removed() {
  new_fixture self
  run_setup single --yes
  test ! -e "$FIXTURE/setup.sh"
}

rerun_refused() {
  new_fixture rerun
  run_setup single --yes
  cp "$ROOT/setup.sh" "$FIXTURE/setup.sh"
  if run_setup single --yes; then
    return 1
  fi
  grep -q '템플릿 레포 상태' "$WORK/output"
  test -f "$FIXTURE/app.txt"
  test -f "$FIXTURE/setup.sh"
}

dirty_refused() {
  local kind
  for kind in tracked staged untracked; do
    new_fixture "dirty-$kind"
    case "$kind" in
      tracked) printf '%s\n' '변경' >> "$FIXTURE/README.md" ;;
      staged)
        printf '%s\n' '변경' >> "$FIXTURE/README.md"
        git -C "$FIXTURE" add README.md
        ;;
      untracked) printf '%s\n' '새 파일' > "$FIXTURE/new.txt" ;;
    esac
    assert_refused '작업 트리' single --yes
  done
}

unknown_refused() {
  new_fixture unknown
  assert_refused '알 수 없는 템플릿' unknown --yes
  assert_refused '사용법' single --invalid
  assert_refused '사용법'
  rm -rf "$FIXTURE/multi-web"
  assert_refused '선택한 템플릿 폴더가 없습니다: multi-web' multi-web --yes
}

non_tty_refused() {
  new_fixture non-tty
  assert_refused '비대화식' single
}

git_preserved() {
  new_fixture git
  cp -R "$FIXTURE/.git" "$WORK/git-before"
  run_setup single --yes
  test -d "$FIXTURE/.git"
  diff -r "$WORK/git-before" "$FIXTURE/.git"
}

spaces_work() {
  new_fixture 'repo with spaces'
  run_setup fullstack --yes
  test "$(cat "$FIXTURE/app.txt")" = fullstack
  test -L "$FIXTURE/agent-link"
  test ! -e "$FIXTURE/setup.sh"
}

subdirectory_works() {
  new_fixture subdirectory
  (cd "$FIXTURE/single/.agents" && /bin/bash ../../setup.sh single --yes) > "$WORK/output" 2>&1
  test "$(cat "$FIXTURE/app.txt")" = single
  test ! -e "$FIXTURE/setup.sh"
}

run_case() {
  local name=$1
  shift
  local status
  # 조건문의 함수 호출은 errexit를 무효화하므로 별도 서브셸에서 검사한다.
  set +e
  (set -e; "$@") > "$WORK/case-output" 2>&1
  status=$?
  set -e
  if [ "$status" -eq 0 ]; then
    printf 'PASS %s\n' "$name"
    PASS_COUNT=$((PASS_COUNT + 1))
  else
    printf 'FAIL %s\n' "$name"
    cat "$WORK/case-output"
    if [ -f "$WORK/output" ]; then cat "$WORK/output"; fi
    FAIL_COUNT=$((FAIL_COUNT + 1))
  fi
}

run_case '① 일반·숨김 파일 이동' files_move
run_case '② 미선택 폴더 삭제' other_removed
run_case '③ 레포 전용 파일 삭제' repo_removed
run_case '④ 자기 삭제' self_removed
run_case '⑤ 재실행 거부' rerun_refused
run_case '⑥ dirty 거부' dirty_refused
run_case '⑦ 알 수 없는 템플릿 거부' unknown_refused
run_case '⑧ 비TTY에 --yes 없으면 거부' non_tty_refused
run_case '⑨ .git 보존' git_preserved
run_case '⑩ 공백 경로' spaces_work
run_case '⑪ 하위 디렉터리에서 실행' subdirectory_works
printf '\nPASS: %s, FAIL: %s\n' "$PASS_COUNT" "$FAIL_COUNT"
test "$FAIL_COUNT" -eq 0
