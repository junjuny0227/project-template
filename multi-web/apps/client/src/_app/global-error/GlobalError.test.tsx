import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';

import { GlobalError } from './GlobalError';

it('독립 문서에 안전한 오류 화면과 digest를 렌더하고 재시도한다', () => {
  const retry = vi.fn();
  const error = Object.assign(new Error('비공개 레이아웃 정보'), { digest: 'global-123' });
  render(<GlobalError error={error} retry={retry} />, { container: document });

  expect(document.documentElement).toHaveAttribute('lang', 'ko');
  expect(document.body).toContainElement(screen.getByRole('main'));
  expect(
    screen.getByRole('heading', { level: 1, name: '문제가 발생했습니다' }),
  ).toBeInTheDocument();
  expect(screen.getByText('오류 코드: global-123')).toBeInTheDocument();
  expect(screen.queryByText(error.message)).not.toBeInTheDocument();
  expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
  fireEvent.click(screen.getByRole('button', { name: '다시 시도' }));
  expect(retry).toHaveBeenCalledTimes(1);
});
