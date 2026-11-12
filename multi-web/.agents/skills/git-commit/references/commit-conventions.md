# 커밋·PR 컨벤션

`git-commit`과 `write-pr`이 함께 쓰는 문서다. 이 한 벌만 고친다.

## 커밋 메시지

형식: `type(scope): 설명`

| type       | 쓰는 때                                    |
| ---------- | ------------------------------------------ |
| `add`      | 새 기능, 새 파일, 새 slice                 |
| `update`   | 기존 기능 변경, 의존성·설정 변경           |
| `fix`      | 버그 수정                                  |
| `refactor` | 동작을 바꾸지 않는 구조 개선               |
| `ci/cd`    | CI 워크플로, 배포 설정                     |
| `docs`     | 문서만 바꾼 경우 (README, AGENTS.md, 스킬) |
| `test`     | 테스트만 추가하거나 고친 경우              |
| `merge`    | 병합 커밋                                  |

- 제목 한 줄만 쓴다. 본문은 쓰지 않는다.
- 설명은 한국어로 쓰고 마침표를 찍지 않는다.
- 설명은 명사형으로 끝낸다. `~한다/~된다`, `~하기/~하기 위해`, `~합니다/~됩니다`, `~했습니다`로 끝내지 않는다.
  - 좋은 예: `프로필 수정 폼 추가`, `401 응답 시 로그인 이동 누락 수정`, `query key factory 정리`

## scope 고르기

우선순위는 **도메인 이름 > 모듈 이름**이다. 고정 목록을 쓰지 않고 바뀐 파일 경로에서 찾는다.

1. `git diff --name-only`로 바뀐 경로를 본다.
2. FSD slice 이름을 scope로 쓴다.
   - `src/entities/user/**` → `user`
   - `src/features/edit-profile/**` → `profile` 또는 slice 이름 `edit-profile`
   - `src/_pages/home/**`, `app/page.tsx` → `home`
3. 한 slice에 속하지 않는 변경만 모듈 이름을 쓴다.

| scope    | 쓰는 때                                                    |
| -------- | ---------------------------------------------------------- |
| `api`    | `src/shared/api`만 바꾼 경우                               |
| `config` | `src/shared/config`, 환경 변수 검증만 바꾼 경우            |
| `ui`     | `src/shared/ui`, 전역 스타일(`globals.css`)만 바꾼 경우    |
| `global` | 여러 도메인이나 프로젝트 전체에 걸친 변경 (ESLint, 의존성) |
| `ci/cd`  | `.github/workflows`                                        |

## 예

```text
# 맞음
add(profile): 프로필 수정 폼 추가
fix(auth): 401 응답 시 로그인 이동 누락 수정
update(user): 사용자 목록 조회 필터 추가
refactor(api): ApiError 변환 로직 분리
update(global): ESLint 규칙 추가
update(ci/cd): CI에 E2E 단계 추가

# 틀림 — 도메인 변경인데 모듈 이름을 scope로 씀
fix(features): 버그 수정
update(shared): 사용자 타입 수정
```

## PR 제목

- 형식: `[scope] 설명`. scope는 커밋과 같은 규칙으로 정하고 대괄호로 감싼다(`[profile]`, `[global]`).
- 설명은 한국어로 짧게 쓴다. 이모지를 쓰지 않고 전체 50자 이내로 한다.
- 컴포넌트·함수·파일 이름 같은 식별자는 백틱으로 감싼다(`` `HomePage` ``, `` `getQueryClient` ``).
