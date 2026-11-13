export const JWT_SECRET_PLACEHOLDER = 'replace-this-placeholder-with-a-random-secret';
export const AUTH_COOKIE_NAME = 'access_token';
export const NODE_ENVS = ['development', 'test', 'production'] as const;
export type NodeEnv = (typeof NODE_ENVS)[number];
export function validateEnv(input: Record<string, unknown>) {
  const errors: string[] = [];
  const database = String(input.DATABASE_URL ?? '');
  try {
    if (!['postgresql:', 'postgres:'].includes(new URL(database).protocol))
      errors.push('DATABASE_URL');
  } catch {
    errors.push('DATABASE_URL');
  }
  const port = Number(input.PORT);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT');
  const secret = String(input.JWT_SECRET ?? '');
  if (secret.length < 32 || secret === JWT_SECRET_PLACEHOLDER)
    errors.push('JWT_SECRET (32자 이상, 예제 자리표시자 사용 금지)');
  const origins = String(input.CORS_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim());
  if (
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return !['http:', 'https:'].includes(url.protocol) || url.origin !== origin;
      } catch {
        return true;
      }
    })
  )
    errors.push('CORS_ORIGINS');
  // 없으면 development다. 오타(예: prod)를 그대로 두면 운영 보호(Swagger 비활성, 5xx 메시지 숨김)가 꺼지므로 거부한다.
  const nodeEnv = String(input.NODE_ENV ?? 'development');
  if (!(NODE_ENVS as readonly string[]).includes(nodeEnv))
    errors.push(`NODE_ENV (${NODE_ENVS.join('|')})`);
  if (errors.length) throw new Error(`환경 설정 오류: ${errors.join(', ')}`);
  return {
    ...input,
    DATABASE_URL: database,
    PORT: port,
    JWT_SECRET: secret,
    CORS_ORIGINS: origins.join(','),
    NODE_ENV: nodeEnv as NodeEnv,
  };
}
