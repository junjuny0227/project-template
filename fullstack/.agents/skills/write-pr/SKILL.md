---
name: write-pr
description: base 브랜치 이후의 커밋으로 PR 제목 후보, 본문, 라벨 하나를 만들고 사용자가 고른 제목으로 GitHub PR을 연다. base는 develop이 있으면 develop, 없으면 기본 브랜치다. 사용자가 PR 생성을 요청했을 때 쓴다.
---

# write-pr

사용자가 PR 생성을 요청했을 때만 실행한다. `git`과 `gh`(GitHub CLI, 로그인 상태)가 필요하다.

## 1. base 브랜치 정하기

원격에 `develop`이 있으면 `develop`, 없으면 저장소의 기본 브랜치를 base로 쓴다.

```bash
if git ls-remote --exit-code --heads origin develop >/dev/null 2>&1; then
  BASE=develop
else
  BASE=$(gh repo view --json defaultBranchRef -q .defaultBranchRef.name)
fi
git fetch origin "$BASE"
```

사용자가 base를 지정했으면 그것을 쓴다.

## 2. 맥락 모으기

```bash
git branch --show-current
git log "origin/$BASE..HEAD" --oneline
git diff "origin/$BASE...HEAD" --stat
git diff "origin/$BASE...HEAD"
cat .github/PULL_REQUEST_TEMPLATE.md
```

현재 브랜치가 base와 같거나 base 이후 커밋이 없으면 PR을 만들지 않고 사용자에게 알린다. 아직 푸시하지 않은 브랜치면 푸시해도 되는지 먼저 묻는다.

## 3. 라벨 고르기

[references/labels.md](references/labels.md)를 읽고 라벨을 **정확히 하나** 고른다. GitHub 기본 라벨(`bug`, `enhancement`, `documentation`)만 쓴다.

## 4. 제목과 본문 만들기

제목 규칙과 scope 고르는 법은 `git-commit` 스킬의 [commit-conventions.md](../git-commit/references/commit-conventions.md)를 따른다.

- **제목**: `[scope] 설명` 형식으로 후보 3개를 만든다.
- **본문**: `.github/PULL_REQUEST_TEMPLATE.md`의 절 구조를 그대로 따른다.
  - 합쇼체로 쓴다(`~하였습니다`, `~추가하였습니다`). 이모지는 쓰지 않는다. 2500자 이내로 쓴다.
  - 컴포넌트·함수·파일·설정 키 같은 식별자는 백틱으로 감싼다.
  - 검증 결과 체크리스트에는 실제로 실행한 검사만 체크한다. 실행하지 않은 검사는 체크하지 않고 이유를 적는다.
  - 해당하지 않는 선택 절(스크린샷 등)은 템플릿 안내대로 지운다.

본문은 레포 밖 임시 파일에 쓴다.

```bash
BODY_FILE=$(mktemp "${TMPDIR:-/tmp}/pr-body.XXXXXX")
```

## 5. 미리보기와 확인

아래 형식으로 보여 주고, 사용자가 제목 번호를 고르거나 내용을 고칠 때까지 기다린다. 답을 받기 전에는 PR을 만들지 않는다.

```text
## PR 제목 후보
1. [scope] ...
2. [scope] ...
3. [scope] ...

## base
- develop

## 라벨
- enhancement

## PR 본문 미리보기
...
```

## 6. PR 만들기

```bash
bash .agents/skills/write-pr/scripts/create-pr.sh "<고른 제목>" "$BODY_FILE" "<라벨>" "$BASE"
```

- 저장소에 그 라벨이 없으면 스크립트가 라벨 없이 PR을 만든다. 라벨을 새로 만들거나 다른 라벨로 바꾸지 않는다.
- 만든 뒤 PR URL을 보여 준다. 라벨이 빠졌으면 한 줄로 알린다.
- 끝나면 `rm -f "$BODY_FILE"`로 임시 파일을 지운다.
