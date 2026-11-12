#!/bin/bash
# 현재 브랜치 PR의 리뷰 데이터를 레포 밖 임시 폴더에 모은다.
# stdout에는 임시 폴더 경로만 출력한다. 다 쓰면 호출한 쪽에서 지운다.
set -euo pipefail

PR_JSON=$(gh pr view --json number,baseRefName 2> /dev/null) || {
  echo "오류: 현재 브랜치에 열린 PR이 없습니다." >&2
  exit 1
}
NUMBER=$(jq -r .number <<< "$PR_JSON")
BASE=$(jq -r .baseRefName <<< "$PR_JSON")
REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)

OUT=$(mktemp -d "${TMPDIR:-/tmp}/resolve-reviews.XXXXXX")

jq -n --arg repo "$REPO" --argjson number "$NUMBER" --arg base "$BASE" \
  '{repo: $repo, number: $number, base: $base}' > "$OUT/pr.json"

# 페이지마다 배열이 나오므로 하나로 합친다. 답글은 빼고 스레드의 첫 코멘트만 남긴다.
gh api --paginate "repos/$REPO/pulls/$NUMBER/comments?per_page=100" \
  | jq -s '[.[][] | select(.in_reply_to_id == null)
      | {id, path, line: (.line // .original_line), outdated: (.line == null), body, user: .user.login}]' \
    > "$OUT/comments.json"

git fetch --quiet origin "$BASE"
git log "origin/$BASE..HEAD" --pretty=format:'%H %h %s' > "$OUT/commits.txt"
git diff "origin/$BASE...HEAD" --name-only > "$OUT/changed_files.txt"
git diff "origin/$BASE...HEAD" > "$OUT/diff.txt"

echo "PR #$NUMBER | $REPO | base: $BASE | 코멘트 $(jq length "$OUT/comments.json")개, 바뀐 파일 $(wc -l < "$OUT/changed_files.txt" | tr -d ' ')개" >&2
echo "$OUT"
