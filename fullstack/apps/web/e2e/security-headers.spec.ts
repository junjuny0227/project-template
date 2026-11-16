import { expect, test } from '@playwright/test';

// chromium 프로젝트는 모킹을 끈 운영 빌드에서 실행한다.
for (const path of ['/', '/security-headers-missing-route']) {
  test(`${path}: 기본 보안 헤더를 보낸다`, async ({ request }) => {
    const response = await request.get(path);
    expect(response.status()).toBe(path === '/' ? 200 : 404);
    const headers = response.headers();
    expect(headers['strict-transport-security']).toBe('max-age=63072000; includeSubDomains');
    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['permissions-policy']).toBe('camera=(), microphone=(), geolocation=()');
    expect(headers).not.toHaveProperty('x-powered-by');
    expect(headers).not.toHaveProperty('content-security-policy');
  });
}
