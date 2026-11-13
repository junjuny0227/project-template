import axios, { type AxiosAdapter } from 'axios';
import { expect, expectTypeOf, it, vi } from 'vitest';

import { createApiMethods } from './createApiMethods';

interface User {
  id: number;
  name: string;
}

interface CreateUserRequest {
  name: string;
}

it('createApiMethods가 .data를 반환하고 body 타입이 추론된다', async () => {
  const adapter = vi.fn<AxiosAdapter>((config) =>
    Promise.resolve({
      data: { id: 1, name: 'kim' },
      status: 200,
      statusText: 'OK',
      headers: {},
      config,
    }),
  );
  const api = createApiMethods(axios.create({ adapter }));

  const user = await api.post<User, CreateUserRequest>('/users', { name: 'kim' });

  expect(user).toEqual({ id: 1, name: 'kim' });
  expect(adapter.mock.calls[0][0]).toMatchObject({
    method: 'post',
    url: '/users',
    data: JSON.stringify({ name: 'kim' }),
  });

  // 아래 타입 단언은 실행 중에는 아무 일도 하지 않는다. 어긋나면 `pnpm check-types`가 실패한다.
  expectTypeOf(user).toEqualTypeOf<User>();
  expectTypeOf(api.get<User[]>).returns.resolves.toEqualTypeOf<User[]>();
  expectTypeOf(api.post).parameter(1).not.toBeAny();
  expectTypeOf(api.post<User, CreateUserRequest>)
    .parameter(1)
    .toEqualTypeOf<CreateUserRequest | undefined>();
  expectTypeOf(api.patch<User, CreateUserRequest>)
    .parameter(1)
    .toEqualTypeOf<CreateUserRequest | undefined>();
  expectTypeOf(api.put<User, CreateUserRequest>)
    .parameter(1)
    .toEqualTypeOf<CreateUserRequest | undefined>();
});
