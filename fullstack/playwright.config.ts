import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // API의 DB 상태를 먼저 기다린 다음 실제 웹 빌드의 rewrite를 확인한다.
  // 기존 서버를 재사용하면 잘못된 환경의 프로세스로 통과할 수 있으므로 항상 직접 띄운다.
  webServer: [
    {
      command: 'pnpm --filter @repo/api start',
      url: 'http://localhost:4000/health',
      env: { PORT: '4000' },
      reuseExistingServer: false,
      timeout: 60 * 1000,
    },
    {
      command: 'pnpm --filter @repo/web build && pnpm --filter @repo/web start --port 3000',
      url: 'http://localhost:3000',
      env: { API_BASE_URL: 'http://localhost:4000' },
      reuseExistingServer: false,
      timeout: 180 * 1000,
    },
  ],
});
