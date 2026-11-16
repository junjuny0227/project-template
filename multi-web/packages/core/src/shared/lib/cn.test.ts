import { expect, it } from 'vitest';

import { cn } from './cn';

it('cn이 충돌하는 클래스를 병합한다', () => {
  expect(cn('px-2 py-1', false, { 'px-4': true }, ['text-sm', 'text-lg'])).toBe(
    'py-1 px-4 text-lg',
  );
});
