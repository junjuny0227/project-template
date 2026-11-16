import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';

import { NotFoundPage } from './NotFoundPage';

it('찾을 수 없는 페이지 안내와 홈 링크를 렌더한다', () => {
  render(<NotFoundPage />);

  expect(
    screen.getByRole('heading', { level: 1, name: '페이지를 찾을 수 없습니다' }),
  ).toBeInTheDocument();
  expect(screen.getByText('404')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: '홈으로 이동' })).toHaveAttribute('href', '/');
});
