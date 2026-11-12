import type { NextConfig } from 'next';

type Rewrites = Awaited<ReturnType<NonNullable<NextConfig['rewrites']>>>;

export interface AppEnvType {
  API_BASE_URL: string;
  NEXT_PUBLIC_API_MOCKING?: 'enabled' | 'disabled';
}

// 두 앱이 함께 지켜야 하는 Next 설정이다. 앱 전용 설정은 overrides로 더한다.
// transpilePackages와 rewrites는 덮어쓰지 않고 공통 값 뒤에 이어 붙인다.
export const createNextConfig = (env: AppEnvType, overrides: NextConfig = {}): NextConfig => {
  const { transpilePackages = [], rewrites, env: extraEnv, ...rest } = overrides;

  return {
    reactCompiler: true,

    // AGENTS.md는 이 프로젝트가 직접 관리한다. next dev가 내용을 덧붙이지 않게 한다.
    agentRules: false,

    ...rest,

    transpilePackages: ['@repo/core', '@repo/mocks', '@repo/ui', ...transpilePackages],

    // NEXT_PUBLIC_API_MOCKING이 없을 때도 값을 정해 둔다.
    // 값이 정해져 있어야 Next가 빌드할 때 모킹 분기를 통째로 지워서 MSW 코드가 결과물에 남지 않는다.
    env: {
      ...extraEnv,
      NEXT_PUBLIC_API_MOCKING: env.NEXT_PUBLIC_API_MOCKING ?? 'disabled',
    },

    // 브라우저의 /backend/* 요청을 API 서버로 넘긴다. /api/*는 Route Handler용으로 남겨 둔다.
    async rewrites() {
      const backend = [{ source: '/backend/:path*', destination: `${env.API_BASE_URL}/:path*` }];
      const own: Rewrites = rewrites ? await rewrites() : [];

      if (Array.isArray(own)) return [...backend, ...own];

      return { ...own, afterFiles: [...backend, ...(own.afterFiles ?? [])] };
    },
  };
};
