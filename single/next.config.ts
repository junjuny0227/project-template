import type { NextConfig } from 'next';

import { env } from './src/shared/config';

const nextConfig: NextConfig = {
  reactCompiler: true,

  // NEXT_PUBLIC_API_MOCKING이 없을 때도 값을 정해 둔다.
  // 값이 정해져 있어야 Next가 빌드할 때 모킹 분기를 통째로 지워서 MSW 코드가 결과물에 남지 않는다.
  env: {
    NEXT_PUBLIC_API_MOCKING: env.NEXT_PUBLIC_API_MOCKING ?? 'disabled',
  },

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
