import { z } from 'zod';

// 서버에서만 읽는 값이다. 브라우저에는 전달되지 않으므로 클라이언트 코드에서 불러오면 검증에 실패한다.
const EnvSchema = z.object({
  API_BASE_URL: z.url({
    protocol: /^https?$/,
    error: (issue) =>
      issue.input === undefined
        ? '값이 없습니다. .env.example을 참고해 설정하세요.'
        : 'http 또는 https URL이어야 합니다.',
  }),
});

const parsed = EnvSchema.safeParse({
  API_BASE_URL: process.env.API_BASE_URL,
});

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join('\n');

  throw new Error(`환경 변수 검증에 실패했습니다.\n${details}`);
}

export const env = parsed.data;
