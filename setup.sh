#!/bin/bash
set -euo pipefail

TEMPLATES="single monorepo"
REPO_ONLY_PATHS=(scripts .github docs README.md .gitignore)
SELF_PATH=setup.sh

fail() {
  printf '오류: %s\n' "$1" >&2
  exit 1
}

usage() {
  printf '사용법: ./setup.sh <%s> [--yes]\n' "${TEMPLATES// /|}" >&2
  exit 1
}

cd "$(dirname "${BASH_SOURCE[0]}")"
ROOT=$(pwd -P)

[ "$#" -ge 1 ] && [ "$#" -le 2 ] || usage
SELECTED=$1
YES=false
if [ "$#" -eq 2 ]; then
  [ "$2" = --yes ] || usage
  YES=true
fi

KNOWN=false
for template in $TEMPLATES; do
  if [ "$SELECTED" = "$template" ]; then KNOWN=true; fi
  [ -d "$template" ] && [ ! -L "$template" ] || fail '템플릿 레포 상태가 아닙니다. 모든 템플릿 폴더가 필요하며 재실행할 수 없습니다.'
  # 복사 과정에서도 기존 Git 메타데이터를 덮어쓰지 않는다.
  [ ! -e "$template/.git" ] && [ ! -L "$template/.git" ] || fail '템플릿 폴더 안에 .git이 있으면 실행할 수 없습니다.'
done
[ "$KNOWN" = true ] || fail "알 수 없는 템플릿입니다: $SELECTED (지원: $TEMPLATES)"

GIT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || fail '템플릿 레포 상태가 아닙니다. Git 저장소에서 실행하세요.'
[ "$GIT_ROOT" = "$ROOT" ] || fail '템플릿 레포 상태가 아닙니다. 저장소 루트에 setup.sh가 있어야 합니다.'
# 상태 조회가 인덱스를 갱신하지 않도록 선택적 잠금을 끈다.
STATUS=$(GIT_OPTIONAL_LOCKS=0 git status --porcelain) || fail '작업 트리 상태를 확인할 수 없습니다.'
[ -z "$STATUS" ] || fail '작업 트리가 깨끗하지 않습니다. 변경 사항을 커밋하거나 정리한 뒤 다시 실행하세요.'

if [ "$YES" = false ]; then
  [ -t 0 ] || fail '비대화식 실행에는 --yes가 필요합니다.'
  printf '%s 템플릿을 루트로 복사하고 레포 전용 파일을 삭제합니다. 계속할까요? [y/N] ' "$SELECTED"
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
if [ "$SELECTED" = monorepo ]; then
  printf '%s\n' '  3. docker compose up -d --wait로 데이터베이스를 시작하세요.' '  4. pnpm dev로 개발 서버를 실행하세요.'
else
  printf '%s\n' '  3. pnpm dev로 개발 서버를 실행하세요.'
fi
