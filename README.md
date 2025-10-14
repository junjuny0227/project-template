# 프로젝트 설정

## 초기 설정

프로젝트를 시작하기 위해, 다음 명령어를 실행하여 초기 설정을 진행합니다.

```bash
bash scripts/init.sh
```

해당 스크립트는 프로젝트 구조를 설정하고 필요한 모든 의존성을 자동으로 설치합니다. 실행 과정에서 `layered`와 `fsd` 두 가지 아키텍처 중 하나를 선택할 수 있습니다.

## 환경 변수

초기 설정이 완료되면 프로젝트 루트에 `.env.local` 파일이 생성됩니다. 애플리케이션이 올바르게 동작하려면 아래 환경 변수 값을 실제 API 엔드포인트로 수정해야 합니다.

```.env.local
NEXT_PUBLIC_API_BASE_URL=your_api_url
```

## CI/CD

이 프로젝트는 Pull Request 시 CI 워크플로우가 실행되도록 설정되어 있습니다. CI 과정에서 프로젝트 빌드를 위해 `NEXT_PUBLIC_API_BASE_URL` 환경 변수가 필요합니다.

워크플로우가 정상적으로 동작하려면, GitHub 저장소의 **Settings > Secrets and variables > Actions** 메뉴에서 다음 Repository Secret을 추가해야 합니다.

- **Name:** `NEXT_PUBLIC_API_BASE_URL`
- **Value:** (실제 API 엔드포인트)

---

# 주요 의존성

이 프로젝트는 다음의 주요 라이브러리 및 프레임워크를 기반으로 구축되었습니다.

**기반 스택:** Next.js `15.5.5`, React `19.1.0`, TypeScript `^5`

### UI

- **tailwindcss `^4`**: 유틸리티 우선 CSS 프레임워크
- **clsx `^2.1.1`**: 조건부 클래스 생성을 위한 유틸리티
- **tailwind-merge `^3.3.1`**: Tailwind CSS 클래스 병합 유틸리티

### API 통신 및 데이터 관리

- **axios `^1.12.2`**: HTTP 클라이언트
- **@tanstack/react-query `^5.90.3`**: 서버 상태 관리를 위한 라이브러리

### Form 및 유효성 검증

- **react-hook-form `^7.65.0`**: 성능과 확장성을 고려한 폼 관리 라이브러리
- **zod `^3.25.76`**: 타입 안전 스키마 선언 및 유효성 검증
- **@hookform/resolvers `^5.2.2`**: `react-hook-form`과 Zod를 통합하기 위한 리졸버

### 코드 스타일 및 품질

- **ESLint `^9`**: 코드 분석 및 스타일 일관성 유지 도구
- **Prettier `^3.6.2`**: 코드 포맷터
