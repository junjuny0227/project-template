import { isServer, QueryClient } from '@tanstack/react-query';

const makeQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  });

let browserQueryClient: QueryClient | undefined;

// 서버는 요청끼리 캐시가 섞이지 않도록 매번 새로 만들고, 브라우저는 하나를 계속 쓴다.
export const getQueryClient = () => {
  if (isServer) {
    return makeQueryClient();
  }

  browserQueryClient ??= makeQueryClient();

  return browserQueryClient;
};
