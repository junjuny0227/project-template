# project-template

Next.js + TypeScript + Tailwind CSS + shadcn/ui 템플릿

## 🚀 시작하기

### 1. 프로젝트 클론

```bash
git clone https://github.com/junjuny0227/project-template.git
cd project-template
```

### 2. 의존성 설치

```bash
pnpm install
```

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 API URL을 설정하세요:

```env
NEXT_PUBLIC_API_BASE_URL=your-api-base-url
```

### 4. 개발 서버 실행

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000)에서 확인

## ⚙️ CI 설정

GitHub Repository Secrets에 다음을 추가하세요:

```
NEXT_PUBLIC_API_BASE_URL: your-api-base-url
```
