import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

// shared/ui 등 컴포넌트 테스트를 위해 앱과 같은 jsdom 환경을 쓴다.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./vitest.setup.ts'],
    reporters: ['verbose'],
    unstubEnvs: true,
  },
});
