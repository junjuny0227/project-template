import { setupServer } from 'msw/node';

import { createHandlers } from './handlers';

// handler가 없는 요청은 그대로 통과시킨다.
export const startServer = (baseUrl: string) => {
  const server = setupServer(...createHandlers(baseUrl));

  server.listen({ onUnhandledFrame: 'bypass' });

  return server;
};
