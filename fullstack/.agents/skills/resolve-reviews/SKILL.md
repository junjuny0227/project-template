---
name: resolve-reviews
description: 현재 브랜치 PR의 인라인 리뷰 코멘트를 모아 프로젝트 규칙 기준으로 하나씩 판단(VALID·INVALID·PARTIAL)하고, 타당한 것은 고친다. 푸시와 GitHub 답글은 사용자 확인을 받은 뒤에만 한다. 사용자가 리뷰 반영을 요청했을 때 쓴다.
---

# resolve-reviews

사용자가 리뷰 반영을 요청했을 때만 실행한다. `git`, `gh`(로그인 상태), `jq`가 필요하다.

**외부에 보이는 동작(푸시, PR 답글)은 5단계에서 사용자가 확인한 것만 한다.**

## 1. PR 데이터 모으기

```bash
PR_TMP=$(bash .agents/skills/resolve-reviews/scripts/get-pr-data.sh)
```

스크립트는 레포 밖 임시 폴더를 만들고 그 경로를 출력한다. 요약 줄은 stderr로 나온다.

| 파일                | 내용                                                                         |
| ------------------- | ---------------------------------------------------------------------------- |
| `pr.json`           | `repo`, `number`, `base`                                                     |
| `comments.json`     | 답글이 아닌 인라인 코멘트 (`id`, `path`, `line`, `body`, `user`, `outdated`) |
| `changed_files.txt` | 바뀐 파일 목록                                                               |
| `commits.txt`       | PR 커밋                                                                      |
| `diff.txt`          | 전체 diff                                                                    |

코멘트는 `gh api --paginate`로 모두 가져온다. `outdated`가 `true`인 코멘트는 현재 코드에 그 줄이 없으므로 diff를 보고 아직 유효한지 먼저 판단한다.

## 2. 코멘트마다 판단하기

### 판단 근거 (위가 우선)

1. **이 프로젝트의 규칙**: `AGENTS.md`, `.agents/skills/`의 스킬(`nextjs-fsd-architecture`, `data-and-forms`, `frontend-convention-review`)
2. **도구 결과**: ESLint, steiger(`pnpm lint:fsd`), `tsc`, Prettier가 내는 결과. 도구가 허용하는 것을 리뷰가 금지하면 1번 규칙에 근거가 있는지 본다.
3. **공식 문서의 권장 사항**: Next.js App Router, React, TanStack Query, react-hook-form, zod, Tailwind CSS, Feature-Sliced Design. 1·2번에 해당 규칙이 없을 때만 쓴다.

판단할 때 자주 보는 것:

- FSD 레이어 방향, slice 공개 API, 루트 `app/` 라우트에 로직이 들어갔는지
- Server Component와 `'use client'` 경계, `server-only`·`index.server.ts`, 클라이언트에서 `env`를 읽는지
- query 팩토리와 무효화 범위, 서버 prefetch가 팩토리 옵션을 그대로 쓰는지
- 폼 스키마 네이밍, mutation 제출, `ApiError` 처리
- 접근성(라벨, 역할, 키보드), 불필요한 리렌더나 effect
- 테스트가 바뀐 동작을 확인하는지

### 판정

- **VALID**: 리뷰가 맞다 → 3단계에서 고친다.
- **INVALID**: 근거를 들어 반박할 수 있다 → 고치지 않는다.
- **PARTIAL**: 의도는 맞지만 방법이나 범위가 애매하다 → 사용자에게 묻는다.

판정마다 근거 출처를 구체적으로 적는다(예: `AGENTS.md §스타일링`, `data-and-forms §무효화 범위`, `TanStack Query 문서: Query Invalidation`).

### PARTIAL 확인

코멘트를 하나씩 보여 주고 답을 받는다.

```text
PARTIAL: src/features/edit-profile/ui/EditProfileForm.tsx:42 (alice)
리뷰: "..."
판단: ...
반영할까요? (y: 반영 / n: 반영 안 함 / s: 보류)
```

`y`는 VALID, `n`은 INVALID, 그 밖의 답은 PENDING으로 둔다.

## 3. 고치기

- VALID 코멘트를 하나씩 고친다. 리뷰 범위 밖의 코드는 바꾸지 않는다.
- 고친 뒤 범위에 맞는 검사를 돌린다(`AGENTS.md §검증`). 실패하면 원인을 고치고, 고칠 수 없으면 그 코멘트를 PARTIAL로 돌린다.
- 커밋은 `git-commit` 스킬 규칙을 따르고, 코멘트와 커밋의 대응을 기록한다(`git rev-parse --short=7 HEAD`).

## 4. 결과 보고

```text
## resolve-reviews 결과

| # | 리뷰어 | 위치 | 판정 | 근거 | 조치 |
|---|--------|------|------|------|------|
| 1 | alice | src/_pages/home/ui/HomePage.tsx:12 | VALID | AGENTS.md §스타일링 | 수정 (abc1234) |
| 2 | bob | app/page.tsx:3 | INVALID | nextjs-fsd-architecture §라우트 파일 | 변경 없음 |
| 3 | alice | src/shared/api/interceptors.ts:20 | PARTIAL | - | 보류 |
```

## 5. 푸시와 답글 (사용자 확인 후)

보고 뒤에 아래를 한 번에 보여 주고 사용자의 확인을 받는다.

- 푸시할 커밋 목록 (`git log @{upstream}..HEAD --oneline`)
- 코멘트별로 달 답글 전문 ([references/reply-formats.md](references/reply-formats.md) 형식)

사용자가 승인한 것만 실행한다. 일부만 승인하면 그 부분만 한다.

1. 커밋 해시를 답글에 쓰므로 푸시를 먼저 한다.

   ```bash
   git push
   ```

2. 답글을 단다. `id`와 본문은 반드시 따옴표로 감싼다.

   ```bash
   REPO=$(jq -r .repo "$PR_TMP/pr.json")
   NUMBER=$(jq -r .number "$PR_TMP/pr.json")
   gh api "repos/$REPO/pulls/$NUMBER/comments/<comment_id>/replies" -f body="<답글>"
   ```

## 6. 정리

```bash
rm -rf "$PR_TMP"
```
