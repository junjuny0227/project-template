import { describe, expect, it } from 'vitest';

import { createNextConfig } from './index';

const env = { API_BASE_URL: 'http://localhost:8080' };

describe('createNextConfig', () => {
  it('모킹 플래그가 없으면 disabled로 고정한다', () => {
    expect(createNextConfig(env).env).toEqual({ NEXT_PUBLIC_API_MOCKING: 'disabled' });
  });

  it('모킹 플래그가 있으면 그 값을 쓴다', () => {
    const config = createNextConfig({ ...env, NEXT_PUBLIC_API_MOCKING: 'enabled' });

    expect(config.env?.NEXT_PUBLIC_API_MOCKING).toBe('enabled');
  });

  it('/backend 요청을 API_BASE_URL로 넘긴다', async () => {
    await expect(createNextConfig(env).rewrites?.()).resolves.toEqual([
      { source: '/backend/:path*', destination: 'http://localhost:8080/:path*' },
    ]);
  });

  it('앱 rewrites는 /backend 뒤에 붙인다', async () => {
    const config = createNextConfig(env, {
      rewrites: async () => [{ source: '/docs', destination: 'https://example.com/docs' }],
    });

    await expect(config.rewrites?.()).resolves.toEqual([
      { source: '/backend/:path*', destination: 'http://localhost:8080/:path*' },
      { source: '/docs', destination: 'https://example.com/docs' },
    ]);
  });

  it('객체 형태의 앱 rewrites는 afterFiles 앞에 /backend를 둔다', async () => {
    const config = createNextConfig(env, {
      rewrites: async () => ({
        beforeFiles: [],
        afterFiles: [{ source: '/a', destination: '/b' }],
        fallback: [],
      }),
    });

    await expect(config.rewrites?.()).resolves.toEqual({
      beforeFiles: [],
      afterFiles: [
        { source: '/backend/:path*', destination: 'http://localhost:8080/:path*' },
        { source: '/a', destination: '/b' },
      ],
      fallback: [],
    });
  });

  it('transpilePackages와 env는 공통 값에 더한다', () => {
    const config = createNextConfig(env, {
      transpilePackages: ['some-package'],
      env: { EXTRA: '1' },
      images: { remotePatterns: [] },
    });

    expect(config.transpilePackages).toEqual([
      '@repo/core',
      '@repo/mocks',
      '@repo/ui',
      'some-package',
    ]);
    expect(config.env).toEqual({ EXTRA: '1', NEXT_PUBLIC_API_MOCKING: 'disabled' });
    expect(config.images).toEqual({ remotePatterns: [] });
    expect(config.agentRules).toBe(false);
  });
});
