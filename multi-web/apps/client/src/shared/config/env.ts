import { AppEnvSchema, parseEnv } from '@repo/core/shared/config';

// 서버에서만 불러온다. API_BASE_URL은 브라우저에 전달되지 않으므로 클라이언트 코드에서 불러오면 검증에 실패한다.
// 공통 변수와 검증 규칙은 core의 AppEnvSchema에 있다. 이 앱 전용 변수는 AppEnvSchema.extend({...})로 더하고
// 아래 객체에 process.env 값을 함께 넘긴다.
export const env = parseEnv(AppEnvSchema, {
  API_BASE_URL: process.env.API_BASE_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
});
