#!/bin/bash
set -euo pipefail

PR_NUMBER=$(gh pr view --json number -q .number 2>/dev/null)
if [ -z "$PR_NUMBER" ]; then
  echo "ERROR: No open PR found for current branch." >&2
  exit 1
fi

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
BASE=$(gh pr view "$PR_NUMBER" --json baseRefName -q .baseRefName)

OUT_DIR=$(mktemp -d "${TMPDIR:?Set TMPDIR to the Hermes scratch directory}/pr-review.XXXXXX")
trap 'rm -rf "$OUT_DIR"' ERR

gh api "repos/$REPO/pulls/$PR_NUMBER/comments" --paginate \
  | jq -s '[.[][] | {id, path, line, body, user: .user.login}]' \
  > "$OUT_DIR/pr_comments.json"

git log "origin/$BASE..HEAD" --pretty=format:"%H %h %s" > "$OUT_DIR/pr_commits.txt"

git diff "origin/$BASE...HEAD" --name-only > "$OUT_DIR/pr_changed_files.txt"

git diff "origin/$BASE...HEAD" > "$OUT_DIR/pr_diff.txt"

echo "PR #$PR_NUMBER | Repo: $REPO | Base: $BASE"
echo "Output directory: $OUT_DIR"
echo "Comments: $(jq length "$OUT_DIR/pr_comments.json"), Changed files: $(wc -l < "$OUT_DIR/pr_changed_files.txt" | tr -d ' ')"