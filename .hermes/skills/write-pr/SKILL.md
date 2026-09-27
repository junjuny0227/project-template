---
name: write-pr
description: Draft and create a pull request from branch changes.
version: 1.1.0
metadata:
  hermes:
    tags: [github, pull-request, conventions]
---

# Write a PR

Use this skill when the user asks to draft or open a PR. The original `.claude/skills/write-pr` title, body, label, preview, confirmation, and creation flow is retained below. Use `terminal` for Git/`gh`, `read_file` for references and the template, `write_file` for the draft, and `clarify` to confirm the title.

## Step 1 — Gather Context

Check `git status --short --branch`, the current branch, and the PR base (existing PR base, `origin/develop` if present, or the repository default branch). Use `terminal` for `git log origin/<base>..HEAD --oneline`, `git diff origin/<base>...HEAD --stat`, and the full diff. Do not silently fall back to the last five commits when the base is unknown: establish the real base first. Read `.github/PULL_REQUEST_TEMPLATE.md` with `read_file`. Account for uncommitted changes separately; the remote PR includes only pushed commits.

## Step 2 — Determine the Label

Read `references/labels.md` in this skill directory and select **exactly one** label based on the nature of the changes. When several labels apply, follow the priority order in that reference and keep only the top match. Read `references/commit-conventions.md` for commit type and scope naming rules.

## Step 3 — Generate PR Content

**Title** — Generate 3 options in the format `[scope] description`:

- Scope: determine from changed file paths and directory structure — infer the domain from path segments. Use `[global]` / `[ci/cd]` for cross-cutting changes only. Wrap in brackets: `[auth]`, `[user]`, etc.
- Description: Korean, concise, no emojis, max 50 characters total.
- Wrap class names, method names, annotations, file names, and technical terms in backticks (e.g., `@Transactional`, `QueryProjectServiceImpl`, `SKILL.md`). These are formatting examples, not declarations that the named symbols exist.

**Body** — Follow the `.github/PULL_REQUEST_TEMPLATE.md` structure:

- Korean 합쇼체: `~하였습니다`, `~되었습니다`, `~추가하였습니다`.
- No emojis.
- Max 2500 characters.
- Wrap all proper nouns and technical identifiers in backticks: class names, method names, annotations, file names, field names, config keys, module names, and agent names.

## Step 4 — Write Body & Show Preview

Create a dedicated draft directory under the Hermes scratch directory using `terminal` (`mktemp -d "${TMPDIR:?}/pr-draft.XXXXXX"`); write `PR_BODY.md` there with `write_file`. Display:

```text
## PR 제목 후보
1. [title1]
2. [title2]
3. [title3]

## 선택된 라벨
- label

## PR 본문 미리보기
[body content]
```

Use `clarify` to ask which title to use (options 1/2/3). Wait for the answer before proceeding. If the user asked for a draft only, stop after the preview and leave GitHub unchanged.

## Step 5 — Create PR

When the user requested PR creation, run the copied script with the confirmed title, absolute path to the scratch draft, and the single label:

```bash
bash .hermes/skills/write-pr/scripts/create-pr.sh "<confirmed-title>" "<scratch-dir>/PR_BODY.md" "<label>"
```

The script detects the base, falling back to the repository default if the inferred branch does not exist. It drops the label and creates the PR unlabeled when the repository does not have that label. Never create a missing label or swap in a different one — an unlabeled PR is the expected outcome there. Verify the created PR URL, body, and labels by reading it back with `gh pr view --json url,title,body,labels,baseRefName`. If the label was dropped, say so in one line. Remove only the dedicated scratch draft directory after verification; never remove other files.

## Pitfalls

The copied reference examples include other projects' scopes and classes. Derive the scope from this repository. Do not commit or push merely to prepare the PR unless the user requested it. Creation fails if the branch has no remote commits or `gh` is not authenticated; report the blocker rather than inventing a URL.
