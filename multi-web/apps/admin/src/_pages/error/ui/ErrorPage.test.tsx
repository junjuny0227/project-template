import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { ErrorPage } from './ErrorPage';

it('안전한 오류 안내와 홈 링크를 렌더하고 재시도한다', () => {
  const retry = vi.fn();
  const error = Object.assign(new Error('비공개 서버 정보'), { digest: 'error-123' });
  render(<ErrorPage error={error} retry={retry} />);

  expect(
    screen.getByRole('heading', { level: 1, name: '문제가 발생했습니다' }),
  ).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(screen.getByText('오류 코드: error-123')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(retry).toHaveBeenCalledTimes(1);
});

it.each([new Error('비공개 정보'), null, '문자열 오류', { digest: 123 }])(
  'digest가 없는 오류도 안전하게 렌더한다: %j',
  (error) => {
    render(<ErrorPage error={error} retry={vi.fn()} />);

    expect(screen.getByRole('heading', { name: '문제가 발생했습니다' })).toBeInTheDocument();
    expect(screen.queryByText(/오류 코드:/)).not.toBeInTheDocument();
  },
);
