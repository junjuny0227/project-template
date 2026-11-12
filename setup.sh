#!/bin/bash
set -euo pipefail

TEMPLATES="single fullstack multi-web"
REPO_ONLY_PATHS=(scripts .github docs README.md .gitignore)
SELF_PATH=setup.sh

fail() {
  printf '오류: %s\n' "$1" >&2
  exit 1
}

usage() {
  printf '사용법: ./setup.sh [<%s> [--yes]]\n' "${TEMPLATES// /|}" >&2
  printf '%s\n' '템플릿 없이 터미널에서 실행하면 방향키와 Enter로 고를 수 있습니다.' >&2
  exit 1
}

validate_selected() {
  local template known=false
  for template in $TEMPLATES; do
    if [ "$SELECTED" = "$template" ]; then known=true; fi
  done
  [ "$known" = true ] || fail "알 수 없는 템플릿입니다: $SELECTED (지원: $TEMPLATES)"
  [ -d "$SELECTED" ] || fail "템플릿 레포 상태가 아닙니다. 선택한 템플릿 폴더가 없습니다: $SELECTED (재실행할 수 없습니다.)"
}

describe() {
  case "$1" in
    single) printf '%s' 'Next.js 단일 웹 앱, 백엔드는 별도' ;;
    fullstack) printf '%s' 'Next.js 웹 + NestJS API + PostgreSQL' ;;
    multi-web) printf '%s' 'client·admin 웹 앱 여러 개, 백엔드는 별도' ;;
  esac
}

restore_cursor() {
  printf '\033[?25h' >&2
}

# 방향키·숫자 키로 템플릿을 고른다. 결과는 SELECTED에 담는다.
# 화면 출력은 stderr로 보내 stdout 리다이렉트와 섞이지 않게 한다.
choose_template() {
  local options=() template index=0 count key rest i
  for template in $TEMPLATES; do
    if [ -d "$template" ]; then options+=("$template"); fi
  done
  count=${#options[@]}
  [ "$count" -gt 0 ] || fail '템플릿 레포 상태가 아닙니다. 선택할 템플릿 폴더가 없습니다. (재실행할 수 없습니다.)'

  trap restore_cursor EXIT
  trap 'restore_cursor; printf "\n" >&2; exit 130' INT TERM
  printf '\033[?25l' >&2
  printf '%s\n' '사용할 템플릿을 고르세요. (↑/↓ 이동, Enter 선택, 숫자 바로 선택, q 취소)' >&2

  while true; do
    i=0
    while [ "$i" -lt "$count" ]; do
      if [ "$i" -eq "$index" ]; then
        printf '\033[2K  \033[1m> %d. %-10s\033[0m %s\n' "$((i + 1))" "${options[$i]}" "$(describe "${options[$i]}")" >&2
      else
        printf '\033[2K    %d. %-10s %s\n' "$((i + 1))" "${options[$i]}" "$(describe "${options[$i]}")" >&2
      fi
      i=$((i + 1))
    done

    key=
    IFS= read -rsn1 key || fail '입력을 읽지 못했습니다. 변경하지 않았습니다.'
    if [ "$key" = $'\e' ]; then
      rest=
      IFS= read -rsn2 -t 1 rest || true
      key="$key$rest"
    fi
    case "$key" in
      $'\e[A'|$'\eOA'|k) index=$(((index + count - 1) % count)) ;;
      $'\e[B'|$'\eOB'|j) index=$(((index + 1) % count)) ;;
      ''|$'\r') break ;;
      [1-9])
        if [ "$key" -le "$count" ]; then
          index=$((key - 1))
          break
        fi
        ;;
      q|Q|$'\e') restore_cursor; fail '취소했습니다. 변경하지 않았습니다.' ;;
    esac
    # 다시 그리기 위해 목록 줄 수만큼 커서를 올린다.
    printf '\033[%dA' "$count" >&2
  done

  restore_cursor
  trap - EXIT INT TERM
  SELECTED=${options[$index]}
  printf '\n선택: %s\n' "$SELECTED" >&2
}

cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT=$(pwd -P)

if [ "$#" -gt 2 ]; then usage; fi
SELECTED=${1:-}
YES=false
if [ "$#" -eq 2 ]; then
  [ "$2" = --yes ] || usage
  YES=true
fi
# 템플릿 없이 실행하면 메뉴로 고른다. 메뉴는 터미널에서만 띄운다.
if [ -z "$SELECTED" ] && [ ! -t 0 ]; then usage; fi

for template in $TEMPLATES; do
  [ ! -L "$template" ] || fail '템플릿 폴더는 심볼릭 링크일 수 없습니다.'
  # 복사 과정에서도 기존 Git 메타데이터를 덮어쓰지 않는다.
  if [ -e "$template/.git" ] || [ -L "$template/.git" ]; then
    fail '템플릿 폴더 안에 .git이 있으면 실행할 수 없습니다.'
  fi
done

if [ -n "$SELECTED" ]; then validate_selected; fi

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail '템플릿 레포 상태가 아닙니다. Git 저장소에서 실행하세요.'
[ "$GIT_ROOT" = "$ROOT" ] || fail '템플릿 레포 상태가 아닙니다. 저장소 루트에 setup.sh가 있어야 합니다.'
# 상태 조회가 인덱스를 갱신하지 않도록 선택적 잠금을 끈다.
STATUS=$(GIT_OPTIONAL_LOCKS=0 git status --porcelain) || fail '작업 트리 상태를 확인할 수 없습니다.'
[ -z "$STATUS" ] || fail '작업 트리가 깨끗하지 않습니다. 변경 사항을 커밋하거나 정리한 뒤 다시 실행하세요.'

# 거부 사유를 모두 확인한 뒤에 메뉴를 띄워, 고르고 나서 거부당하는 일이 없게 한다.
if [ -z "$SELECTED" ]; then
  choose_template
  validate_selected
fi

if [ "$YES" = false ]; then
  [ -t 0 ] || fail '비대화식 실행에는 --yes가 필요합니다.'
  OTHERS=
  for template in $TEMPLATES; do
    if [ "$template" != "$SELECTED" ]; then OTHERS="$OTHERS $template"; fi
  done
  printf '%s 템플릿을 루트로 복사합니다.\n삭제:%s %s %s\n' "$SELECTED" "$OTHERS" "${REPO_ONLY_PATHS[*]}" "$SELF_PATH"
  printf '계속할까요? [y/N] '
  ANSWER=
  read -r ANSWER || fail '확인을 읽지 못했습니다. 변경하지 않았습니다.'
  case "$ANSWER" in
    y|Y|yes|YES) ;;
    *) fail '취소했습니다. 변경하지 않았습니다.' ;;
  esac
fi

rm -rf "${REPO_ONLY_PATHS[@]}"
for template in $TEMPLATES; do
  if [ "$template" != "$SELECTED" ]; then rm -rf "$template"; fi
done
cp -R "$SELECTED/." .
rm -rf "$SELECTED"
rm -f "$SELF_PATH"

printf '\n%s 템플릿 준비가 끝났습니다.\n' "$SELECTED"
printf '%s\n' '다음 단계:' '  1. README.md를 읽고 .env.example을 참고해 환경 변수를 설정하세요.' '  2. pnpm install을 실행하세요.'
if [ "$SELECTED" = fullstack ]; then
  printf '%s\n' '  3. docker compose up -d --wait로 데이터베이스를 시작하세요.' '  4. pnpm dev로 개발 서버를 실행하세요.'
else
  printf '%s\n' '  3. pnpm dev로 개발 서버를 실행하세요.'
fi
