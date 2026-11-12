export const JWT_SECRET_PLACEHOLDER = 'replace-this-placeholder-with-a-random-secret';
export const AUTH_COOKIE_NAME = 'access_token';
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
  if (errors.length) throw new Error(`환경 설정 오류: ${errors.join(', ')}`);
  return {
    ...input,
    DATABASE_URL: database,
    PORT: port,
    JWT_SECRET: secret,
    CORS_ORIGINS: origins.join(','),
  };
}
