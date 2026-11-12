import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppEnvSchema, parseEnv } from './appEnv';

describe('parseEnv(AppEnvSchema)', () => {
  it('API_BASE_URL이 없으면 throw한다', () => {
    expect(() => parseEnv(AppEnvSchema, {})).toThrow('API_BASE_URL: 값이 없습니다');
  });

  it('API_BASE_URL이 http(s) URL이 아니면 throw한다', () => {
    expect(() => parseEnv(AppEnvSchema, { API_BASE_URL: 'localhost:8080' })).toThrow(
      'API_BASE_URL: http 또는 https URL이어야 합니다',
    );
  });

  it('NEXT_PUBLIC_API_MOCKING이 enabled·disabled가 아니면 throw한다', () => {
    expect(() =>
      parseEnv(AppEnvSchema, {
        API_BASE_URL: 'http://localhost:8080',
        NEXT_PUBLIC_API_MOCKING: 'true',
      }),
    ).toThrow('NEXT_PUBLIC_API_MOCKING: enabled 또는 disabled여야 합니다');
  });

  it('올바른 값은 그대로 준다', () => {
    expect(
      parseEnv(AppEnvSchema, {
        API_BASE_URL: 'https://api.example.com',
        NEXT_PUBLIC_API_MOCKING: undefined,
      }),
    ).toEqual({ API_BASE_URL: 'https://api.example.com' });
  });

  it('앱이 extend한 변수도 함께 검증한다', () => {
    const Schema = AppEnvSchema.extend({ SITE_NAME: z.string().min(1) });

    expect(() => parseEnv(Schema, { API_BASE_URL: 'http://localhost:8080' })).toThrow('SITE_NAME:');
    expect(
      parseEnv(Schema, { API_BASE_URL: 'http://localhost:8080', SITE_NAME: 'admin' }).SITE_NAME,
    ).toBe('admin');
  });
});
