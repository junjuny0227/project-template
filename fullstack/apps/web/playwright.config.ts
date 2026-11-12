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
  // 배포와 같은 조건으로 확인하려고 빌드한 뒤 띄운다. 스모크는 백엔드 없이 돈다.
  // 셸에 PORT가 잡혀 있어도 같은 주소로 뜨도록 포트를 직접 넘긴다.
  webServer: {
    command: `pnpm build && pnpm start --port ${port}`,
    url: baseURL,
    env: {
      API_BASE_URL: 'http://localhost:4000',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 180 * 1000,
  },
});
