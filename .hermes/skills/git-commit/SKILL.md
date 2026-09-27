---
name: git-commit
description: Split project changes into convention-compliant commits.
version: 1.1.0
metadata:
  hermes:
    tags: [git, commit, conventions]
---

## Step 0 — Branch Check (Required)

Check the current branch first:

```bash
git branch --show-current
```

**If current branch is `develop`:**

This project uses Git Flow. Feature branches must be created from `develop` and merged back into `develop`.

1. Analyze all changes with `git status` and `git diff`
2. Infer an appropriate branch name from the changes:
   - Format: `<type>/<kebab-case-description>` — use the same type as the planned commit (exception: use `cicd/` for `ci/cd` type)
   - Reflect the domain scope in the name
   - Examples: `add/add-student-major-filter`, `fix/auth-api-key-deletion`, `refactor/optimize-club-query`
3. Create and checkout the branch:
   ```bash
   git checkout -b <type>/<inferred-name>
   ```
4. Proceed with the commit flow below

**If current branch is NOT `develop`:** proceed directly to the commit flow.

---

## Commit Message Rules

Format: `type(scope): description`

- **Types**: `add` / `update` / `fix` / `refactor` / `ci/cd` / `docs` / `test` / `merge`
- **Scope**: domain name by default — for the full selection table, read `.hermes/skills/git-commit/references/scope-guide.md`; for type/scope conventions, read `.hermes/skills/git-commit/references/commit-conventions.md`
- **Description**: Korean, no period, avoid endings: `~한다/~된다`, `~하기`, `~합니다/~됩니다`, `~했습니다`
  - Good examples: `엔티티 필드 추가`, `트랜잭션 롤백 방지`, `로직 개선`
- Subject line only (no body)

## Commit Flow

1. Inspect changes with `terminal`: `git status --short --branch`, `git diff`, `git diff --cached`, and untracked paths. Read the content of every file before staging.
2. Categorize into logical units (feature / bug fix / refactoring / etc.)
3. Group files per unit
4. For each group:
   - Stage only relevant files with `git add` (prefer explicit paths; preserve pre-existing staged changes)
   - Write a commit message following the rules above
   - `git commit -m "message"`
5. Verify with `git log --oneline -n <count>`

## Hermes adaptation

Use `terminal` for Git commands and `read_file` for `references/commit-conventions.md` and `references/scope-guide.md` in this skill directory before choosing type/scope. The original examples in those references illustrate domain naming; inspect this repository rather than assuming their sample modules exist. Create a branch from `develop` only if it actually is the current branch. Never commit, push, or change branches unless requested by the user. Verify each commit and leave unrelated work untouched.
