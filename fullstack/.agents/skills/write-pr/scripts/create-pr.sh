#!/bin/bash
# PR을 만든다. 라벨이 저장소에 없으면 라벨 없이 만든다.
# 사용법: create-pr.sh <제목> <본문 파일> [라벨] [base]
#   base를 주지 않으면 원격에 develop이 있으면 develop, 없으면 기본 브랜치를 쓴다.
set -euo pipefail

USAGE='사용법: create-pr.sh <제목> <본문 파일> [라벨] [base]'
TITLE=${1:?$USAGE}
BODY_FILE=${2:?$USAGE}
LABEL=${3:-}
BASE=${4:-}

if [ ! -f "$BODY_FILE" ]; then
  echo "오류: 본문 파일이 없습니다: $BODY_FILE" >&2
  exit 1
fi

if [ -z "$BASE" ]; then
  if git ls-remote --exit-code --heads origin develop > /dev/null 2>&1; then
    BASE=develop
  else
    BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
  fi
fi

if [ -n "$LABEL" ]; then
  EXISTING=$(gh label list --limit 200 --json name -q '.[].name' 2> /dev/null || true)
  if ! printf '%s\n' "$EXISTING" | grep -Fxq -- "$LABEL"; then
    echo "경고: 저장소에 '$LABEL' 라벨이 없어 라벨 없이 PR을 만듭니다." >&2
    LABEL=
  fi
fi

ARGS=(--title "$TITLE" --body-file "$BODY_FILE" --base "$BASE")
if [ -n "$LABEL" ]; then
  ARGS+=(--label "$LABEL")
fi

echo "PR을 만듭니다."
echo "  제목 : $TITLE"
echo "  base : $BASE"
echo "  라벨 : ${LABEL:-(없음)}"

gh pr create "${ARGS[@]}"
