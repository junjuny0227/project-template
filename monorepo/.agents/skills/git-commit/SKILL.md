---
name: git-commit
description: 변경을 논리 단위로 나눠 프로젝트 커밋 컨벤션(type(scope) 설명)대로 커밋한다. develop 브랜치에서 시작하면 Git Flow에 맞게 작업 브랜치를 먼저 만든다. 사용자가 커밋을 요청했을 때 쓴다.
---

# git-commit

사용자가 커밋을 요청했을 때만 실행한다. 푸시는 이 스킬의 범위가 아니다.

## 1. 브랜치 확인

```bash
git branch --show-current
```

현재 브랜치가 `develop`이면 바로 커밋하지 않는다. 이 프로젝트는 Git Flow를 쓴다. 작업 브랜치는 `develop`에서 만들고 `develop`으로 병합한다.

1. `git status`와 `git diff`로 변경 전체를 본다.
2. 변경에서 브랜치 이름을 정한다.
   - 형식: `<type>/<kebab-case-설명>`. type은 계획한 커밋 type과 같게 쓴다. `ci/cd`만 `cicd/`로 쓴다.
   - 설명에 도메인(slice 이름)을 담는다.
   - 예: `add/profile-edit-form`, `fix/login-redirect-loop`, `refactor/user-query-keys`
3. 브랜치를 만들고 이동한다.

   ```bash
   git checkout -b <type>/<name>
   ```

`develop`이 아니면 그대로 다음 단계로 간다.

## 2. 커밋 메시지 규칙

형식, type, scope, 설명 규칙은 [references/commit-conventions.md](references/commit-conventions.md)에 있다. 커밋 전에 읽는다.

요약:

- `type(scope): 설명` 한 줄만 쓴다. 본문은 쓰지 않는다.
- type: `add` / `update` / `fix` / `refactor` / `ci/cd` / `docs` / `test` / `merge`
- scope: 바뀐 파일 경로에서 도메인(slice 이름)을 찾는다. 여러 도메인에 걸친 변경만 `global`이나 모듈 이름을 쓴다.
- 설명: 한국어, 마침표 없음, 명사형으로 끝낸다(`프로필 수정 폼 추가`).
- AI 도구를 co-author로 넣지 않는다.

## 3. 커밋 흐름

1. `git status`, `git diff`로 변경을 확인한다.
2. 변경을 논리 단위(기능 추가, 버그 수정, 리팩터링, 설정, 문서 등)로 나눈다.
3. 단위마다 관련 파일만 stage하고 커밋한다.

   ```bash
   git add <files>
   git commit -m "<type>(<scope>): <설명>"
   ```

4. `git log --oneline -n <커밋 수>`로 결과를 보여 준다.

- pre-commit hook(lint-staged)이 파일을 고치거나 커밋을 막으면, 고친 내용을 확인하고 원인을 고친 뒤 다시 커밋한다. `--no-verify`로 hook을 건너뛰지 않는다.
- `.env.local` 같은 환경·자격 증명 파일은 stage하지 않는다.
