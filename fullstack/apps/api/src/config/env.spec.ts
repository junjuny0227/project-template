import { describe, expect, it } from 'vitest';

import { JWT_SECRET_PLACEHOLDER, validateEnv } from './env.js';

const valid = {
  DATABASE_URL: 'postgresql://template:template@localhost:5432/template',
  PORT: '4000',
  JWT_SECRET: 'test-only-secret-with-at-least-32-characters',
  CORS_ORIGINS: 'http://localhost:3000',
};
describe('환경 설정', () => {
  it('env 누락 시 부팅 실패', () => {
    for (const key of Object.keys(valid)) {
      const input: Record<string, unknown> = { ...valid };
      delete input[key];
      expect(() => validateEnv(input)).toThrow(key);
    }
    for (const secret of ['short', JWT_SECRET_PLACEHOLDER])
      expect(() => validateEnv({ ...valid, JWT_SECRET: secret })).toThrow('JWT_SECRET');
    expect(() => validateEnv({ ...valid, PORT: 'NaN' })).toThrow('PORT');
    expect(() => validateEnv({ ...valid, CORS_ORIGINS: '*' })).toThrow('CORS_ORIGINS');
    expect(validateEnv(valid).PORT).toBe(4000);
  });
  it('NODE_ENV는 없으면 development, 정해진 값이 아니면 부팅 실패', () => {
    expect(validateEnv(valid).NODE_ENV).toBe('development');
    expect(validateEnv({ ...valid, NODE_ENV: 'production' }).NODE_ENV).toBe('production');
    expect(() => validateEnv({ ...valid, NODE_ENV: 'prod' })).toThrow('NODE_ENV');
  });
});
