import type { NextConfig } from 'next';

import { env } from './src/shared/config';

const nextConfig: NextConfig = {
  reactCompiler: true,
  transpilePackages: ['@repo/core', '@repo/ui'],

  // AGENTS.md는 이 프로젝트가 직접 관리한다. next dev가 내용을 덧붙이지 않게 한다.
  agentRules: false,

  // 브라우저의 /backend/* 요청을 API 서버로 넘긴다. /api/*는 Route Handler용으로 남겨 둔다.
  async rewrites() {
    return [
      {
        source: '/backend/:path*',
        destination: `${env.API_BASE_URL}/:path*`,
      },
    ];
  },
};

export default nextConfig;
