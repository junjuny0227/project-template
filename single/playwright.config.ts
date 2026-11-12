import { defineConfig, devices } from '@playwright/test';

const port = 3000;
const mockingPort = 3100;
const baseURL = `http://localhost:${port}`;
const mockingBaseURL = `http://localhost:${mockingPort}`;
const apiBaseURL = 'http://localhost:8080';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      // 모킹을 끈 운영 빌드에서 돈다.
      name: 'chromium',
      testIgnore: 'mocking-on.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL },
    },
    {
      // 모킹을 켠 개발 서버에서 돈다. 처음 요청할 때 컴파일하므로 기다리는 시간을 넉넉히 둔다.
      name: 'mocking',
      testMatch: 'mocking-on.spec.ts',
      expect: { timeout: 20 * 1000 },
      use: { ...devices['Desktop Chrome'], baseURL: mockingBaseURL },
    },
  ],
  // 두 서버 모두 백엔드 없이 뜬다. 셸이나 .env.local의 값과 상관없이 같은 조건이 되도록
  // 모킹 여부와 포트를 직접 넘긴다.
  webServer: [
    {
      // 배포와 같은 조건으로 확인하려고 빌드한 뒤 띄운다.
      command: `pnpm build && pnpm start --port ${port}`,
      url: baseURL,
      env: {
        API_BASE_URL: apiBaseURL,
        NEXT_PUBLIC_API_MOCKING: 'disabled',
      },
      reuseExistingServer: false,
      timeout: 180 * 1000,
    },
    {
      // 모킹은 개발할 때 쓰는 기능이라 pnpm dev와 같은 방식으로 띄운다.
      command: `pnpm dev --port ${mockingPort}`,
      url: mockingBaseURL,
      env: {
        API_BASE_URL: apiBaseURL,
        NEXT_PUBLIC_API_MOCKING: 'enabled',
      },
      reuseExistingServer: false,
      timeout: 180 * 1000,
    },
  ],
});
