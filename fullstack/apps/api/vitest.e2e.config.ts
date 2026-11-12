import { defineConfig } from 'vitest/config';

import base from './vitest.config.js';

// 로컬에서 .env를 만들어 두면 e2e도 같은 값을 읽는다. 이미 설정된 환경 변수가 우선한다.
try {
  process.loadEnvFile('.env');
} catch {
  // .env가 없으면 명령에서 주입한 환경 변수만 쓴다.
}

export default defineConfig({
  ...base,
  test: {
    ...base.test,
    include: ['test/**/*.e2e-spec.ts'],
    testTimeout: 20000,
    hookTimeout: 30000,
    fileParallelism: false,
  },
});
