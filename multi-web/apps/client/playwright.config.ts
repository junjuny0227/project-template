import { defineConfig, devices } from '@playwright/test';

const port = 3000;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  reporter: 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // 루트 test:e2e가 먼저 빌드한 결과물을 띄운다. 스모크는 백엔드 없이 돈다.
  // 셸에 PORT가 잡혀 있어도 같은 주소로 뜨도록 포트를 직접 넘긴다.
  webServer: {
    command: `pnpm start --port ${port}`,
    url: baseURL,
    env: {
      API_BASE_URL: 'http://localhost:8080',
    },
    reuseExistingServer: false,
    timeout: 180 * 1000,
  },
});
