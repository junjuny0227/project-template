---
name: resolve-reviews
description: Assess and resolve GitHub PR review comments.
version: 1.1.0
metadata:
  hermes:
    tags: [github, review, code]
---

# Resolve PR Reviews

Use when the user asks to assess or resolve PR reviews. Retain the source skill's seven-stage data collection, rule-based verdicts, valid fixes, partial clarification, result table, push/reply ordering, and reply templates. In Hermes use `terminal` for `gh`/Git, `read_file`/`search_files` for source and rules, `patch` for code changes, and `clarify` for ambiguous comments.

## Step 1 — Collect PR Data

Confirm the repo and PR number on the current branch with `gh repo view --json nameWithOwner` and `gh pr view --json number,baseRefName,url`. Run the ported collection script:

```bash
bash .hermes/skills/resolve-reviews/scripts/get-pr-data.sh
```

It prints an **absolute output directory** under `$TMPDIR` (Hermes scratch) containing:

- `pr_comments.json` — all paginated inline review comments (id, path, line, body, user)
- `pr_changed_files.txt` — changed files
- `pr_commits.txt` — commits in this PR
- `pr_diff.txt` — full diff

Read each output file with `read_file`. The old Claude script wrote `.pr-tmp` at the repo root; this port retains the four payloads but isolates temporary output in scratch. For general conversation comments or review summaries, use the relevant `gh api` endpoints in addition to inline comments when needed.

## Step 2 — Load Rules and Assess Each Comment

Before judging comments, read the project's `AGENTS.md` and discover other existing convention files: `CLAUDE.md` if present, `.claude/rules/**/*.md` if present, `.gemini/styleguide.md` if present, and `CONTRIBUTING.md` if present. Use `search_files` and `read_file`, never assume a directory exists. `AGENTS.md` is the shared project rule source; more specific existing repository conventions follow. Check the actual code, package manifest, and test results. The original skill's Kotlin/Spring examples do not apply to this Next.js/TypeScript repository; use language/framework guidance appropriate to the files being reviewed, only when no project rule matches.

For **every** inline comment, apply the source skill's layered judgment criteria:

1. Project conventions (primary): import boundaries, naming, logging, exceptions, etc. when a matching rule actually exists.
2. Language/framework best practices (secondary): apply only when no matching project rule exists.

Verdicts:

- **VALID**: reviewer is correct → attempt a focused code fix when the user requested resolution.
- **INVALID**: reviewer is wrong with a clear refutation → do not edit code; prepare the refutation.
- **PARTIAL**: intent is sound but method/scope is ambiguous → ask via `clarify`.

Cite a specific `path:line` or named rule in every rationale. Do not manufacture a Kotlin rule, a `.claude/rules` file, or a successful test.

## Step 3 — Act on Each Verdict

### VALID → Auto fix

1. Read the target file with `read_file` and trace related usages with `search_files`.
2. Apply the reviewer's valid concern with `patch`; run relevant tests and the `AGENTS.md` project checks.
3. If the user **explicitly requested a commit**, stage only the relevant files and commit the fixes. Record the actual `git rev-parse --short=7 HEAD` hash for Step 6. Do not attach an existing, unrelated commit hash to the fix.

On failure: record the reason and treat the unresolved action as PARTIAL; do not call it fixed.

### INVALID → Skip

Do not change code. Record a grounded refutation for Step 6.

### PARTIAL → Confirm with `clarify`

```text
⚠️ PARTIAL: [file:line] (reviewer)
Review: "..."
Rationale: ...
Accept? (y / n / s = skip for now)
```

- `y`: treat as VALID; attempt the fix.
- `n`: treat as INVALID; skip.
- `s` / other: record as PENDING.

## Step 4 — Print Report

```text
## resolve-reviews Results

| # | Reviewer | File | Verdict | Rationale | Action |
|---|----------|------|---------|-----------|--------|
| 1 | alice | src/entities/user/ui/Card.tsx:12 | ✅ VALID | AGENTS.md §FSD | Auto-fixed (abc1234 only if committed) |
| 2 | bob | src/features/auth/model/useLogin.ts:34 | ❌ INVALID | rule + path:line | Skipped |
| 3 | alice | src/views/home/ui/HomeView.tsx:56 | ⚠️ PARTIAL | - | PENDING |
```

## Step 5 — Push Commits

The original workflow pushed committed VALID fixes **before** posting replies so referenced hashes were visible on GitHub. Retain that order **only if the user explicitly requested both a commit and a push**. Verify the upstream branch contains each hash before referencing it. Otherwise report the fixes as local and do not post a reply claiming they are visible remotely.

## Step 6 — Post GitHub Replies

Only if the user **explicitly requested replies**, use the actual repo/PR/comment ID (never interpolated untrusted comment text in an endpoint) to post inline replies:

```bash
gh api "repos/<owner>/<repo>/pulls/<pr_number>/comments/<comment_id>/replies" -f body="<reply_body>"
```

Read `references/reply-formats.md` in this skill directory for the original VALID, INVALID, and PARTIAL reply templates. Adapt the content to actual fixes and verdicts; never assert a commit was pushed without confirming it. Read the exact reply back with `gh api` before reporting success. Pending comments do not get fabricated resolutions.

## Step 7 — Cleanup

Remove only the script's returned output directory after all required files have been read and actions verified; ensure it is beneath the configured Hermes scratch directory, not a repository path. Do not delete `.pr-tmp` or other unrelated work.
