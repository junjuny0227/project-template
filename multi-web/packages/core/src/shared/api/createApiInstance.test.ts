import { expect, it } from 'vitest';

import { createApiInstance } from './createApiInstance';

it('createApiInstance가 앱의 baseURL을 쓰고 인스턴스를 분리한다', () => {
  const client = createApiInstance('/backend');
  const admin = createApiInstance('https://admin.example.com');

  expect(client.defaults.baseURL).toBe('/backend');
  expect(admin.defaults.baseURL).toBe('https://admin.example.com');
  expect(client.defaults.timeout).toBe(10000);
  expect(client).not.toBe(admin);
});
