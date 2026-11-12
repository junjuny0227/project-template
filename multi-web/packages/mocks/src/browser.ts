import { setupWorker } from 'msw/browser';

import { createHandlers } from './handlers';

let started: Promise<unknown> | undefined;

// 개발 모드의 StrictMode는 effect를 두 번 실행한다. 여러 번 불러도 worker는 하나만 시작한다.
// handler가 없는 요청은 그대로 통과시킨다.
export const startWorker = (baseUrl: string) => {
  started ??= setupWorker(...createHandlers(baseUrl)).start({ onUnhandledFrame: 'bypass' });

  return started;
};
