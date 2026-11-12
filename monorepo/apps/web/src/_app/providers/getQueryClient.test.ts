import type * as ReactQuery from '@tanstack/react-query';
import { afterEach, expect, it, vi } from 'vitest';

// isServer는 모듈을 불러올 때 정해지는 상수라서, 값을 바꿔 가며 getQueryClient를 새로 불러온다.
const loadGetQueryClient = async (isServer: boolean) => {
  vi.resetModules();
  vi.doMock('@tanstack/react-query', async (importOriginal) => ({
    ...(await importOriginal<typeof ReactQuery>()),
    isServer,
  }));

  const { getQueryClient } = await import('./getQueryClient');

  return getQueryClient;
};

afterEach(() => {
  vi.doUnmock('@tanstack/react-query');
});

it('getQueryClient가 서버에서는 새 인스턴스, 브라우저에서는 같은 인스턴스를 준다', async () => {
  const getServerQueryClient = await loadGetQueryClient(true);
  const getBrowserQueryClient = await loadGetQueryClient(false);

  expect(getServerQueryClient()).not.toBe(getServerQueryClient());
  expect(getBrowserQueryClient()).toBe(getBrowserQueryClient());
});

it('getQueryClient가 만든 클라이언트의 staleTime은 60초다', async () => {
  const getQueryClient = await loadGetQueryClient(false);

  expect(getQueryClient().getDefaultOptions().queries?.staleTime).toBe(60 * 1000);
});
