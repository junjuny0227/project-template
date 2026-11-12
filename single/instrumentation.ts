import { env } from '@/shared/config';

// 서버가 뜰 때 한 번 실행된다. 모킹을 켰으면 서버(RSC)가 보내는 요청도 handler가 받도록 MSW node server를 시작한다.
export const register = async () => {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.NEXT_PUBLIC_API_MOCKING === 'enabled') {
    const { startServer } = await import('@/shared/api/mocks/node');

    // 서버 요청의 baseURL(shared/api/server.ts)과 같은 값을 넘긴다.
    startServer(env.API_BASE_URL);
  }
};
