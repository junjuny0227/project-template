import { afterEach, expect, it } from 'vitest';

import { startServer } from './node';

let server: ReturnType<typeof startServer> | undefined;

afterEach(() => {
  server?.close();
});

it('서버 baseURL로 나가는 요청에 handler가 응답한다', async () => {
  server = startServer('http://api.test');

  const response = await fetch('http://api.test/health');

  expect(await response.json()).toEqual({ status: 'mocked' });
});

it('baseURL 끝에 /가 있어도 같은 주소의 요청에 응답한다', async () => {
  server = startServer('http://api.test/');

  const response = await fetch('http://api.test/health');

  expect(await response.json()).toEqual({ status: 'mocked' });
});
