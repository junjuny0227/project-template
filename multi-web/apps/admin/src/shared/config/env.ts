import { z } from 'zod';

// 서버에서만 불러온다. API_BASE_URL은 브라우저에 전달되지 않으므로 클라이언트 코드에서 불러오면 검증에 실패한다.
const EnvSchema = z.object({
  API_BASE_URL: z.url({
    protocol: /^https?$/,
    error: (issue) =>
      issue.input === undefined
        ? '값이 없습니다. .env.example을 참고해 설정하세요.'
        : 'http 또는 https URL이어야 합니다.',
  }),
  // `enabled`일 때만 API 모킹(MSW)을 켠다. 운영 환경에서는 설정하지 않는다.
  // 이 스키마는 값을 확인해 next.config.ts에 넘기는 데만 쓴다. 모킹을 켜고 끄는 코드는 `env` 대신
  // `process.env.NEXT_PUBLIC_API_MOCKING === 'enabled'`를 그대로 쓴다. Next가 빌드할 때 이 비교를
  // 값으로 바꿔야 모킹을 끈 빌드에서 MSW 코드가 빠진다.
  NEXT_PUBLIC_API_MOCKING: z
    .enum(['enabled', 'disabled'], { error: 'enabled 또는 disabled여야 합니다.' })
    .optional(),
});

const parsed = EnvSchema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL,
  NEXT_PUBLIC_API_MOCKING: process.env.NEXT_PUBLIC_API_MOCKING,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`환경 변수 검증에 실패했습니다.\n${details}`);
}

export const env = parsed.data;
